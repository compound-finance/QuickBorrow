pragma solidity ^0.4.24;

import "./EIP20Interface.sol";
import "./WrappedEtherInterface.sol";
import "./MoneyMarketAccountInterface.sol";

contract CompoundBorrower {
  address borrowedTokenAddress;
  address moneyMarketAddress;
  address creator;
  address owner;
  address wethAddress;

  constructor (address owner_, address tokenToBorrow_, address wethAddress_, address moneyMarketAddress_) public {
    creator = msg.sender;
    owner = owner_;
    borrowedTokenAddress = tokenToBorrow_;
    wethAddress = wethAddress_;
    moneyMarketAddress = moneyMarketAddress_;
  }

  event Please(string comone);
  event How(uint val);

  function yo() public returns ( string ) {
    emit Please("please");
    return "bacon";
  }

  // turn all received ether into weth and fund it to compound
  function () payable public {
    emit Please("thanks");
    emit How(msg.value);
    emit How(address(this).balance);
    WrappedEtherInterface weth = WrappedEtherInterface(wethAddress);
    weth.approve(moneyMarketAddress, uint(-1));
    weth.deposit.value(msg.value)();

    uint wethBalance = weth.balanceOf(address(this));
    emit How(wethBalance);

    emit Please("approved");

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    emit Please("interface created");
    compoundMoneyMarket.yo();
    emit Please("yooo");
    compoundMoneyMarket.supply(wethAddress, 10);
  }

  function borrow(uint requestedAmount) public {
    require(creator == msg.sender);

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.borrow(borrowedTokenAddress, requestedAmount);

    // this contract will now hold borrowed tokens, sweep them to owner
    giveTokensToOwner();
  }

  // this contract must receive the tokens to repay before this function will succeed
  function repay() public {
    require(creator == msg.sender);

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.repayBorrow(borrowedTokenAddress, uint(1));
    compoundMoneyMarket.withdraw(wethAddress, uint(-1));

    giveTokensToOwner();
    /* selfDestructIfEmpty(); and send to Owner*/
  }

  function giveTokensToOwner() private {
    EIP20Interface weth = EIP20Interface(wethAddress);
    uint wethBalance = weth.balanceOf(address(this));
    weth.transfer(owner, wethBalance);

    EIP20Interface borrowedToken = EIP20Interface(borrowedTokenAddress);
    uint borrowedTokenBalance = borrowedToken.balanceOf(address(this));
    borrowedToken.transfer(owner, borrowedTokenBalance);
  }
}
