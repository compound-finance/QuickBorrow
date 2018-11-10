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

  event Log(uint x);
  // turn all received ether into weth and fund it to compound
  function fund() payable public {
    emit Log(0);
    require(creator == msg.sender);
    emit Log(1);

    WrappedEtherInterface weth = WrappedEtherInterface(wethAddress);
    weth.deposit.value(msg.value)();

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.supply(wethAddress, msg.value);

    // if no borrow yet, borrow a safe amount of tokens
    // otherwise, we are only adding collateral to have healthy ratio
    if (compoundMoneyMarket.getBorrowBalance(address(this), tokenAddress) == 0) {
      emit Log(2);
      emit Log(weth.balanceOf(address(this)));
      uint assetPrice = compoundMoneyMarket.assetPrices(tokenAddress);
      int accountLiquidity = compoundMoneyMarket.getAccountLiquidity(address(this));
      uint collateralRatio = compoundMoneyMarket.collateralRatio();

      require(accountLiquidity > 0);

      // x ETH / y ( TKN / ETH ) = x/y TKN
      int maxBorrow = (accountLiquidity * int( expScale )) / int(assetPrice * collateralRatio);
      // borrowing everything would put user almost immediately at risk, only take 90% of what is possible
      uint maxBorrowWithBuffer = uint(maxBorrow * 9 / 10);

      compoundMoneyMarket.borrow(tokenAddress, (maxBorrowWithBuffer * expScale));

      /* this contract will now hold borrowed tokens, sweep them to owner */
      EIP20Interface borrowedToken = EIP20Interface(tokenAddress);
      uint borrowedTokenBalance = borrowedToken.balanceOf(address(this));
      borrowedToken.transfer(owner, borrowedTokenBalance);
    }
  }

  // this contract must receive the tokens to repay before this function will succeed
  // TokenBorrowerFactory will transfer the tokens needed
  function repay(uint amountToRepay) external {
    require(creator == msg.sender);

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.repayBorrow(tokenAddress, amountToRepay);
  }


  // withdraw any weth, send any tokens to owner, selfdestruct any eth to owner
  function sayGoodbye() external {
    require(creator == msg.sender);

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.withdraw(wethAddress, uint(-1));

    WrappedEtherInterface weth = WrappedEtherInterface(wethAddress);
    uint wethBalance = weth.balanceOf(address(this));
    weth.withdraw(wethBalance);

    selfdestruct(owner);
  }

  // need to accept eth for withdrawing weth
  function () public payable {}
}
