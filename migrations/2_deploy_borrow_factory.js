const MoneyMarket = artifacts.require("MoneyMarketMock");
const weth = artifacts.require("WETHMock");
const borrowToken = artifacts.require("StandardTokenMock");

module.exports = function(deployer) {
  deployer.deploy(MoneyMarket);
  deployer.deploy(weth);
  deployer.deploy(borrowToken);
};
