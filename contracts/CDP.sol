pragma solidity ^0.4.24;

import "./EIP20Interface.sol";
import "./WrappedEtherInterface.sol";
import "./MoneyMarketInterface.sol";

contract CDP {
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

  /* @dev called from borrow factory, wraps eth and supplies weth, then borrows the token at address supplied in constructor */
  function fund() payable external {
    require(creator == msg.sender);

    weth.deposit.value(msg.value)();

    uint supplyStatus = compoundMoneyMarket.supply(weth, msg.value);

    /* --------- borrow the tokens ----------- */
    uint collateralRatio = compoundMoneyMarket.collateralRatio();
    (/* uint status */, uint totalSupply, uint totalBorrow) = compoundMoneyMarket.calculateAccountValues(address(this));

    uint availableBorrow = findAvailableBorrow(totalSupply, totalBorrow, collateralRatio);

    uint assetPrice = compoundMoneyMarket.assetPrices(borrowedToken);
    /* factor exp scale out of asset price by including in numerator */
    uint tokenAmount = availableBorrow * expScale / assetPrice;
    uint borrowStatus = compoundMoneyMarket.borrow(borrowedToken, tokenAmount);

    /* ---------- sweep tokens to user ------------- */
    uint borrowedTokenBalance = borrowedToken.balanceOf(address(this));
    borrowedToken.transfer(owner, borrowedTokenBalance);
  }


  /* @dev the factory contract will transfer tokens necessary to repay */
  function repay() external {
    require(creator == msg.sender);

    compoundMoneyMarket.repayBorrow(borrowedToken, uint(-1));

    /* ---------- withdraw excess collateral weth ------- */
    uint collateralRatio = compoundMoneyMarket.collateralRatio();
    (/* uint status */, uint totalSupply, uint totalBorrow) = compoundMoneyMarket.calculateAccountValues(address(this));

    uint availableWithdrawal = findAvailableWithdrawal(totalSupply, totalBorrow, collateralRatio);

    uint amountToWithdraw;
    if (totalBorrow == 0) {
      amountToWithdraw = uint(-1);
    } else {
      amountToWithdraw = availableWithdrawal;
    }

    uint withdrawStatus = compoundMoneyMarket.withdraw(weth, amountToWithdraw);
    require(withdrawStatus == 0 , "withdrawal failed");

    /* ---------- return ether to user ---------*/
    uint wethBalance = weth.balanceOf(address(this));
    weth.withdraw(wethBalance);
    owner.transfer(address(this).balance);
  }

  function findAvailableBorrow(uint currentSupplyValue, uint currentBorrowValue, uint collateralRatio) public pure returns (uint) {
    uint totalPossibleBorrow =  currentSupplyValue / ( collateralRatio + collateralRatioBuffer );
    // subtract current borrow for max borrow supported by current collateral
    // totalPossibleBorrow was descaled when dividing by collateral ratio, add back in exponential scale
    uint scaledLiquidity = ( totalPossibleBorrow * expScale ) - ( currentBorrowValue ); // this can go negative, so cast to int
    uint liquidity = scaledLiquidity / expScale;
    if ( liquidity > totalPossibleBorrow ) {
      // subtracting current borrow from possible borrow underflowed, account is undercollateralized
      return 0;
    } else {
      return liquidity;
    }
  }

  function findAvailableWithdrawal(uint currentSupplyValue, uint currentBorrowValue, uint collateralRatio) public pure returns (uint) {
    uint requiredCollateralValue = ( currentBorrowValue / expScale ) * ( collateralRatio + collateralRatioBuffer );
    uint scaledAvailableWithdrawal = currentSupplyValue - requiredCollateralValue;
    uint availableWithdrawal = scaledAvailableWithdrawal / expScale;
    if (availableWithdrawal > currentSupplyValue ) {
      // subtracting availableWithdrawal from requiredCollateral underflowed, account is undercollateralized
      return 0;
    } else {
      return availableWithdrawal;
    }
  }

  /* @dev it is necessary to accept eth to unwrap weth */
  function () public payable {}
}
