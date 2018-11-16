pragma solidity ^0.4.24;

import "./EIP20Interface.sol";
import "./WrappedEtherInterface.sol";
import "./MoneyMarketInterface.sol";

contract CompoundBorrower {
  uint constant expScale = 10**18;
  address tokenAddress;
  address moneyMarketAddress;
  address creator;
  address owner;
  address wethAddress;

  event Log(uint x, string m);
  constructor (address _owner, address _tokenAddress, address _wethAddress, address _moneyMarketAddress) public {
    creator = msg.sender;
    owner = _owner;
    tokenAddress = _tokenAddress;
    wethAddress = _wethAddress;
    moneyMarketAddress = _moneyMarketAddress;

    WrappedEtherInterface weth = WrappedEtherInterface(wethAddress);
    weth.approve(moneyMarketAddress, uint(-1));

    EIP20Interface borrowedToken = EIP20Interface(tokenAddress);
    borrowedToken.approve(moneyMarketAddress, uint(-1));
  }

  /* @dev sent from borrow factory, wraps eth and supplies weth, then borrows the token at address supplied in constructor */
  function fund() payable external {
    require(creator == msg.sender);

    WrappedEtherInterface weth = WrappedEtherInterface(wethAddress);
    weth.deposit.value(msg.value)();

    MoneyMarketInterface compoundMoneyMarket = MoneyMarketInterface(moneyMarketAddress);
    uint supplyStatus = compoundMoneyMarket.supply(wethAddress, msg.value);
    emit Log(supplyStatus, "supply status");

    borrowAvailableTokens();
  }

  function borrowAvailableTokens() private {
    int excessLiquidity = calculateExcessLiquidity();
    if (excessLiquidity > 0) {
      MoneyMarketInterface compoundMoneyMarket = MoneyMarketInterface(moneyMarketAddress);
      uint assetPrice = compoundMoneyMarket.assetPrices(tokenAddress);
      /* assetPrice contains expScale, so must be factored out */
      /* by including it in numerator */
      uint targetBorrow = uint(excessLiquidity) * expScale / assetPrice;
      uint borrowStatus = compoundMoneyMarket.borrow(tokenAddress, targetBorrow);
      emit Log(borrowStatus, "borrow status");

      /* this contract will now hold borrowed tokens, sweep them to owner */
      EIP20Interface borrowedToken = EIP20Interface(tokenAddress);
      uint borrowedTokenBalance = borrowedToken.balanceOf(address(this));
      borrowedToken.transfer(owner, borrowedTokenBalance);
    }
  }


  /* @dev the factory contract will transfer tokens necessary to repay */
  function repay() external {
    require(creator == msg.sender);

    MoneyMarketInterface compoundMoneyMarket = MoneyMarketInterface(moneyMarketAddress);
    compoundMoneyMarket.repayBorrow(tokenAddress, uint(-1));

    withdrawExcessSupply();
  }

  function withdrawExcessSupply() private {
    uint amountToWithdraw;
    int excessLiquidity = calculateExcessLiquidity();
    if (excessLiquidity > 0) {
      MoneyMarketInterface compoundMoneyMarket = MoneyMarketInterface(moneyMarketAddress);
      uint borrowBalance = compoundMoneyMarket.getBorrowBalance(address(this), tokenAddress);
      if (borrowBalance == 0) {
        amountToWithdraw = uint(-1);
      } else {
        amountToWithdraw = uint( excessLiquidity );
      }

      uint withdrawStatus = compoundMoneyMarket.withdraw(wethAddress, amountToWithdraw);
      emit Log(withdrawStatus, "withdrawStatus");

      WrappedEtherInterface weth = WrappedEtherInterface(wethAddress);
      uint wethBalance = weth.balanceOf(address(this));
      weth.withdraw(wethBalance);
      owner.transfer(address(this).balance);
    }
  }

  function calculateExcessLiquidity() private view returns ( int ) {
    MoneyMarketInterface compoundMoneyMarket = MoneyMarketInterface(moneyMarketAddress);
    uint collateralRatio = compoundMoneyMarket.collateralRatio();
    (/* uint status */, uint totalSupply, uint totalBorrow) = compoundMoneyMarket.calculateAccountValues(address(this));

    // for adding an additional 25% buffer to supply so that user is not immediately close to liquidation
    uint collateralRatioBuffer = 25 * 10 ** 16;
    uint totalPossibleBorrow = ( totalSupply * 10 **18 ) / ( collateralRatio + collateralRatioBuffer );
    int liquidity = int( totalPossibleBorrow ) - int( totalBorrow ); // this can go negative, so cast to int
    return liquidity;
  }

  // need to accept eth for withdrawing weth
  function () public payable {}
}




