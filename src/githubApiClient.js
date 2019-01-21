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
 * This module contains methods to comunicate with GitHub v4 Api
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const { GraphQLClient } = require('graphql-request');

/**
 * Creates a github api client
 * @param {String} token - the github token, with permissions to manage the repo
 * @returns {Object} the client
 */
module.exports = function githubApiClientFactory(token) {
    const graphQLClient = new GraphQLClient(
        'https://api.github.com/graphql',
        {
            headers: {
                Authorization: `token ${token}`
            }
        }
    );

    return {
        /**
         * Fetch commits of a PR by PR number
         *
         * @param {Number|String} prNumber - number of PR
         * @param {String} repositoryName - repository name
         * @param {String} repositoryOwner - repository owner
         * @param {String} nextPageCursor - cursor to item from which to start fetching
         * @returns {Object}
         */
        getPRCommits(prNumber, repositoryName, repositoryOwner, nextPageCursor = '') {
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

            return graphQLClient.request(query);
        },

        /**
         * Search github pull requests by query
         *
         * @param {String} searchQuery - query for github search api
         * @returns {Object}
         */
        searchPullRequests(searchQuery) {
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

            return graphQLClient.request(query);
        }
    };
};
