pragma solidity ^0.4.24;

import "./EIP20Interface.sol";
import "./WrappedEtherInterface.sol";
import "./MoneyMarketAccountInterface.sol";

contract CompoundBorrower {
  uint constant expScale = 10**18;
  address tokenAddress;
  address moneyMarketAddress;
  address creator;
  address owner;
  address wethAddress;

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

  event L(string l);
  event Log(int x);
  event Lo(uint y);
  /* @dev sent from borrow factory, wraps eth and supplies weth, then borrows the token at address supplied in constructor */
  function fund() payable public {
    require(creator == msg.sender);

    WrappedEtherInterface weth = WrappedEtherInterface(wethAddress);
    weth.deposit.value(msg.value)();

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.supply(wethAddress, msg.value);

    borrowAvailableTokens();
  }

  function borrowAvailableTokens() {
    int excessLiquidity = calculateExcessLiquidity();
    if (excessLiquidity > 0) {
      MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
      uint assetPrice = compoundMoneyMarket.assetPrices(tokenAddress);
      /* assetPrice contains expScale, so must be factored out */
      /* by including it in numerator */
      uint targetBorrow = uint(excessLiquidity) * expScale / assetPrice;
      compoundMoneyMarket.borrow(tokenAddress, targetBorrow);

      /* this contract will now hold borrowed tokens, sweep them to owner */
      EIP20Interface borrowedToken = EIP20Interface(tokenAddress);
      uint borrowedTokenBalance = borrowedToken.balanceOf(address(this));
      borrowedToken.transfer(owner, borrowedTokenBalance);
    }
  }


  /* @dev the factory contract will transfer tokens necessary to repay */
  function repay() external {
    require(creator == msg.sender);

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    uint borrowBalance = compoundMoneyMarket.getBorrowBalance(address(this), tokenAddress);
    emit L("about to repay");
    emit Lo(borrowBalance);
    compoundMoneyMarket.repayBorrow(tokenAddress, uint(-1));

    withdrawExcessSupply();
  }

  function withdrawExcessSupply() private returns ( uint ) {
    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    int excessLiquidity = calculateExcessLiquidity();
    if (excessLiquidity > 0) {
      uint amountToWithdraw;
      uint borrowBalance = compoundMoneyMarket.getBorrowBalance(address(this), tokenAddress);
      emit L("withdrawing eth");
      if (borrowBalance == 0) {
        emit L("myeh");
        amountToWithdraw = uint(-1);
      } else {
        emit L("nyoh");
        amountToWithdraw = uint( excessLiquidity );
      }
      emit Lo(borrowBalance);
      emit Lo(amountToWithdraw);

      compoundMoneyMarket.withdraw(wethAddress, amountToWithdraw);

      WrappedEtherInterface weth = WrappedEtherInterface(wethAddress);
      uint wethBalance = weth.balanceOf(address(this));
      weth.withdraw(wethBalance);
      owner.transfer(address(this).balance);
    }
  }

  function calculateExcessLiquidity() private returns ( int ) {
    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    (uint status, uint totalSupply, uint totalBorrow) = compoundMoneyMarket.calculateAccountValues(address(this));
    /* require(status == 0); */
    emit L("total supply");
    emit Log(int(totalSupply));
    int totalPossibleBorrow = int(totalSupply * 4 / 7);
    emit L("total borrow");
    emit Log(int(totalBorrow));
    emit L("total possible borrow");
    emit Log(int(totalPossibleBorrow));
    int liquidity = int( totalPossibleBorrow ) - int( totalBorrow );
    emit L("liquidity");
    emit Log(liquidity);
    return liquidity;
  }

  // need to accept eth for withdrawing weth
  function () public payable {}
}




