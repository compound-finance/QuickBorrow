const MoneyMarket_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
const borrowToken_ = artifacts.require("StandardTokenMock");
const CompoundBorrower_ = artifacts.require("CompoundBorrower");

contract('CompoundBorrower', function([account1, ...accounts]) {
  let mmm;
  let weth;
  let borrowToken;
  let borrower;

  const initialLiquidity = 10000000;

  beforeEach(async function () {
    mmm = await MoneyMarket_.deployed();
    borrowToken = await borrowToken_.deployed();
    weth = await weth_.deployed();
    borrower = await CompoundBorrower_.new(account1, borrowToken.address, weth.address, mmm.address);

    await borrowToken.setBalance(mmm.address, initialLiquidity);
    await borrowToken.setBalance(borrower.address, 0);
    await borrowToken.setBalance(account1, 0);
  });

  it("supplies all sent ether to moneymarket as weth and borrows max of borrow token", async () => {

    let ethSent = web3.toWei(10, "ether");
    await web3.eth.sendTransaction({to: borrower.address, from: account1, value: ethSent, gas: 5000000});

    var supplyBalance = await mmm.getSupplyBalance.call(borrower.address, weth.address);
    assert.equal(supplyBalance.toNumber(), ethSent, "all sent ether gets supplied to money market as weth");

    const maxBorrow = 4615;
    var borrowBalance = await mmm.getBorrowBalance.call(borrower.address, borrowToken.address);

    assert.equal(borrowBalance.toNumber(), maxBorrow, "borrows some tokens");
    assert.equal(await borrowToken.balanceOf.call(mmm.address), initialLiquidity - maxBorrow, "money market contract now has 20 less tokens than starting");
    assert.equal(await borrowToken.balanceOf.call(account1), maxBorrow, "original account now holds borrowed tokens");
  });

  it("adds funds but does not borrow if it holds a borrow balance", async () => {
    let ethSent = web3.toWei(10, "ether");
    await web3.eth.sendTransaction({to: borrower.address, from: account1, value: ethSent, gas: 5000000});

    let ogSupplyBalance = await mmm.getSupplyBalance.call(borrower.address, weth.address);
    assert.equal(ogSupplyBalance.toNumber(), ethSent, "all sent ether gets supplied to money market as weth");

    let ogBorrowBalance = await mmm.getBorrowBalance.call(borrower.address, borrowToken.address);
    let ogMarketTokenBalance =  await borrowToken.balanceOf.call(mmm.address);
    let ogBorrowerTokenBalance = await borrowToken.balanceOf.call(borrower.address);

    await web3.eth.sendTransaction({to: borrower.address, from: account1, value: ethSent, gas: 5000000});

    let newBorrowBalance = await mmm.getBorrowBalance.call(borrower.address, borrowToken.address);
    let newMarketTokenBalance =  await borrowToken.balanceOf.call(mmm.address);
    let newBorrowerTokenBalance = await borrowToken.balanceOf.call(borrower.address);

    // send more ether, but dont expect to make more borrows
    assert.equal(newBorrowBalance.toNumber(), ogBorrowBalance.toNumber(), "doesnt receive more tokens");
    assert.equal(newBorrowerTokenBalance.toNumber(), ogBorrowerTokenBalance.toNumber(), "doesnt borrow more tokens");
    assert.equal(newMarketTokenBalance.toNumber(), ogMarketTokenBalance.toNumber(), "market holds same tokens as before");

    let finalSupplyBalance = await mmm.getSupplyBalance.call(borrower.address, weth.address);
    assert.equal(finalSupplyBalance.toNumber(), ethSent * 2, "supply balance is increased");
  })

  it("repays borrowed tokens", async () => {
    let ethSent = web3.toWei(10, "ether");
    let amountBorrowed = 4615; // what ends up being borrowed based on borrow token price
    await web3.eth.sendTransaction({to: borrower.address, from: account1, value: ethSent, gas: 5000000});
    await borrowToken.setBalance(account1, 5000);

    assert.equal(await borrowToken.balanceOf.call(mmm.address), initialLiquidity - amountBorrowed, "money market has lent some tokens");

    // sent tokens to quick borrow contract form owner before repaying
    await borrowToken.transfer(borrower.address, 5000, {from: account1});
    await borrower.repay({from: account1, gas: 5000000});

    assert.equal(await borrowToken.balanceOf.call(borrower.address), 0, "empty borrower contract");
    assert.equal(await borrowToken.balanceOf.call(account1), 5000 - amountBorrowed, "owner receives balance not needed to pay money market");
    assert.equal(await borrowToken.balanceOf.call(mmm.address), initialLiquidity, "money market has its tokens back");
  });

           // liquidatein
           // interest
});
