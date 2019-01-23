/**
 *
 * Unit test the githubApiClientFactory from module src/githubApiClient.js
 *
 * @copyright 2019 Open Assessment Technologies SA;
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const graphqlRequest = sandbox.stub();
const githubApiClientFactory = proxyquire.noCallThru().load('../../../../src/githubApiClient.js', {
    'graphql-request': {
        GraphQLClient: graphqlRequest,
    },
});

test('should create instance with exposed public methods', (t) => {
    t.plan(2);

    const githubApiClient = githubApiClientFactory();

    t.ok(typeof githubApiClient.getPRCommits === 'function', 'The githubApiClient instance has getPRCommits method');
    t.ok(typeof githubApiClient.searchPullRequests === 'function', 'The githubApiClient instance has searchPullRequests method');

    t.end();
});

test('should create instance of GraphQLClient', (t) => {
    t.plan(2);

    const token = 'testToken';

    graphqlRequest.resetHistory();

    githubApiClientFactory(token);

    t.equal(graphqlRequest.callCount, 1, 'GraphQLClient instance created');
    t.ok(
        graphqlRequest.calledWith(
            'https://api.github.com/graphql',
            {
                headers: {
                    Authorization: `token ${token}`,
                },
            },
        ),
        'GraphQLClient initialised with right args'
    );

    t.end();
});
