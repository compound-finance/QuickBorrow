# QuickBorrow

[Rinkeby Deployment](https://rinkeby.etherscan.io/address/0xac4871e9dd3bd267ef28e54c36e379bc86393f60)

This is a sample implementation of how to interact with the Compound Money Market from within the EVM.
There are two main smart contracts: TokenBorrowerFactory.sol and CDP.sol

#### [TokenBorrowerFactory.sol](contracts/TokenBorrowerFactory.sol)
The TokenBorrowerFactory is configured by it's constructor, which takes 3 arguments. [deployment example]( migrations/3_bat_borrow_factory.js)

constructor(address weth, address _token, address moneyMarket)
- Address of the wrapped ether contract used by Compound\
    Mainnet: https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2   
    Rinkeby: https://rinkeby.etherscan.io/address/0xc778417e063141139fce010982780140aa0cd5ab

- Address of token to be borrowed. Again, this will be the address of a token listed by Compound\
    Mainnet: Any erc 20 token listed by Compound  
    Rinkeby: Any ( Rinkeby ) erc 20 token listed by ( Rinkeby ) Compound  

- Address of the Compound Money Market\
    Main Net: https://etherscan.io/address/0x3fda67f7583380e67ef93072294a7fac882fd7e7  
    Rinkeby: https://rinkeby.etherscan.io/address/0x61bbd7bd5ee2a202d7e62519750170a52a8dfd45

fallback()
- looks up or creates new cdp for msg.sender
- forwards ether to cdp and calls "fund" ( This is where the magic happens ).

repay()
- looks up cdp for msg.sender
- transfers tokens to cdp ( previously allowed by msg.sender interacting with token contract )
- calls cdp.repay()

     
#### [CDP.sol](contracts/CDP.sol)
constructor(address _owner, address tokenAddress, address wethAddress, address moneyMarketAddress)
 - owner: who to send any borrowed tokens or withdrawn ether to
 - tokenAddress: address of token to borrow from compound
 - wethAddress: where to wrap and unwrap ether
 - moneyMarketAddress: where to find Compound
 - also approves transfers of weth and configured token

fund()
- wraps any ether sent
- deposits it as weth
- supplies that weth to Compound Money Market
- borrows configured token
- sends borrowed tokens back to the user

repay()
- repays borrowed tokens
- withdraws any excess collateral
- sends withdrawn eth back to user

All of these operations will maintain a supply value / borrow value ratio which is equal to the required collateralRatio set in the Compound Money Market + 25%.

#### [MoneyMarketInterface.sol](contracts/MoneyMarketInterface.sol)
Contains function signatures of the Compound Money Market that are needed to implement QuickBorrow. 
Not a full specification of the Compound Money Market interface.
         
### Test environment Mocks
[example test environment deployment](migrations/2_test_mocks.js)
#### [MoneyMarketMock.sol](test/Mocks/MoneyMarketMock.sol)
Contains trivial implementations of the Compound Money Market Functions, as well as some cheat mode admin functions to 
facilitate setting up unit tests.
#### [StandardTokenMock.sol](test/Mocks/StandardTokenMock.sol)
basic erc 20 token with some admin functions to set up unit tests
#### [WETHMock.sol](test/Mocks/WETHMock.sol)
wrapped ether implementation with some admin functions to set up unit tests
