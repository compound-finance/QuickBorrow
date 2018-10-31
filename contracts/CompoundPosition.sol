pragma solidity ^0.4.24;

import "./EIP20Interface.sol";
import "./MoneyMarketAccountInterface.sol";

contract CompoundBorrower {
  address borrowedTokenAddress;
  address wethAddress;
  address creator;
  address moneyMarketAddress;
  address holder;
  MoneyMarketAccountInterface compoundMoneyMarket;

  constructor (address positionHolder, address tokenToBorrow) public {
    creator = msg.sender;
    holder = positionHolder;
    borrowedTokenAddress = 0x1;
    wethAddress = 0x0;
    compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
  }

  // turn all received ether into weth and fund it to compound
  function () payable public {
    EIP20Interface weth = EIP20Interface(wethAddress);
    // weth.deposit or something to wrap
    uint wethBalance = weth.balanceOf(address(this));
    weth.approve(moneyMarketAddress, -1);
    compoundMoneyMarket.supply(wethAddress, wethBalance);
  }

  function borrow(uint requestedAmount) public {
    require(creator == msg.sender);

    compoundMoneyMarket.borrow(borrowedTokenAddress, requestedAmount);

    // this contract will now hold borrowed tokens, sweep them to holder
    giveTokensToHolder();
  }

  // this contract must receive the tokens to repay before this function will succeed
  function repay() public {
    require(creator == msg.sender);

    compoundMoneyMarket.repayBorrow(borrowedTokenAddress, -1);
    compoundMoneyMarket.withdraw(wethAddress, -1);

    giveTokensToHolder();
    /* selfDestructIfEmpty(); and send to holder*/
  }

  function giveTokensToHolder() private {
    EIP20Interface weth = EIP20Interface(wethAddress);
    uint wethBalance = weth.balanceOf(address(this));
    weth.transfer(holder, wethBalance);

    EIP20Interface borrowedToken = EIP20Interface(borrowedTokenAddress);
    uint borrowedTokenBalance = borrowedToken.balanceOf(address(this));
    borrowedToken.transfer(holder, borrowedTokenBalance);
  }
}
