/**
 *
 * Unit test the searchPullRequests method of module src/githubApiClient.js
 *
 * @copyright 2019 Open Assessment Technologies SA;
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const graphqlRequestInstance = {
    request: () => { },
};
const graphqlRequest = sandbox.stub().callsFake(() => graphqlRequestInstance);
const githubApiClient = proxyquire.noCallThru().load('../../../../src/githubApiClient.js', {
    'graphql-request': {
        GraphQLClient: graphqlRequest,
    },
})();

test('should search pull requests', async (t) => {
    t.plan(2);

    const searchQuery = 'testSearchQuery';

    const query = `
            {
                search(first: 100, query: "${searchQuery}", type: ISSUE) {
                    nodes {
                        ... on PullRequest {
                            assignee: assignees(first: 1) {
                                nodes {
                                    login
                                }
                            },
                            body,
                            branch: headRefName,
                            closedAt,
                            commit: mergeCommit {
                                oid
                            },
                            number,
                            title,
                            url,
                            user: author {
                                login
                            },
                        }
                    }
                }
            }
            `;

    sandbox.stub(graphqlRequestInstance, 'request');

    await githubApiClient.searchPullRequests(searchQuery);

    t.equal(graphqlRequestInstance.request.callCount, 1, 'Pull requests search has been requeted');
    t.ok(graphqlRequestInstance.request.calledWith(query), 'Pull requests search has been requeted with apropriate query');

    sandbox.restore();
    t.end();
});

test('should return found pull requests', async (t) => {
    t.plan(1);

    const pullRequests = ['pullRequests1', 'pullRequests2'];

    sandbox.stub(graphqlRequestInstance, 'request').returns(pullRequests);

    const actual = await githubApiClient.searchPullRequests();

    t.equal(actual, pullRequests, 'Pull requests have been returned');

    sandbox.restore();
    t.end();
});
