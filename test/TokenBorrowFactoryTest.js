const MoneyMarket_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
const borrowToken_ = artifacts.require("StandardTokenMock");
const TokenBorrowerFactory = artifacts.require("TokenBorrowerFactory");
const BigNumber = require("bignumber.js");


contract('TokenBorrowerFactory', function([account1, ...accounts]) {
  let mmm;
  let weth;
  let token;
  let factory;
  let oneEth;

  const initialLiquidity = 10000 * 10**18;
  let amountBorrowed = 395640535845651000000; // what ends up being borrowed based on borrow token price
  const startingBalance = 5000 * 10**18; // for setting starting token balance

  beforeEach(async () => {
    mmm = await MoneyMarket_.deployed();
    token = await borrowToken_.deployed();
    weth = await weth_.deployed();
    factory = await TokenBorrowerFactory.new(weth.address, token.address, mmm.address);

    await mmm._addToken(weth.address, 1 * 10**18);
    await mmm._addToken(token.address, 1444312499999999);

    await token.setBalance(mmm.address, initialLiquidity);
    await token.setBalance(account1, 0);

    oneEth = web3.toWei(1, "ether");
  });

  describe("minOfThree/3", async () => {
    [
      [1,2,3],
      [5,2,9],
      [88,10343,398]
    ].forEach(([ a, b, c ]) => {
      it("finds least of three values", async () =>{
        let calculatedValue = await factory.minOfThree.call(a, b, c);
        assert.equal(calculatedValue, Math.min(a,b,c), "finds same thing as javascript");
      });
    });
  });

  describe("fallback/0", () => {
    let borrower;
    let startingSupplyBalance;
    let startingBorrowBalance;

    beforeEach(async () => {
      await web3.eth.sendTransaction({to: factory.address, from: account1, value: oneEth, gas: 8000000});

      borrower = await factory.borrowers.call(account1);
      startingSupplyBalance = (await mmm.getSupplyBalance.call(borrower, weth.address)).toString();
      startingBorrowBalance = (await mmm.getBorrowBalance.call(borrower, token.address)).toString();
    });

    it("deploys a borrower when sent ether", async () => {
      assert.equal(startingSupplyBalance, oneEth, "all sent ether gets supplied to money market as weth");
      assert.equal(startingBorrowBalance, amountBorrowed, "borrows a token");
    });

    it("sends ether to existing borrower address if one exists", async () => {
      await web3.eth.sendTransaction({to: factory.address, from: account1, value: oneEth, gas: 8000000});

      let finalSupplyBalance = (await mmm.getSupplyBalance.call(borrower, weth.address)).toString();
      let finalBorrowBalance = (await mmm.getBorrowBalance.call(borrower, token.address)).toString();

      assert.equal(finalSupplyBalance, startingSupplyBalance * 2, "ether sent to existing borrower is added to supply");
      assert.equal(finalBorrowBalance, amountBorrowed * 2, "borrows more tokens as collateral ratio reaches 1.75");
    });
  });

  describe("repay/0", () => {
    it("can repay entire loan", async () => {
      let account = accounts[4];
      await web3.eth.sendTransaction({to: factory.address, from: account, value: oneEth, gas: 8000000});
      await token.setBalance(account, startingBalance);
      await token.approve(factory.address, -1, {from: account});

      let borrower = await factory.borrowers.call(account);
      let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
      let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
      let ethBalanceBeforeRepay = await web3.eth.getBalance(account);

      let receipt = await factory.repay({from: account});
      let totalGasCost = await ethSpentOnGas(receipt);

      assert.equal((await token.balanceOf.call(account)).toNumber(), (startingBalance - amountBorrowed), "a few tokens are left after repaying max");
      let ethBalanceAfterRepay = await web3.eth.getBalance(account);

      // receive one eth after repaying
      assert.equal(ethBalanceAfterRepay.minus(oneEth).toString(), ethBalanceBeforeRepay.minus(totalGasCost).toString(), "has eth back");
    });

    it("can repay part of loan, receiving collateral back", async () => {
      let theAccount = accounts[3];
      await web3.eth.sendTransaction({to: factory.address, from: theAccount, value: oneEth, gas: 8000000});

      let borrower = await factory.borrowers.call(theAccount);
      let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
      let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
      let startingAccountBalance = await token.balanceOf.call(theAccount);

      let repayAmount = new BigNumber( amountBorrowed ).div( 2 );
      await token.approve(factory.address, repayAmount.toString(), {from: theAccount});
      await factory.repay({from: theAccount});

      let finalBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
      let finalSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
      let finalAccountBalance = await token.balanceOf.call(theAccount);

      assert.equal(startingAccountBalance.minus(repayAmount).toString(), finalAccountBalance.toString(), "some tokens have been taken");
      assert.equal(finalBorrowBalance.toString(), ogBorrowBalance.minus(repayAmount).toString(), "paid off half");
    });
  });

  describe("reading balances", () => {
    it( "calls money market balance functions with msg.sender" , async () => {
      let theAccount = accounts[4];
      await web3.eth.sendTransaction({to: factory.address, from: theAccount, value: oneEth, gas: 8000000});

      let borrower = await factory.borrowers.call(theAccount);
      let mmSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
      let mmBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);

      let factorySupplyBalance = await factory.getSupplyBalance.call({from: theAccount});
      let factoryBorrowBalance = await factory.getBorrowBalance.call({from: theAccount});

      assert.equal(mmSupplyBalance, factorySupplyBalance, "reads same value as money market");
      assert.equal(mmBorrowBalance, factoryBorrowBalance, "reads same value as money market");
    });
  });

  async function ethSpentOnGas(receipt) {
    const gasUsed = receipt.receipt.gasUsed;
    const tx = await web3.eth.getTransaction(receipt.tx);

    return gasUsed * tx.gasPrice;
  }
});
