
pragma solidity ^0.4.24;

import "./EIP20Interface.sol";
contract WrappedEtherInterface is EIP20Interface {

  function deposit() public payable;

  function withdraw(uint amount) public;
}
