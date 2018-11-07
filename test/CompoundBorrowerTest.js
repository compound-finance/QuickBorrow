const MoneyMarket_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
const borrowToken_ = artifacts.require("StandardTokenMock");
const CompoundBorrower_ = artifacts.require("CompoundBorrower");

contract('CompoundBorrower', function([account1, ...accounts]) {
  let mmm;
  let weth;
  let borrowToken;

  beforeEach(async function () {
    mmm = await MoneyMarket_.deployed();
    borrowToken = await  borrowToken_.deployed();
    weth = await weth_.deployed();
  });

  it("supplies all sent ether to moneymarket as weth and borrows max of borrow token", async () => {
    const initialLiquidity = 10000000;
    await borrowToken.setBalance(mmm.address, initialLiquidity);
    let borrower = await CompoundBorrower_.new(account1, borrowToken.address, weth.address, mmm.address);

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

           // liquidatein
           // interest
});
