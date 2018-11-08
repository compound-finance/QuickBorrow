pragma solidity ^0.4.24;

import "./StandardToken.sol";

/**
  * @title The Compound Wrapped Ether Test Token
  * @author Compound
  * @notice A simple test token to wrap ether
  */
contract WrappedEther is StandardToken {
  string public name;
  string public symbol;
  uint8 public decimals;

  event Bah(uint bah);

  /**
    * @dev Send ether to get tokens
    */
  function deposit() public payable {
    emit Bah(msg.value);
    balances[msg.sender] += msg.value;
    totalSupply_ += msg.value;
    emit Transfer(address(this), msg.sender, msg.value);
  }

  /**
    * @dev Withdraw tokens as ether
    */
  function withdraw(uint amount) public {
      require(balances[msg.sender] >= amount);
      balances[msg.sender] -= amount;
      totalSupply_ -= amount;
      msg.sender.transfer(amount);
      emit Transfer(msg.sender, address(this), amount);
  }
}
