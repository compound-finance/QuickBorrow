const MoneyMarketMock_ = artifacts.require("MoneyMarketMock");
const weth_ = artifacts.require("WETHMock");
const token_ = artifacts.require("StandardTokenMock");
const CDP = artifacts.require("CDP");

contract('CDP', function([root, account1, account2, ...accounts]) {
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
      borrower = await CDP.new(account1, token.address, weth.address, mmm.address);
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
    it("repays borrowed tokens", async () => {
      let borrower = await CDP.new(account2, token.address, weth.address, mmm.address);
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

    it("repays what it can", async () => {
      let borrower = await CDP.new(account2, token.address, weth.address, mmm.address);
      await borrower.fund({value: web3.toWei(0.5), gas: 5000000});

      let startingBorrowBalance = (await mmm.getBorrowBalance.call(borrower.address, token.address));
      let startingSupplyBalance = (await mmm.getSupplyBalance.call(borrower.address, weth.address));

      // give borrower tokens necesary to pay off entire borrow
      await token.setBalance(borrower.address,  startingBorrowBalance.div(2).round().toString());
      await borrower.repay({ gas: 5000000});

      let finalSupplyBalance = (await mmm.getSupplyBalance.call(borrower.address, weth.address)).toString();
      let finalBorrowBalance = (await mmm.getBorrowBalance.call(borrower.address, token.address));

      assert(finalBorrowBalance.times(2).minus(startingBorrowBalance).lte(1), "repay what borrower holds");
      assert.equal(finalSupplyBalance, startingSupplyBalance.div(2).round().toString(), "has withdrawn half supply");
    });

    it("targets 1.75 collateral ratio when funding or repaying", async () => {
      async function checkCollateralRatio(borrower) {
        let [_status, supplyValue, borrowValue] = await mmm.calculateAccountValues.call(borrower.address);
        let ratio = Math.trunc((supplyValue / borrowValue) * 100);
        assert.equal(ratio, 175, "still 1.75");
      }

      let borrower = await CDP.new(account2, token.address, weth.address, mmm.address);
      await borrower.fund({value: oneEth, gas: 5000000});
      await checkCollateralRatio(borrower);

      await token.setBalance(borrower.address, 30 * 10 ** 18);
      await borrower.repay({ gas: 5000000});
      await checkCollateralRatio(borrower);

      await borrower.fund({value: web3.toWei(0.5), gas: 5000000});
      await checkCollateralRatio(borrower);

    });
  });

  describe("findAvailableBorrow/3", async () => {
      [
        [100, 0, 1.75, 50],
        [110, 50, 1.75, 5],
        [110, 10, 1.75, 45],
        [160, 50, 1.75, 30],
        [280, 100, 1.5, 60],
      ].forEach(async ([supplyValue, borrowValue, collateralRatio, availableBorrow]) => {
        // note the cdp will add .25 to colateral ratio
        it("tells value of token that can be borrowed to reach target collateral ratio", async () => {
          let borrower = await CDP.new(account2, token.address, weth.address, mmm.address);
          let scaledSupplyValue = supplyValue * 10 **36;
          let scaledBorrowValue = borrowValue * 10 **36;
          let scaledCollateralRatio = collateralRatio * 10 **18;
          let scaledAvailableBorrow = availableBorrow * 10 **18;

          assert.closeTo(( await borrower
                       .findAvailableBorrow
                       .call(
                         scaledSupplyValue,
                         scaledBorrowValue,
                         scaledCollateralRatio) )
                       .toNumber(),
                       scaledAvailableBorrow,
                       10 ** 9,
                       "calculates what can be borrowed to reach collateral ratio ( with .25 buffer)");
        });
      });

      [
        [100, 50, 1.75, 0],
        [160, 200, 1.5, 0],
        [0, 100, 1.5, 0],
      ].forEach(async ([supplyValue, borrowValue, collateralRatio, availableBorrow]) => {
        it("returns 0 if no excess supply", async () => {
          let borrower = await CDP.new(account2, token.address, weth.address, mmm.address);
          let scaledSupplyValue = supplyValue * 10 **36;
          let scaledBorrowValue = borrowValue * 10 **36;
          let scaledCollateralRatio = collateralRatio * 10 **18;
          let scaledAvailableBorrow = availableBorrow * 10 **18;

          assert.equal(( await borrower
                       .findAvailableBorrow
                       .call(
                         scaledSupplyValue,
                         scaledBorrowValue,
                         scaledCollateralRatio) )
                       .toNumber(),
                       0,
                       "returns 0 if no exccess supply");
        });
      });
  });

  describe("findAvailableWithdrawal/3", async () => {
      [
        [100, 0, 1.75, 100],
        [110, 50, 1.75, 10],
        [110, 10, 1.75, 90],
        [160, 50, 1.75, 60],
        [200, 100, 1.5, 25],
      ].forEach(async ([supplyValue, borrowValue, collateralRatio, availableWithdrawal]) => {
        it("tells value of supply that can be withdrawn to reach target collateral ratio", async () => {
          let borrower = await CDP.new(account2, token.address, weth.address, mmm.address);
          let scaledSupplyValue = supplyValue * 10 **36;
          let scaledBorrowValue = borrowValue * 10 **36;
          let scaledCollateralRatio = collateralRatio * 10 **18;
          let scaledAvailableWithdrawal = availableWithdrawal * 10 **18;

          assert.closeTo(( await borrower
                       .findAvailableWithdrawal
                       .call(
                         scaledSupplyValue,
                         scaledBorrowValue,
                         scaledCollateralRatio) )
                       .toNumber(),
                       scaledAvailableWithdrawal,
                       10 ** 9,
                       "calculates what can be withdrawn to reach collateral ratio ( with .25 buffer)");
        });

      });

      [
        [100, 50, 1.75, 0],
        [160, 200, 1.5, 0],
        [0, 100, 1.5, 0],
      ].forEach(async ([supplyValue, borrowValue, collateralRatio, availableWithdrawal]) => {
        it("returns 0 if no excess supply", async () => {
          let borrower = await CDP.new(account2, token.address, weth.address, mmm.address);
          let scaledSupplyValue = supplyValue * 10 **36;
          let scaledBorrowValue = borrowValue * 10 **36;
          let scaledCollateralRatio = collateralRatio * 10 **18;
          let scaledAvailableWithdrawal = availableWithdrawal * 10 **18;

          assert.equal(( await borrower
                       .findAvailableWithdrawal
                       .call(
                         scaledSupplyValue,
                         scaledBorrowValue,
                         scaledCollateralRatio) )
                       .toNumber(),
                       0,
                       "returns 0 if no exccess supply");
        });
      });
  });
});
