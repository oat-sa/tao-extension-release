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
 * Copyright (c) 2023 Open Assessment Technologies SA;
 */
jest.mock('graphql-request', () => ({
        GraphQLClient: jest.fn(() => ({
            request: jest.fn(query => query)
        }))
    }));
import githubApiClientFactory from '../../src/githubApiClient.js'
import { GraphQLClient } from 'graphql-request';

describe('src/githubApiClient.js', () => {
    it('should create instance with exposed public methods', () => {
        const githubApiClient = githubApiClientFactory();
        expect(typeof githubApiClient.getPRCommits).toBe('function');
        expect(typeof githubApiClient.searchPullRequests).toBe('function');
    });
    it('should create instance of GraphQLClient', () => {
        const token = 'testToken';
        githubApiClientFactory(token);
        expect(GraphQLClient).toBeCalled();
        expect(GraphQLClient).toBeCalledWith(
            'https://api.github.com/graphql',
            {
                headers: {
                    Authorization: `token ${token}`,
                },
            },
        );
    });
    it('should request commits', async () => {
        const prNumber = '1234';
        const repositoryName = 'testRepository';
        const repositoryOwner = 'testOwner';
        const nextPageCursor = 'testCursor';
        const token = 'ffaaffe5a8';
        const githubApiClient = githubApiClientFactory(token);

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

        const request = await githubApiClient.getPRCommits(
            prNumber,
            repositoryName,
            repositoryOwner,
            nextPageCursor,
        );
        expect(request).toBe(query);
    });
    it('should use empty nextCursor by default', async () => {
        const prNumber = '1234';
        const repositoryName = 'testRepository';
        const repositoryOwner = 'testOwner';
        const nextPageCursor = '';
        const token = 'ffaaffe5a8';
        const githubApiClient = githubApiClientFactory(token);

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

        const request = await githubApiClient.getPRCommits(
            prNumber,
            repositoryName,
            repositoryOwner,
            nextPageCursor,
        );
        expect(request).toBe(query);
    });
    it('should search pull requests', async () => {
        const searchQuery = 'testSearchQuery';
        const token = 'ffaaffe5a8';
        const githubApiClient = githubApiClientFactory(token);
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
        const request = await githubApiClient.searchPullRequests(searchQuery);
        expect(request).toBe(query);
    });
});