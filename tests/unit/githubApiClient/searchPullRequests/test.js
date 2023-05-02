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
 * Unit test the searchPullRequests method of module src/githubApiClient.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

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

    t.equal(graphqlRequestInstance.request.callCount, 1, 'Pull requests search has been requested');
    t.ok(graphqlRequestInstance.request.calledWith(query), 'Pull requests search has been requested with appropriate query');

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
