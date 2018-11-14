const MoneyMarket_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
const borrowToken_ = artifacts.require("StandardTokenMock");
const TokenBorrowerFactory = artifacts.require("TokenBorrowerFactory");


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
      console.log(ethBalanceBeforeRepay);
      console.log(ethBalanceAfterRepay);
      console.log(ethBalanceBeforeRepay.minus(ethBalanceAfterRepay), "difff of balances");

      assert.equal(ethBalanceAfterRepay.toString(), ethBalanceBeforeRepay.minus(totalGasCost).toString(), "has eth back");
    });

    it("can repay part of loan, receiving collateral back", async () => {
      let theAccount = accounts[3];
      await web3.eth.sendTransaction({to: factory.address, from: theAccount, value: oneEth, gas: 8000000});
      await token.setBalance(theAccount, startingBalance);

      let borrower = await factory.borrowers.call(theAccount);
      let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
      let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);

      await token.approve(factory.address, 100, {from: theAccount});
      await factory.repay({from: theAccount});

      let finalBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
      let finalSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
      let finalAccountBalance = await token.balanceOf.call(theAccount);

      assert.equal(finalSupplyBalance.toString(), ogSupplyBalance.toString(), "some collateral is withdrawn");
      assert.equal(finalBorrowBalance.toString(), ogBorrowBalance.minus(100).toString(), "paid off 100");
      assert.equal(finalAccountBalance.toString(), startingBalance.minus(100).toString(), "a few tokens are left");
    });


  });

  async function ethSpentOnGas(receipt) {
    const gasUsed = receipt.receipt.gasUsed;
    const tx = await web3.eth.getTransaction(receipt.tx);

    return gasUsed * tx.gasPrice;
  }
});
