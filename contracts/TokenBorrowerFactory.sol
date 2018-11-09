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
    CompoundBorrower borrower;
    address borrowerAddress;

    if (borrowers[msg.sender] == address(0x0)) {
      // if new position, fund and borrow
      borrower = (new CompoundBorrower(msg.sender, TokenAddress, WETHAddress, MoneyMarketAddress));
      borrowerAddress = address(borrower);

      borrowers[msg.sender] = borrowerAddress;
      /* // the borrower contract will borrows tokens forward */
      /* // them to the original sender */
      borrowerAddress.call.value(msg.value)();
    } else {
      // if position already exists, add funds to improve collateral ratio
      borrowerAddress = borrowers[msg.sender];
      borrowerAddress.call.value(msg.value)();
    }
  }

  // position holder must send tokens to position contract
  // or approve transfer via another interface
  // send uint(-1) to repay everything
  function repayBorrow(uint amountToRepay) public {
    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(MoneyMarketAddress);
    address borrowerAddress = borrowers[msg.sender];
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

  function findBorrowContract(address borrower) public returns ( address ) {
    return borrowers[borrower];
  }
}
