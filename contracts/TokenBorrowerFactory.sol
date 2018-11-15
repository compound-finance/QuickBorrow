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

  // create new position and borrow immediately,
  // or fund an existing position to prevent liquidation.
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

  // user must approve this contract to transfer tokens before repaying
  // send uint(-1) to repay everything
  function repayBorrow(uint amountToRepay) public {
    address borrowerAddress = borrowers[msg.sender];
    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(MoneyMarketAddress);
    CompoundBorrower borrower = CompoundBorrower(borrowerAddress);

    uint transferAmount;
    if (amountToRepay == uint(-1)) {
      transferAmount = compoundMoneyMarket.getBorrowBalance(borrowerAddress, TokenAddress);
    } else {
      transferAmount = amountToRepay;
    }

    EIP20Interface token = EIP20Interface(TokenAddress);
    token.transferFrom(msg.sender, borrowerAddress, transferAmount);

    borrower.repay(amountToRepay);

    uint remainingBorrow = compoundMoneyMarket.getBorrowBalance(borrowerAddress, TokenAddress);
    if ( remainingBorrow == uint(0) ) {
      borrower.sayGoodbye();
      delete borrowers[msg.sender]; // free to borrow again
    }
  }
}
