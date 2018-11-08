pragma solidity ^0.4.24;

import "../../contracts/MoneyMarketAccountInterface.sol";
import "../../contracts/EIP20Interface.sol";

contract MoneyMarketMock is MoneyMarketAccountInterface {
  mapping(address => mapping(address => uint)) public supplyBalances;
  mapping(address => mapping(address => uint)) public borrowBalances;

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
    EIP20Interface token = EIP20Interface(asset);
    uint supplyBalance = supplyBalances[msg.sender][asset];

    uint withdrawAmount;
    if (amount == uint(-1)) {
      withdrawAmount = min(token.balanceOf(msg.sender), supplyBalance);
    } else {
      withdrawAmount = supplyBalance;
    }

    supplyBalances[msg.sender][asset] -= withdrawAmount;
    token.transfer(msg.sender, withdrawAmount);
    return 0;
  }

  function repayBorrow(address asset, uint amount) public returns (uint) {
    EIP20Interface token = EIP20Interface(asset);
    uint borrowBalance = borrowBalances[msg.sender][asset];

    uint repayAmount;
    if (amount == uint(-1)) {
      repayAmount = min(token.balanceOf(msg.sender), borrowBalance);
    } else {
      repayAmount = amount;
    }

    borrowBalances[msg.sender][asset] -= repayAmount;
    token.transferFrom(msg.sender, address(this), repayAmount);
    return 0;
  }
  // second wave

  function getSupplyBalance(address account, address asset)  public returns (uint) {
    return supplyBalances[account][asset];
  }

  function getBorrowBalance(address account, address asset)  public returns (uint) {
    return borrowBalances[account][asset];
  }

  // third wave

  function assetPrices(address /* asset */) public view returns (uint) {
    return 1444312499999999;
  }

  uint public collateralRatio = 1500000000000000000;


  function min(uint a, uint b) pure internal returns (uint) {
    if (a < b) {
      return a;
    } else {
      return b;
    }
  }
}
