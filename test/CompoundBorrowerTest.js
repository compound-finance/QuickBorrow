const MoneyMarket_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
const token_ = artifacts.require("StandardTokenMock");
const CompoundBorrower_ = artifacts.require("CompoundBorrower");

contract('CompoundBorrower', function([root, account1, ...accounts]) {
  let mmm;
  let weth;
  let token;
  let borrower;
  let oneEth = web3.toWei(1, "ether");
  let amountBorrowed = 210 * 10**18; // what ends up being borrowed based on borrow token price

  const initialLiquidity = 10000 * 10**18;

  beforeEach(async function () {
    mmm = await MoneyMarket_.deployed();
    token = await token_.deployed();
    weth = await weth_.deployed();
    borrower = await CompoundBorrower_.new(account1, token.address, weth.address, mmm.address);

    await token.setBalance(mmm.address, initialLiquidity);
    await token.setBalance(borrower.address, 0);
    await token.setBalance(account1, 0);

    // root stands in for borrow factory in this context
    await web3.eth.sendTransaction({to: borrower.address, from: root, value: oneEth, gas: 5000000});
  });

  it("supplies all sent ether to moneymarket as weth and borrows max of borrow token", async () => {
    var supplyBalance = await mmm.getSupplyBalance.call(borrower.address, weth.address);
    assert.equal(supplyBalance.toNumber(), oneEth, "all sent ether gets supplied to money market as weth");

    var borrowBalance = await mmm.getBorrowBalance.call(borrower.address, token.address);

    assert.equal(borrowBalance.toNumber(), amountBorrowed, "borrows some tokens");
    assert.equal(await token.balanceOf.call(mmm.address), initialLiquidity - amountBorrowed, "money market contract now has 20 less tokens than starting");
    assert.equal(await token.balanceOf.call(account1), amountBorrowed, "original account now holds borrowed tokens");
  });

  it("adds funds but does not borrow if it holds a borrow balance", async () => {
    let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower.address, weth.address);
    let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower.address, token.address);
    let ogMarketTokenBalance =  await token.balanceOf.call(mmm.address);
    let ogBorrowerTokenBalance = await token.balanceOf.call(borrower.address);

    await web3.eth.sendTransaction({to: borrower.address, from: root, value: oneEth, gas: 5000000});

    let newSupplyBalance = await mmm.getSupplyBalance.call(borrower.address, weth.address);
    let newBorrowBalance = await mmm.getBorrowBalance.call(borrower.address, token.address);
    let newMarketTokenBalance =  await token.balanceOf.call(mmm.address);
    let newBorrowerTokenBalance = await token.balanceOf.call(borrower.address);

    assert.notEqual(newSupplyBalance.toNumber(), ogSupplyBalance.toNumber(), "supplies more tokens");
    assert.equal(newBorrowBalance.toNumber(), ogBorrowBalance.toNumber(), "doesnt receive more tokens");
    assert.equal(newMarketTokenBalance.toNumber(), ogMarketTokenBalance.toNumber(), "market holds same tokens as before");
    assert.equal(newBorrowerTokenBalance.toNumber(), ogBorrowerTokenBalance.toNumber(), "doesnt borrow more tokens");

    assert.equal(newSupplyBalance.toNumber(), oneEth * 2, "supply balance is increased");
  });

  it("repays borrowed tokens", async () => {
    const startingBalance = 5000 * 10**18;
    await token.setBalance(account1, startingBalance);

    assert.equal((await token.balanceOf.call(mmm.address)).toNumber(), initialLiquidity - amountBorrowed, "money market has lent some tokens");

    // sent tokens to quick borrow contract form owner before repaying
    await token.transfer(borrower.address, startingBalance, {from: account1});
    assert.notEqual(await token.balanceOf.call(borrower.address), 0, "empty borrower contract");
    await borrower.repay(-1, {from: root, gas: 5000000});

    assert.equal(await token.balanceOf.call(borrower.address), 0, "empty borrower contract");
    assert.equal(await token.balanceOf.call(account1), startingBalance - amountBorrowed, "owner receives balance not needed to pay money market");
    assert.equal(await token.balanceOf.call(mmm.address), initialLiquidity, "money market has its tokens back");
    assert.equal(await weth.balanceOf.call(account1), oneEth, "gets original weth back");
  });

  it("returns held tokens and eth to owner when saying goodbye", async () => {
    // cant check returning the ether since all payments get converted to weth ? any way to give a balance to this contract without triggering fallback?

    let departingBorrower = await CompoundBorrower_.new(root, token.address, weth.address, mmm.address);

    await token.setBalance(departingBorrower.address, 5000);
    await weth.setBalance(departingBorrower.address, 5000);

    await token.setBalance(root, 0);
    await weth.setBalance(root, 0);

    await departingBorrower.sayGoodbye();

    assert.equal(await weth.balanceOf.call(root), 5000, "has balance from borrower");
    assert.equal(await token.balanceOf.call(root), 5000, "has balance from borrower");
  });
});
