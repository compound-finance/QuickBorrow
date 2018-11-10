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
  const amountBorrowed = 210 * 10**18; // what ends up being borrowed based on borrow token price
  const startingBalance = 5000 * 10**18; // for setting starting token balance

  beforeEach(async function () {
    mmm = await MoneyMarket_.deployed();
    token = await borrowToken_.deployed();
    weth = await weth_.deployed();
    factory = await TokenBorrowerFactory.new(weth.address, token.address, mmm.address);

    await token.setBalance(mmm.address, initialLiquidity);
    await token.setBalance(account1, 0);

    oneEth = web3.toWei(1, "ether");
    await web3.eth.sendTransaction({to: factory.address, from: account1, value: oneEth, gas: 8000000});
  });

  it("deploys a borrower when sent ether", async () => {
    let borrower = await factory.borrowers.call(account1);
    let supplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    assert.equal(supplyBalance.toNumber(), oneEth, "all sent ether gets supplied to money market as weth");

    let borrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
    assert.equal(borrowBalance.toNumber(), amountBorrowed, "borrows a token");
  });

  it("sends ether to existing borrower address if one exists", async () => {
    let borrower = await factory.borrowers.call(account1);
    let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);

    await web3.eth.sendTransaction({to: factory.address, from: account1, value: oneEth, gas: 8000000});

    let finalSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    assert.equal(finalSupplyBalance.toNumber(), ogSupplyBalance.toNumber() * 2, "ether sent to existing borrower is added to supply");

    let finalBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
    assert.equal(finalBorrowBalance.toNumber(), ogBorrowBalance.toNumber(), "does not borrow more tokens");
  });

  it("can repay entire loan", async () => {
    await token.setBalance(account1, startingBalance);
    await token.approve(factory.address, -1, {from: account1});

    assert.equal(await token.balanceOf.call(account1), startingBalance, "ready to pay back my debts");

    let borrower = await factory.borrowers.call(account1);
    let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);

    let startingEthBalance = await web3.eth.getBalance(account1);
    let receipt = await factory.repayBorrow(-1, {from: account1});
    let totalGasCost = await ethSpentOnGas(receipt);

    assert.equal((await token.balanceOf.call(account1)).toNumber(), startingBalance - amountBorrowed, "a few tokens are left after repaying max");
    let finalEthBalance = await web3.eth.getBalance(account1);
    assert.equal(finalEthBalance.toNumber(), startingEthBalance.toNumber() - totalGasCost + (+oneEth), "has eth back");
  });

  it("can repay part of loan", async () => {
    let account2 = accounts[3];
    await web3.eth.sendTransaction({to: factory.address, from: account2, value: oneEth, gas: 8000000});
    await token.setBalance(account2, startingBalance);

    let borrower = await factory.borrowers.call(account2);
    let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);

    await token.approve(factory.address, -1, {from: account2});
    await factory.repayBorrow(100, {from: account2});

    let finalBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
    let finalAccountBalance = await token.balanceOf.call(account2);

    assert.equal(finalBorrowBalance.toNumber(), ogBorrowBalance.toNumber() - 100, "paid off 100");
    assert.equal(finalAccountBalance.toNumber(), startingBalance - 100, "a few tokens are left");
  });


  async function ethSpentOnGas(receipt) {
    const gasUsed = receipt.receipt.gasUsed;
    const tx = await web3.eth.getTransaction(receipt.tx);

    return gasUsed * tx.gasPrice;
  }
});
