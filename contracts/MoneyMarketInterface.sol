pragma solidity ^0.4.24;

contract MoneyMarketInterface {
  uint public collateralRatio;
  address[] public collateralMarkets;

  function borrow(address asset, uint amount) public returns (uint);

  function supply(address asset, uint amount) public returns (uint);

  function withdraw(address asset, uint requestedAmount) public returns (uint);

  function repayBorrow(address asset, uint amount) public returns (uint);

  function getSupplyBalance(address account, address asset) view public returns (uint);

  function getBorrowBalance(address account, address asset) view public returns (uint);

  function assetPrices(address asset) view public returns (uint);

  function calculateAccountValues(address account) view public returns (uint, uint, uint);
}
