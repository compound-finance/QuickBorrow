
module.exports = function(deployer, network) {
  if (network == "development" || network == "test") {
    const MoneyMarket = artifacts.require("MoneyMarketMock");
    const weth = artifacts.require("WETHMock");
    const borrowToken = artifacts.require("StandardTokenMock");

    deployer.deploy(MoneyMarket);
    deployer.deploy(weth);
    deployer.deploy(borrowToken);
  }
};

