
module.exports = function(deployer, network) {
  if (network == "rinkeby") {
    const tokenBorrowerFactory = artifacts.require("TokenBorrowerFactory");
    let moneyMarketAddress;
    let BATAddress;
    let wethAddress;
    wethAddress = "0xc778417e063141139fce010982780140aa0cd5ab";
    BATAddress = "0xbf7bbeef6c56e53f79de37ee9ef5b111335bd2ab";
    moneyMarketAddress = "0x61bbd7bd5ee2a202d7e62519750170a52a8dfd45";

    deployer.deploy(tokenBorrowerFactory, wethAddress, BATAddress, moneyMarketAddress);
  }
};
