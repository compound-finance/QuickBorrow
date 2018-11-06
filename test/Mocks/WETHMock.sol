pragma solidity ^0.4.24;
import "../Tokens/WrappedEther.sol";

contract WETHMock is WrappedEther {
  event Hoo(string hoo);
  function yeet() public returns (string) {
    emit Hoo("hhhhooooo");
    return "yeeee";
  }

  function setBalance(address _address, uint amount) public {
    balances[_address] = amount;
  }
}
