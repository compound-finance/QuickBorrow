/*
 * NB: since truffle-hdwallet-provider 0.0.5 you must wrap HDWallet providers in a 
 * function when declaring them. Failure to do so will cause commands to hang. ex:
 * ```
 * mainnet: {
 *     provider: function() { 
 *       return new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/<infura-key>') 
 *     },
 *     network_id: '1',
 *     gas: 4500000,
 *     gasPrice: 10000000000,
 *   },
 */
const rinkebyProvider = function() {
  try {
  const WalletProvider = require("truffle-wallet-provider");
  const Wallet = require('ethereumjs-wallet');
  const fs = require('fs');

  const networksHome = process.env['ETHEREUM_NETWORKS_HOME'];

  // Try to read from file
  const privateKeyHex = fs.readFileSync(networksHome + "/rinkeby", 'UTF8').trim();
  const privateKey = Buffer.from(privateKeyHex, "hex");
  const wallet = Wallet.fromPrivateKey(privateKey);
  const provider = new WalletProvider(wallet, `https://rinkeby.infura.io/`);
  return provider;
  } catch (e) {
    console.log(e)
    console.log("couldnt load rinkeby provider");
  }
};


module.exports = {
  networks: {
    rinkeby: {
      network_id: "4",
      provider: rinkebyProvider()
    },
    ganache: {
      host: "127.0.0.1",
      port: 8545,
      // gas: 0xfffffffffff,
      // gasPrice: 0x01,
      network_id: "*" // matching any id
    },
    test: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 6721975,
      gasPrice: 1
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};

