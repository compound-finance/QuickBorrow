pragma solidity ^0.4.24;

import "./EIP20Interface.sol";
import "./WrappedEtherInterface.sol";
import "./MoneyMarketInterface.sol";
import "./SafeMath.sol";

contract CDP {
  using SafeMath for uint;
  uint constant expScale = 10**18;
  uint constant collateralRatioBuffer = 25 * 10 ** 16;
  address creator;
  address owner;
  WrappedEtherInterface weth;
  MoneyMarketInterface compoundMoneyMarket;
  EIP20Interface borrowedToken;

  event Log(uint x, string m);
  event Log(int x, string m);

  constructor (address _owner, address tokenAddress, address wethAddress, address moneyMarketAddress) public {
    creator = msg.sender;
    owner = _owner;
    borrowedToken = EIP20Interface(tokenAddress);
    compoundMoneyMarket = MoneyMarketInterface(moneyMarketAddress);
    weth = WrappedEtherInterface(wethAddress);

    weth.approve(moneyMarketAddress, uint(-1));
    borrowedToken.approve(compoundMoneyMarket, uint(-1));
  }

  /*
    @dev called from borrow factory, wraps eth and supplies weth, then borrows
     the token at address supplied in constructor
  */
  function fund() payable external {
    require(creator == msg.sender);

    weth.deposit.value(msg.value)();

    uint supplyStatus = compoundMoneyMarket.supply(weth, msg.value);
    require(supplyStatus == 0, "supply failed");

    /* --------- borrow the tokens ----------- */
    uint collateralRatio = compoundMoneyMarket.collateralRatio();
    (uint status , uint totalSupply, uint totalBorrow) = compoundMoneyMarket.calculateAccountValues(address(this));
    require(status == 0, "calculating account values failed");

    uint availableBorrow = findAvailableBorrow(totalSupply, totalBorrow, collateralRatio);

    uint assetPrice = compoundMoneyMarket.assetPrices(borrowedToken);
    /*
      available borrow & asset price are both scaled 10e18, so include extra
      scale in numerator dividing asset to keep it there
    */
    uint tokenAmount = availableBorrow.mul(expScale).div(assetPrice);
    uint borrowStatus = compoundMoneyMarket.borrow(borrowedToken, tokenAmount);
    require(borrowStatus == 0, "borrow failed");

    /* ---------- sweep tokens to user ------------- */
    uint borrowedTokenBalance = borrowedToken.balanceOf(address(this));
    borrowedToken.transfer(owner, borrowedTokenBalance);
  }


  /* @dev the factory contract will transfer tokens necessary to repay */
  function repay() external {
    require(creator == msg.sender);

    uint repayStatus = compoundMoneyMarket.repayBorrow(borrowedToken, uint(-1));
    require(repayStatus == 0, "repay failed");

    /* ---------- withdraw excess collateral weth ------- */
    uint collateralRatio = compoundMoneyMarket.collateralRatio();
    (uint status , uint totalSupply, uint totalBorrow) = compoundMoneyMarket.calculateAccountValues(address(this));
    require(status == 0, "calculating account values failed");

    uint amountToWithdraw;
    if (totalBorrow == 0) {
      amountToWithdraw = uint(-1);
    } else {
      amountToWithdraw = findAvailableWithdrawal(totalSupply, totalBorrow, collateralRatio);
    }

    uint withdrawStatus = compoundMoneyMarket.withdraw(weth, amountToWithdraw);
    require(withdrawStatus == 0 , "withdrawal failed");

    /* ---------- return ether to user ---------*/
    uint wethBalance = weth.balanceOf(address(this));
    weth.withdraw(wethBalance);
    owner.transfer(address(this).balance);
  }

  /* @dev returns borrow value in eth scaled to 10e18 */
  function findAvailableBorrow(uint currentSupplyValue, uint currentBorrowValue, uint collateralRatio) public pure returns (uint) {
    uint totalPossibleBorrow = currentSupplyValue.mul(expScale).div(collateralRatio.add(collateralRatioBuffer));
    if ( totalPossibleBorrow > currentBorrowValue ) {
      return totalPossibleBorrow.sub(currentBorrowValue).div(expScale);
    } else {
      return 0;
    }
  }

  /* @dev returns available withdrawal in eth scale to 10e18 */
  function findAvailableWithdrawal(uint currentSupplyValue, uint currentBorrowValue, uint collateralRatio) public pure returns (uint) {
    uint requiredCollateralValue = currentBorrowValue.mul(collateralRatio.add(collateralRatioBuffer)).div(expScale);
    if ( currentSupplyValue > requiredCollateralValue ) {
      return currentSupplyValue.sub(requiredCollateralValue).div(expScale);
    } else {
      return 0;
    }
  }

  /* @dev it is necessary to accept eth to unwrap weth */
  function () public payable {}
}
