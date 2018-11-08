pragma solidity ^0.4.24;
import "../Tokens/StandardToken.sol";

contract StandardTokenMock is StandardToken {
  function setBalance(address _address, uint amount) public {
    balances[_address] = amount;
  }
}
