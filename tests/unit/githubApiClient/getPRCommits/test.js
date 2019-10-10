/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2019 Open Assessment Technologies SA;
 */

 /**
 *
 * Unit test the getPRCommits method of module src/githubApiClient.js
 *
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
