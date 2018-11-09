pragma solidity ^0.4.24;
import "../Tokens/WrappedEther.sol";

contract WETHMock is WrappedEther {
  function setBalance(address _address, uint amount) public {
    balances[_address] = amount;
  }
}
