const MoneyMarket_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
const borrowToken_ = artifacts.require("StandardTokenMock");
const TokenBorrowerFactory = artifacts.require("TokenBorrowerFactory");


contract('TokenBorrowerFactory', function([account1, ...accounts]) {
  let mmm;
  let weth;
  let token;
  let factory;

  const initialLiquidity = 10000000;

  beforeEach(async function () {
    mmm = await MoneyMarket_.deployed();
    token = await borrowToken_.deployed();
    weth = await weth_.deployed();
    factory = await TokenBorrowerFactory.new(weth.address, token.address, mmm.address);

    await token.setBalance(mmm.address, initialLiquidity);
    await token.setBalance(account1, 0);
  });

  it("deploys a borrower when sent ether", async () => {

    let ethSent = web3.toWei(10, "ether");
    await web3.eth.sendTransaction({to: factory.address, from: account1, value: ethSent, gas: 8000000000000});

    let borrower = await factory.borrowers.call(account1);
    var supplyBalance = await mmm.getSupplyBalance.call(borrower, weth.address);
    assert.equal(supplyBalance.toNumber(), ethSent, "all sent ether gets supplied to money market as weth");

    var borrowBalance = await mmm.getBorrowBalance.call(borrower, token.address);
    assert.equal(borrowBalance.toNumber(), 4615, "borrows a token");
  });

});
