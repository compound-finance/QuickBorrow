pragma solidity ^0.4.24;

import "./MoneyMarketInterface.sol";
import "./CompoundBorrower.sol";
import "./EIP20Interface.sol";

contract TokenBorrowerFactory {
  address WETHAddress;
  MoneyMarketInterface compoundMoneyMarket;
  EIP20Interface token;

  mapping(address => CompoundBorrower) public borrowers;

  constructor(address weth, address _token, address moneyMarket) public {
    WETHAddress = weth;
    token = EIP20Interface(_token);
    compoundMoneyMarket = MoneyMarketInterface(moneyMarket);
  }

  /* @notice will deploy a new borrower contract or add funds to an existing one. The caller will receive the proceeds of the executed borrow, with a supply 25% higher than required collateral ratio ( supply / borrow ) being targeted. If the additional funds do not put the user in excess of this collateral ratio, no borrow will be executed and no tokens will be received. */
  function() payable public {
    CompoundBorrower borrower;
    if (borrowers[msg.sender] == address(0x0)) {
      // create borrower contract if none exists
       borrower = new CompoundBorrower(msg.sender, token, WETHAddress, compoundMoneyMarket);
       borrowers[msg.sender] = borrower;
    } else {
      borrower = borrowers[msg.sender];
    }

    borrower.fund.value(msg.value)();
  }

  /* @notice User must approve this contract to transfer the erc 20 token being borrowed. Calling this function will repay entire borrow if allowance exceeds what is owed, othewise will repay the allowance. The caller will receive any excess ether if they are overcollateralized after repaying the borrow.*/
  function repay() public {
    CompoundBorrower borrower = borrowers[msg.sender];
    uint borrowBalance = compoundMoneyMarket.getBorrowBalance(borrower, token);
    uint allowance = token.allowance(msg.sender, address(this));
    uint userTokenBalance = token.balanceOf(msg.sender);
    uint transferAmount = minOfThree(allowance, borrowBalance, userTokenBalance);

    token.transferFrom(msg.sender, borrower, transferAmount);
    borrower.repay();
  }

  function minOfThree(uint a, uint b, uint c) public pure returns ( uint ) {
    if (a >= b) {
      if (b >= c) {
        return c;
      } else {
        return b;
      }
    } else {
      if (a >= c) {
        return c;
      } else {
        return a;
      }
    }
  }

  /* function getBorrowBalance() public view returns (uint) { */
  /*   return compoundMoneyMarket.getBorrowBalance(borrowers[msg.sender], token); */
  /* } */

  /* function getSupplyBalance() public view returns (uint) { */
  /*   return compoundMoneyMarket.getSupplyBalance(borrowers[msg.sender], WETHAddress); */
  /* } */
}
