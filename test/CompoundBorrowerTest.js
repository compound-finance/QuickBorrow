
const MoneyMarket_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WrappedEther");
const borrowToken_ = artifacts.require("StandardTokenMock");
const CompoundBorrower_ = artifacts.require("CompoundBorrower");

// gas: 0xfffffffffff,
// gasPrice: 0x01,
let mmm;
let weth;
let borrowToken;
let compoundBorrower;

contract('CompoundBorrower', function([account1, ...accounts]) {

  beforeEach(async function () {
    // mmm = await  MoneyMarket_.new(opts);
    mmm = await MoneyMarket_.deployed();
    borrowToken = await  borrowToken_.deployed();
    weth = await  weth_.deployed();
    // mmm = await  MoneyMarket_.new();
    // borrowToken = await  borrowToken_.new(opts);
  });

  it("supplies all sent ether to moneymarket as weth", async () => {
    assert.equal(await mmm.yo.call(), "eggs" , "suckkaaa");

    let borrower = await CompoundBorrower_.new(account1, borrowToken.address, weth.address, mmm.address);
    assert.equal(await borrower.yo.call(), "bacon" , "suckkaaa");



  });

           // liquidatein
           // interest
});
