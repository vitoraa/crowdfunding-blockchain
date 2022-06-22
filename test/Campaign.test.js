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
let manager;

const contribute = (account, amount) => {
    return campaign.methods.contribute().send({
      from: account,
      value: amount
    });
};

const createRequest = (account, amount, description, recipient) => {
    return campaign.methods.createRequest(description, amount, recipient).send({
        from: account,
        gas: '1000000'
    });
}

const approveRequest = (account, requestId) => {
    return campaign.methods.approveRequest(requestId).send({
        from: account,
        gas: '1000000'
    });
}
    
beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    manager = accounts[0];
    factory = await new web3.eth.Contract(compiledFactory.abi)
        .deploy({data: compiledFactory.evm.bytecode.object})
        .send({from: manager, gas: '10000000'});
    
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
        const currentManager = await campaign.methods.manager().call();
        assert.equal(manager, currentManager);
    });

    //test if the minimumContribution is correctly set
    it('requires a minimum amount of ether to enter', async () => {
        await assert.rejects(contribute(manager, '100'));
        await assert.doesNotReject(contribute(manager, '101'));
    });

    //test if after the contribution the quantity of approvers is correctly updated
    it('tracks the contribution', async () => {
        await contribute(accounts[1], '200');
        await contribute(accounts[2], '200');
        const quantity = await campaign.methods.approversCount().call();
        assert.equal(quantity, 2);
    });

    //test if the count of approvers is correctly updated
    it('tracks the approvers', async () => {
        await contribute(accounts[1], '200');
        const isContributor = await campaign.methods.approvers(accounts[1]).call();
        assert(isContributor);
    });

    //test if it is not possible to contribute more the once
    it('limits the amount of contributions', async () => {
        await contribute(accounts[1], '200');
        await assert.rejects(contribute(accounts[1], '200'));
    });

    //test if create request function works
    it('creates a request', async () => {
        await createRequest(manager, '100', 'Buy batteries', accounts[1]);

        const request = await campaign.methods.requests(0).call();
        assert.equal(request.description, 'Buy batteries');
        assert.equal(request.value, '100');
        assert.equal(request.recipient, accounts[1]);
    });

    //test if only the manager can create a request
    it('only manager can create a request', async () => {
        const notAManager = accounts[2];
        await assert.rejects(createRequest(notAManager, '100', 'Buy batteries', accounts[2]));
    });

    //test if approveRequest function works
    it('approves a request', async () => {
        await createRequest(manager, '100', 'Buy batteries', accounts[1]);

        await contribute(accounts[1], '200');

        await approveRequest(accounts[1], 0);

        const request = await campaign.methods.requests(0).call();
        assert.equal(request.approvalCount, 1);
    });

    //test processes requests
    it('processes requests', async () => {
        await createRequest(manager, web3.utils.toWei('2', 'ether'), 'Buy batteries', accounts[1]);

        await contribute(accounts[1], web3.utils.toWei('2', 'ether'));

        await approveRequest(accounts[1], 0);

        let preBalance = await web3.eth.getBalance(accounts[1]);
        preBalance = web3.utils.fromWei(preBalance, 'ether');
        preBalance = parseFloat(preBalance);
        console.log('preBalance of receiver acquired...');
        console.log('preBalance = ', preBalance);

        await campaign.methods.finalizeRequest(0).send({
            from: manager,
            gas: '1000000'
        });

        console.log('request finalized...');
        // check money has been tranferred
        // Note:  ganache initialises accounts with 100 ether each time
        let postBalance = await web3.eth.getBalance(accounts[1]);
        postBalance = web3.utils.fromWei(postBalance, 'ether');
        postBalance = parseFloat(postBalance);
        if(postBalance > preBalance) console.log('request paid...');
        console.log('transaction postBalance = ', postBalance);
        assert(postBalance > preBalance);
    });
})
