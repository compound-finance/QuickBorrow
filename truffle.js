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
module.exports = {
  networks: {
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
  }
};

