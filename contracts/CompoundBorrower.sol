pragma solidity ^0.4.24;

import "./EIP20Interface.sol";
import "./WrappedEtherInterface.sol";
import "./MoneyMarketAccountInterface.sol";
import "./Exponential.sol";

contract CompoundBorrower is Exponential {
  address borrowedTokenAddress;
  address moneyMarketAddress;
  address creator;
  address owner;
  address wethAddress;

  constructor (address owner_, address tokenToBorrow_, address wethAddress_, address moneyMarketAddress_) public {
    creator = msg.sender;
    owner = owner_;
    borrowedTokenAddress = tokenToBorrow_;
    wethAddress = wethAddress_;
    moneyMarketAddress = moneyMarketAddress_;
  }

  event Please(string comone);
  event How(uint val);

  // turn all received ether into weth and fund it to compound
  function () payable public {
    WrappedEtherInterface weth = WrappedEtherInterface(wethAddress);
    weth.approve(moneyMarketAddress, uint(-1));
    weth.deposit.value(msg.value)();

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.supply(wethAddress, msg.value);

    borrow();
    /*   // this contract will now hold borrowed tokens, sweep them to owner */
    giveTokensToOwner();
  }

  function borrow() private {
    // find value of token in eth from oracle
    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    uint assetPrice = compoundMoneyMarket.assetPrices(borrowedTokenAddress);

    uint collateralRatio = compoundMoneyMarket.collateralRatio();

    (Error err1, Exp memory possibleTokens) = getExp(msg.value, assetPrice);
    (Error err2, Exp memory safeTokens) = getExp(possibleTokens.mantissa, collateralRatio);

    uint amountToBorrow = truncate(safeTokens);
    compoundMoneyMarket.borrow(borrowedTokenAddress, amountToBorrow);
  }

  // this contract must receive the tokens to repay before this function will succeed
  function repay() public {
    require(owner == msg.sender);

    EIP20Interface borrowedToken = EIP20Interface(borrowedTokenAddress);
    borrowedToken.approve(moneyMarketAddress, uint(-1));

    MoneyMarketAccountInterface compoundMoneyMarket = MoneyMarketAccountInterface(moneyMarketAddress);
    compoundMoneyMarket.repayBorrow(borrowedTokenAddress, uint(-1));
    compoundMoneyMarket.withdraw(wethAddress, uint(-1));

    giveTokensToOwner();
    /* selfDestructIfEmpty(); and send to Owner*/
  }

  function giveTokensToOwner() private {
    EIP20Interface weth = EIP20Interface(wethAddress);
    uint wethBalance = weth.balanceOf(address(this));
    weth.transfer(owner, wethBalance);

    EIP20Interface borrowedToken = EIP20Interface(borrowedTokenAddress);
    uint borrowedTokenBalance = borrowedToken.balanceOf(address(this));
    borrowedToken.transfer(owner, borrowedTokenBalance);
  }
}
