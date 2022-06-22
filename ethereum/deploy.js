const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');
 
const compiledFactory = require('./build/CampaignFactory.json');

provider = new HDWalletProvider(
    'region range hold discover relief that consider thunder priority explain receive cactus',
    'https://rinkeby.infura.io/v3/7fae2aed999247a8935ebff226d3e03b'
);
 
const web3 = new Web3(provider);
 
const deploy = async () => {
  const accounts = await web3.eth.getAccounts();
 
  console.log('Attempting to deploy from account', accounts[0]);
 
  const result = await new web3.eth.Contract(compiledFactory.abi)
    .deploy({ data: '0x' + compiledFactory.evm.bytecode.object })
    .send({ from: accounts[0] });
 
  console.log('Contract deployed to', result.options.address);
  provider.engine.stop();
};
 
deploy();