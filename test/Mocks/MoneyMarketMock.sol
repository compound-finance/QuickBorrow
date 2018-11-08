pragma solidity ^0.4.24;

import "../../contracts/MoneyMarketAccountInterface.sol";
import "../../contracts/EIP20Interface.sol";

contract MoneyMarketMock is MoneyMarketAccountInterface {
  mapping(address => mapping(address => uint)) public supplyBalances;
  mapping(address => mapping(address => uint)) public borrowBalances;

  event Ow(uint ow);
  event Me(address eee);

  function yo() public {
    emit Me(address(this));
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
  // second wave

  function getSupplyBalance(address account, address asset)  public returns (uint) {
    emit Ow(supplyBalances[account][asset]);
    return supplyBalances[account][asset];
  }

  function getBorrowBalance(address account, address asset)  public returns (uint) {
    emit Ow(borrowBalances[account][asset]);
    return borrowBalances[account][asset];
  }

  // third wave

  function assetPrices(address asset) public view returns (uint) {
    return 1444312499999999;
  }

  uint public collateralRatio = 1500000000000000000;
}
