pragma solidity ^0.4.24;

contract MoneyMarketAccountInterface {
  function borrow(address asset, uint amount) public returns (uint);

  function supply(address asset, uint amount) public returns (uint);

  function withdraw(address asset, uint requestedAmount) public returns (uint);

  function repayBorrow(address asset, uint amount) public returns (uint);

  function yo() public;
}
