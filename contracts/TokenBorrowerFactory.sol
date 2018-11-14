pragma solidity ^0.4.24;

import "./CompoundBorrower.sol";
import "./EIP20Interface.sol";

contract TokenBorrowerFactory {
  address TokenAddress;
  address WETHAddress;
  address MoneyMarketAddress;

  uint constant startingCollateralRatio = 2;
  mapping(address => address) public borrowers;

  constructor(address weth, address token, address moneyMarket) public {
    WETHAddress = weth;
    TokenAddress = token;
    MoneyMarketAddress = moneyMarket;
  }

  /* @notice will deploy a new borrower contract or add funds to an existing one. The caller will receive the proceeds of the executed borrow, with a collateral ratio of 1.75 supply / borrow being targeted. If the additional funds do not put the user in excess of this collateral ratio, no borrow will be executed and no tokens will be received. */
  function() payable public {
    address borrowerAddress;
    if (borrowers[msg.sender] == address(0x0)) {
      // create borrower contract if none exists
      borrowers[msg.sender] = address(new CompoundBorrower(msg.sender, TokenAddress, WETHAddress, MoneyMarketAddress));
    }

    borrowerAddress = borrowers[msg.sender];
    CompoundBorrower borrower = CompoundBorrower(borrowerAddress);
    borrower.fund.value(msg.value)();
  }

  /* @notice User must approve this contract to transfer the erc 20 token being borrowed. Calling this function will repay entire borrow if allowance exceeds what is owed, othewise will repay the allowance. The caller will receive any excess ether if they are overcollateralized after repaying the borrow.*/
  function repay() public {
    EIP20Interface token = EIP20Interface(TokenAddress);
    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(MoneyMarketAddress);

    address borrowerAddress = borrowers[msg.sender];
    uint borrowBalance = compoundMoneyMarket.getBorrowBalance(borrowerAddress, TokenAddress);
    uint allowance = token.allowance(msg.sender, address(this));

    uint transferAmount;
    if (allowance > borrowBalance) {
      transferAmount = borrowBalance;
    } else {
      transferAmount = allowance;
    }

    token.transferFrom(msg.sender, borrowerAddress, transferAmount);

    CompoundBorrower borrower = CompoundBorrower(borrowerAddress);
    borrower.repay();
  }
}
