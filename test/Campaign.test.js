const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider({ gasLimit: 10000000 }));

const compiledCampaign = require('../ethereum/build/Campaign.json');
const compiledFactory = require('../ethereum/build/CampaignFactory.json');

let accounts;
let factory;
let campaignAddress;
let campaign;
    
beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    factory = await new web3.eth.Contract(compiledFactory.abi)
        .deploy({data: compiledFactory.evm.bytecode.object})
        .send({from: accounts[0], gas: '10000000'});
    
    await factory.methods.createCampaign('100').send({
        from: accounts[0],
        gas: '10000000'
    });

    [campaignAddress] = await factory.methods.getDeployedCampaigns().call();
    campaign = await new web3.eth.Contract(compiledCampaign.abi, campaignAddress);
});

describe('Campaigns', () => {
    it('deploys a factory and a campaign', () => {
        assert.ok(factory.options.address);
        assert.ok(campaign.options.address);
    });

    //test if getDeployedCampaigns returns the correct number of campaigns
    it('has a getDeployedCampaigns function', async () => {
        const campaigns = await factory.methods.getDeployedCampaigns().call();
        assert.equal(campaigns.length, 1);
        assert.equal(campaigns[0], campaign.options.address);
    });

    //test if the campaign has the correct minimum contribution
    it('has a minimumContribution function', async () => {
        const minimumContribution = await campaign.methods.minimumContribution().call();
        assert.equal(minimumContribution, web3.utils.toWei('100', 'wei'));
    });

    //test if the campaign has the correct manager
    it('has the correct manager', async () => {
        const manager = await campaign.methods.manager().call();
        assert.equal(manager, accounts[0]);
    });
})