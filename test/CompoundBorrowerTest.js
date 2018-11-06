
const MoneyMarket_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
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
    let borrower = await CompoundBorrower_.new(account1, borrowToken.address, weth.address, mmm.address);

    await web3.eth.sendTransaction({to: borrower.address, from: account1, value: web3.toWei(10, "ether"), gas: 5000000});

    var borrowerBalance = await mmm.getSupplyBalance.call(borrower.address, weth.address);
     assert.equal(borrowerBalance.toNumber(), 10, "sending 10 eth results in 10 weth supply balance");
  });

           // liquidatein
           // interest
});
