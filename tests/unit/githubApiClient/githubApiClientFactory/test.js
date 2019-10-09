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
 * Unit test the githubApiClientFactory from module src/githubApiClient.js
 *
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
