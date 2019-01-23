/**
 *
 * Unit test the getPRCommits method of module src/githubApiClient.js
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

test('should request commits', async (t) => {
    t.plan(2);

    const prNumber = '1234';
    const repositoryName = 'testRepository';
    const repositoryOwner = 'testOwner';
    const nextPageCursor = 'testCursor';

    const query = `
            {
                repository(owner: "${repositoryOwner}", name: "${repositoryName}") {
                    pullRequest(number: ${prNumber}) {
                        commits(first: 250, after: "${nextPageCursor}") {
                            pageInfo {
                                endCursor,
                                hasNextPage,
                            }
                            nodes {
                                commit {
                                    oid
                                }
                            }
                        }
                    }
                }
            }
            `;

    sandbox.stub(graphqlRequestInstance, 'request');

    await githubApiClient.getPRCommits(
        prNumber,
        repositoryName,
        repositoryOwner,
        nextPageCursor,
    );

    t.equal(graphqlRequestInstance.request.callCount, 1, 'Commits have been requeted');
    t.ok(graphqlRequestInstance.request.calledWith(query), 'Commits have been requeted with apropriate query');

    sandbox.restore();
    t.end();
});

test('should use empty nextCursor by default', async (t) => {
    t.plan(2);

    const prNumber = '1234';
    const repositoryName = 'testRepository';
    const repositoryOwner = 'testOwner';
    const nextPageCursor = '';

    const query = `
            {
                repository(owner: "${repositoryOwner}", name: "${repositoryName}") {
                    pullRequest(number: ${prNumber}) {
                        commits(first: 250, after: "${nextPageCursor}") {
                            pageInfo {
                                endCursor,
                                hasNextPage,
                            }
                            nodes {
                                commit {
                                    oid
                                }
                            }
                        }
                    }
                }
            }
            `;

    sandbox.stub(graphqlRequestInstance, 'request');

    await githubApiClient.getPRCommits(
        prNumber,
        repositoryName,
        repositoryOwner,
    );

    t.equal(graphqlRequestInstance.request.callCount, 1, 'Commits have been requeted');
    t.ok(graphqlRequestInstance.request.calledWith(query), 'Commits have been requeted with apropriate query');

    sandbox.restore();
    t.end();
});

test('should return requested commits', async (t) => {
    t.plan(1);

    const commits = ['commit1', 'commit2'];

    sandbox.stub(graphqlRequestInstance, 'request').returns(commits);

    const actual = await githubApiClient.getPRCommits();

    t.equal(actual, commits, 'Commits have been returned');

    sandbox.restore();
    t.end();
});
