var BorrowFactory = artifacts.require("./BorrowFactory.sol");

module.exports = function(deployer) {
  deployer.deploy(BorrowFactory);
};
