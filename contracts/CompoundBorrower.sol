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
  }

  // turn all received ether into weth and fund it to compound
  function () payable public {
    require(creator == msg.sender);

    WrappedEtherInterface weth = WrappedEtherInterface(wethAddress);
    weth.approve(moneyMarketAddress, uint(-1));
    weth.deposit.value(msg.value)();

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.supply(wethAddress, msg.value);

    // if no borrow yet, borrow a safe amount of tokens
    // otherwise, hold weth as supply to have healthy collateral ratio
    if (compoundMoneyMarket.getBorrowBalance(address(this), tokenAddress) == 0) {
      // find value of token in eth from oracle
      uint256 assetPrice = compoundMoneyMarket.assetPrices(tokenAddress);

      uint collateralRatio = compoundMoneyMarket.collateralRatio();

      uint amountToBorrow = (msg.value * expScale)/ (assetPrice * collateralRatio);

      compoundMoneyMarket.borrow(tokenAddress, amountToBorrow);
    }
    /*   // this contract will now hold borrowed tokens, sweep them to owner */
    giveTokensToOwner();
  }

  // this contract must receive the tokens to repay before this function will succeed
  // TokenBorrowerFactory will transfer the tokens needed
  function repay(uint amountToRepay) external {
    require(creator == msg.sender);

    EIP20Interface borrowedToken = EIP20Interface(tokenAddress);
    borrowedToken.approve(moneyMarketAddress, amountToRepay);

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.repayBorrow(tokenAddress, amountToRepay);
    compoundMoneyMarket.withdraw(wethAddress, uint(-1));

    giveTokensToOwner();
  }

  // withdraw any weth, send any tokens to owner, selfdestruct any eth to owner
  function sayGoodbye() external {
    require(creator == msg.sender);

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.withdraw(wethAddress, uint(-1));

    giveTokensToOwner();
    selfdestruct(owner);
  }

  // withdraw max weth, send it and any borrowed tokens to owner
  function giveTokensToOwner() private {

    EIP20Interface weth = EIP20Interface(wethAddress);
    uint wethBalance = weth.balanceOf(address(this));
    weth.transfer(owner, wethBalance);

    EIP20Interface borrowedToken = EIP20Interface(tokenAddress);
    uint borrowedTokenBalance = borrowedToken.balanceOf(address(this));
    borrowedToken.transfer(owner, borrowedTokenBalance);
  }
}
