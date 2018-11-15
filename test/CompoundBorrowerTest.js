const MoneyMarketMock_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
const token_ = artifacts.require("StandardTokenMock");
const CompoundBorrower_ = artifacts.require("CompoundBorrower");

contract('CompoundBorrower', function([root, account1, account2, ...accounts]) {
  let mmm;
  let weth;
  let token;
  let borrower;
  let oneEth = web3.toWei(1, "ether");
  let amountBorrowed = 395640535845651000000; // what ends up being borrowed based on borrow token price
  // let amountBorrowed = 1.186921607536953 * 10 **21;

  const initialLiquidity = 10000 * 10**18;

  beforeEach(async function () {
    mmm = await MoneyMarketMock_.deployed();
    token = await token_.deployed();
    weth = await weth_.deployed();
    await mmm._addToken(weth.address, 10**18);
    let tokensPerEth = 1444312499999999;
    await mmm._addToken(token.address, tokensPerEth);

    await token.setBalance(mmm.address, initialLiquidity);
  });

  describe("fund/0", () => {
    let startingSupplyBalance;
    let startingBorrowBalance;
    let startingMarketTokenBalance;
    let borrower;
    beforeEach(async () => {
      borrower = await CompoundBorrower_.new(account1, token.address, weth.address, mmm.address);
      await borrower.fund({value: oneEth, gas: 5000000});

      startingSupplyBalance = (await mmm.getSupplyBalance.call(borrower.address, weth.address)).toString();
      startingBorrowBalance = (await mmm.getBorrowBalance.call(borrower.address, token.address)).toString();
    });

    it("supplies all sent ether to moneymarket as weth and borrows max of borrow token", async () => {
      assert.equal(startingSupplyBalance, oneEth, "all sent ether gets supplied to money market as weth");
      assert.equal(startingBorrowBalance, amountBorrowed, "borrows some tokens");
      assert.equal(await token.balanceOf.call(account1), amountBorrowed, "original account now holds borrowed tokens");
    });

    it("adds funds but does not borrow if it holds a borrow balance", async () => {
      let startingBorrowerTokenBalance = ( await token.balanceOf.call(borrower.address) ).toString();

      await borrower.fund({value: oneEth});

      let newSupplyBalance = ( await mmm.getSupplyBalance.call(borrower.address, weth.address) ).toString();
      let newBorrowBalance = (await mmm.getBorrowBalance.call(borrower.address, token.address)).toString();
      let newBorrowerTokenBalance = (await token.balanceOf.call(borrower.address)).toString();

      assert.equal(newSupplyBalance, oneEth * 2, "supply balance is increased");
      assert.equal(newBorrowBalance, startingBorrowBalance * 2, "receives more tokens");
      assert.equal(newBorrowerTokenBalance, startingBorrowerTokenBalance * 2, "doesnt borrow more tokens");
    });
  });

  describe("repay/1", () => {
    let borrower;
    beforeEach(async () => {
      borrower = await CompoundBorrower_.new(account2, token.address, weth.address, mmm.address);
    });

    it("repays borrowed tokens", async () => {
      await borrower.fund({value: oneEth, gas: 5000000});

      let startingBorrowBalance = (await mmm.getBorrowBalance.call(borrower.address, token.address)).toString();

      // give borrower tokens necesary to pay off entire borrow
      await token.setBalance(borrower.address, startingBorrowBalance.toString());
      await borrower.repay({ gas: 5000000});

      let finalSupplyBalance = (await mmm.getSupplyBalance.call(borrower.address, weth.address)).toString();
      let finalBorrowBalance = (await mmm.getBorrowBalance.call(borrower.address, token.address)).toString();

      assert.equal(finalBorrowBalance, 0, "repayed entire borrow");
      assert.equal(finalSupplyBalance, 0, "has withdrawn all supply");
    });

    it("targets 1.75 collateral ratio when funding or repaying", async () => {
    });
  })
});
