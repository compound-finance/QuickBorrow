pragma solidity ^0.4.24;

import "../../contracts/MoneyMarketInterface.sol";
import "../../contracts/EIP20Interface.sol";

contract MoneyMarketMock is MoneyMarketInterface {
  mapping(address => mapping(address => uint)) public supplyBalances;
  mapping(address => mapping(address => uint)) public borrowBalances;


  mapping(address => uint ) private fakePriceOracle;

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
      withdrawAmount = supplyBalance;
    } else {
      withdrawAmount = min(amount, supplyBalance);
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

  function assetPrices(address asset) public view returns (uint) {
    return fakePriceOracle[asset];
  }

  function calculateAccountValues(address account) public view returns (uint, uint, uint) {
    uint totalBorrowInEth = 0;
    uint totalSupplyInEth = 0;
    for (uint i = 0; i < collateralMarkets.length; i++) {
      address asset = collateralMarkets[i];
      totalBorrowInEth += ( borrowBalances[account][asset] * fakePriceOracle[asset] );
      totalSupplyInEth += ( supplyBalances[account][asset] * fakePriceOracle[asset] );
    }
    return (0, totalSupplyInEth, totalBorrowInEth);
  }

  /* @dev very loose interpretation of some admin and price oracle functionality for helping unit tests, not really in the money market interface */
  address[] public listedTokens;
  function _addToken(address tokenAddress, uint priceInWeth) public {
    for (uint i = 0; i < collateralMarkets.length; i++) {
      if (collateralMarkets[i] == tokenAddress) {
        return;
      }
    }
    collateralMarkets.push(tokenAddress);
    fakePriceOracle[tokenAddress] = priceInWeth;
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
