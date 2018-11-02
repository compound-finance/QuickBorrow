pragma solidity ^0.4.24;

import "./CompoundBorrower.sol";
import "./EIP20Interface.sol";

contract BATBorrowerFactory {
  address constant BATAddress = 0x2;
  address constant wethAddress = 0x1;
  uint constant startingCollateralRatio = 2;
  mapping(address => address) public borrowers;

  constructor() public {}

  // create new position and borrow immediately,
  // or fund an existing position to prevent liquidation.
  function() payable public {
    CompoundBorrower borrower;
    address borrowerAddress;

    if (borrowers[msg.sender] == address(0x0)) {
      // if new position, fund and borrow
      borrower = (new CompoundBorrower(msg.sender, BATAddress, wethAddress, 0x0));
       borrowerAddress = address(borrower);

       borrowers[msg.sender] = borrowerAddress;
       borrowerAddress.transfer(msg.value);
       // borrows tokens and forwards them to the original sender
       borrower.borrow(5);
    } else {
      // if position already exists, add funds to improve collateral ratio
      borrowerAddress = borrowers[msg.sender];
      borrowerAddress.transfer(msg.value);
    }
  }

  // position holder must send tokens to position contract
  // or approve transfer via another interface
  function exitPosition() public {
    CompoundBorrower borrower = CompoundBorrower(borrowers[msg.sender]);

    borrower.repay();

    delete borrowers[msg.sender]; // free to borrow again
  }
}
