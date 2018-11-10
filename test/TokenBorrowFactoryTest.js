const MoneyMarket_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
const borrowToken_ = artifacts.require("StandardTokenMock");
const TokenBorrowerFactory = artifacts.require("TokenBorrowerFactory");


contract('TokenBorrowerFactory', function([account1, ...accounts]) {
  let mmm;
  let weth;
  let token;
  let factory;
  let ethSent;

  const initialLiquidity = 10000 * 10**18;
  const amountBorrowed = 210 * 10**18; // what ends up being borrowed based on borrow token price

  beforeEach(async function () {
    mmm = await MoneyMarket_.deployed();
    token = await borrowToken_.deployed();
    weth = await weth_.deployed();
    factory = await TokenBorrowerFactory.new(weth.address, token.address, mmm.address);

    await token.setBalance(mmm.address, initialLiquidity);
    await token.setBalance(account1, 0);

    ethSent = web3.toWei(1, "ether");
    await web3.eth.sendTransaction({to: factory.address, from: account1, value: ethSent, gas: 8000000000000});
  });

  it("deploys a borrower when sent ether", async () => {
    let borrower = await factory.borrowers.call(account1);
    let supplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    assert.equal(supplyBalance.toNumber(), ethSent, "all sent ether gets supplied to money market as weth");

    let borrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
    assert.equal(borrowBalance.toNumber(), amountBorrowed, "borrows a token");
  });

  it("sends ether to existing borrower address if one exists", async () => {
    let borrower = await factory.borrowers.call(account1);
    let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);

    await web3.eth.sendTransaction({to: factory.address, from: account1, value: ethSent, gas: 8000000000000});

    let finalSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    assert.equal(finalSupplyBalance.toNumber(), ogSupplyBalance.toNumber() * 2, "ether sent to existing borrower is added to supply");

    let finalBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
    assert.equal(finalBorrowBalance.toNumber(), ogBorrowBalance.toNumber(), "does not borrow more tokens");
  });

  it("can repay entire loan", async () => {
    const startingBalance = 5000 * 10**18;
    await token.setBalance(account1, startingBalance);
    assert.equal(await token.balanceOf.call(account1), startingBalance, "ready to pay back my debts");
    assert.equal(await weth.balanceOf.call(account1), 0, "then I get collateral back");

    let borrower = await factory.borrowers.call(account1);
    let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);

    await token.approve(factory.address, -1, {from: account1});
    await factory.repayBorrow(-1, {from: account1});

    assert.equal((await token.balanceOf.call(account1)).toNumber(), startingBalance - amountBorrowed, "a few tokens are left after repaying max");
    assert.equal(( await weth.balanceOf.call(account1) ).toNumber(), ethSent, "got collateral back");
  });

  it("can repay part of loan", async () => {
    const startingBalance = 5000 * 10**18;
    await token.setBalance(account1, startingBalance);

    let borrower = await factory.borrowers.call(account1);
    let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);

    await token.approve(factory.address, -1, {from: account1});
    await factory.repayBorrow(100, {from: account1});

    let finalBorrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
    let finalAccountBalance = await token.balanceOf.call(account1);

    assert.equal(finalBorrowBalance.toNumber(), ogBorrowBalance.toNumber() - 100, "paid off 100");
    assert.equal(finalAccountBalance.toNumber(), startingBalance - 100, "a few tokens are left");
  });


});
