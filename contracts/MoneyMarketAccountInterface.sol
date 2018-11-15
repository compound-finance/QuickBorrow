pragma solidity ^0.4.24;

contract MoneyMarketAccountInterface {
  function borrow(address asset, uint amount) public returns (uint);

  function supply(address asset, uint amount) public returns (uint);

  function withdraw(address asset, uint requestedAmount) public returns (uint);

  function repayBorrow(address asset, uint amount) public returns (uint);

  //second wave
  function getSupplyBalance(address account, address asset)  public returns (uint);

  function getBorrowBalance(address account, address asset)  public returns (uint);

  //third wave
  function assetPrices(address asset) public view returns (uint);

  function getAccountLiquidity(address account) public view returns (int);

  uint public collateralRatio;
}
