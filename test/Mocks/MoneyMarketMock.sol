pragma solidity ^0.4.24;

import "../../contracts/MoneyMarketAccountInterface.sol";
import "../../contracts/EIP20Interface.sol";

contract MoneyMarketMock is MoneyMarketAccountInterface {
  mapping(address => mapping(address => uint)) public supplyBalances;
  mapping(address => mapping(address => uint)) public borrowBalances;

  function yo() returns ( string ) {
    return "eggs";
  }

  function borrow(address asset, uint amount) public returns (uint) {
    borrowBalances[msg.sender][asset] += amount;
    EIP20Interface(asset).transfer(msg.sender, amount);
    return 0;
  }

  function supply(address asset, uint amount) public returns (uint) {
    supplyBalances[msg.sender][asset] += amount;
    EIP20Interface(asset).transferFrom(msg.sender, address(this), amount);
    return 0;
  }

  function withdraw(address asset, uint amount) public returns (uint) {
    supplyBalances[msg.sender][asset] -= amount;
    EIP20Interface(asset).transfer(msg.sender, amount);
    return 0;
  }

  function repayBorrow(address asset, uint amount) public returns (uint) {
    borrowBalances[msg.sender][asset] -= amount;
    EIP20Interface(asset).transferFrom(msg.sender, address(this), amount);
    return 0;
  }
}
