const MoneyMarket_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
const borrowToken_ = artifacts.require("StandardTokenMock");
const CompoundBorrower_ = artifacts.require("CompoundBorrower");

contract('CompoundBorrower', function([root, account1, ...accounts]) {
  let mmm;
  let weth;
  let borrowToken;
  let borrower;
  let tenEth = web3.toWei(10, "ether");

  const initialLiquidity = 10000000;

  beforeEach(async function () {
    mmm = await MoneyMarket_.deployed();
    borrowToken = await borrowToken_.deployed();
    weth = await weth_.deployed();
    borrower = await CompoundBorrower_.new(account1, borrowToken.address, weth.address, mmm.address);

    await borrowToken.setBalance(mmm.address, initialLiquidity);
    await borrowToken.setBalance(borrower.address, 0);
    await borrowToken.setBalance(account1, 0);

    // root stands in for borrow factory in this context
    await web3.eth.sendTransaction({to: borrower.address, from: root, value: tenEth, gas: 5000000});
  });

  it("supplies all sent ether to moneymarket as weth and borrows max of borrow token", async () => {
    var supplyBalance = await mmm.getSupplyBalance.call(borrower.address, weth.address);
    assert.equal(supplyBalance.toNumber(), tenEth, "all sent ether gets supplied to money market as weth");

    // magic number given hard coded mock price for this token
    const maxBorrow = 4615;
    var borrowBalance = await mmm.getBorrowBalance.call(borrower.address, borrowToken.address);

    assert.equal(borrowBalance.toNumber(), maxBorrow, "borrows some tokens");
    assert.equal(await borrowToken.balanceOf.call(mmm.address), initialLiquidity - maxBorrow, "money market contract now has 20 less tokens than starting");
    assert.equal(await borrowToken.balanceOf.call(account1), maxBorrow, "original account now holds borrowed tokens");
  });

  it("adds funds but does not borrow if it holds a borrow balance", async () => {
    let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower.address, weth.address);
    let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower.address, borrowToken.address);
    let ogMarketTokenBalance =  await borrowToken.balanceOf.call(mmm.address);
    let ogBorrowerTokenBalance = await borrowToken.balanceOf.call(borrower.address);

    await web3.eth.sendTransaction({to: borrower.address, from: root, value: tenEth, gas: 5000000});

    let newSupplyBalance = await mmm.getSupplyBalance.call(borrower.address, weth.address);
    let newBorrowBalance = await mmm.getBorrowBalance.call(borrower.address, borrowToken.address);
    let newMarketTokenBalance =  await borrowToken.balanceOf.call(mmm.address);
    let newBorrowerTokenBalance = await borrowToken.balanceOf.call(borrower.address);

    assert.notEqual(newSupplyBalance.toNumber(), ogSupplyBalance.toNumber(), "supplies more tokens");
    assert.equal(newBorrowBalance.toNumber(), ogBorrowBalance.toNumber(), "doesnt receive more tokens");
    assert.equal(newMarketTokenBalance.toNumber(), ogMarketTokenBalance.toNumber(), "market holds same tokens as before");
    assert.equal(newBorrowerTokenBalance.toNumber(), ogBorrowerTokenBalance.toNumber(), "doesnt borrow more tokens");

    assert.equal(newSupplyBalance.toNumber(), tenEth * 2, "supply balance is increased");
  });

  it("repays borrowed tokens", async () => {
    await borrowToken.setBalance(account1, 5000);

    let amountBorrowed = 4615; // what ends up being borrowed based on borrow token price
    assert.equal(await borrowToken.balanceOf.call(mmm.address), initialLiquidity - amountBorrowed, "money market has lent some tokens");

    // sent tokens to quick borrow contract form owner before repaying
    await borrowToken.transfer(borrower.address, 5000, {from: account1});
    assert.notEqual(await borrowToken.balanceOf.call(borrower.address), 0, "empty borrower contract");
    await borrower.repay(-1, {from: root, gas: 5000000});

    assert.equal(await borrowToken.balanceOf.call(borrower.address), 0, "empty borrower contract");
    assert.equal(await borrowToken.balanceOf.call(account1), 5000 - amountBorrowed, "owner receives balance not needed to pay money market");
    assert.equal(await borrowToken.balanceOf.call(mmm.address), initialLiquidity, "money market has its tokens back");
    assert.equal(await weth.balanceOf.call(account1), tenEth, "gets original weth back");
  });

  it("returns held tokens and eth to owner when saying goodbye", async () => {
    // cant check returning the ether since all payments get converted to weth ? any way to give a balance to this contract without triggering fallback?

    let departingBorrower = await CompoundBorrower_.new(root, borrowToken.address, weth.address, mmm.address);

    await borrowToken.setBalance(departingBorrower.address, 5000);
    await weth.setBalance(departingBorrower.address, 5000);

    await borrowToken.setBalance(root, 0);
    await weth.setBalance(root, 0);

    await departingBorrower.sayGoodbye();

    assert.equal(await weth.balanceOf(root), 5000, "has balance from borrower");
    assert.equal(await borrowToken.balanceOf(root), 5000, "has balance from borrower");
  });
});
