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
 * Copyright (c) 2017-2026 Open Assessment Technologies SA;
 */

/**
 * This module let's you perform some actions on a Github repository
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */

import { Octokit } from '@octokit/rest';
import githubApiClientFactory from './githubApiClient.js';
import validate from './validate.js';

/**
 * Creates a github client helper
 * @param {String} token - the github token, with permissions to manage the repo
 * @param {String} repository - the github repository name
 * @returns {githubClient} the client
 */
export default function githubFactory(token, repository) {

    //check parameters
    validate
        .githubToken(token)
        .githubRepository(repository);

    /* Mixed approach:
            - Github GraphQL api is used to fetch data (githubApiClient).
            - @octokit/rest is used for creating pull requests, labels, and releases.
    */
    const [owner, repo] = repository.split('/');
    const octokit = new Octokit({ auth: token });
    const githubApiClient = githubApiClientFactory(token);

    /**
     * @typedef {Object} githubClient
     */
    return {

        /**
         * Verify the credentials for said repository by checking it's info
         * @returns {Promise<Object>} resolves with the repository data, if the credentials are valid
         */
        async verifyRepository() {
            const { data } = await octokit.rest.repos.get({ owner, repo });
            return data;
        },
        /**
         * Add labels to an issue or pull request
         * @param {String} repoFullName - owner and name of the repository
         * @param {Number} number - issue number
         * @param {String[]} label - label name
         * @returns {Promise<Object>} - resolves with the add label data, if the label is added
         */
        async addLabel(repoFullName, number, label) {
            const [labelOwner, labelRepo] = repoFullName.split('/');
            const { data } = await octokit.rest.issues.addLabels({
                owner: labelOwner,
                repo: labelRepo,
                issue_number: number,
                labels: label
            });
            return data;
        },

        /**
         * Create the release pull request
         * @param {String} releasingBranch - the temp branch that contains the commits to release
         * @param {String} releaseBranch - the base branch
         * @param {String} version - the version of the release
         * @param {String} fromVersion - the last version
         * @returns {Promise<Object>} resolves with the pull request data
         */
        async createReleasePR(releasingBranch, releaseBranch, version = '?.?.?', fromVersion = '?.?.?') {

            if (!releasingBranch || !releaseBranch) {
                return Promise.reject(new TypeError('Unable to create a release pull request when the branches are not defined'));
            }

            const { data } = await octokit.rest.pulls.create({
                owner,
                repo,
                title: `Release ${version}`,
                body: `Release ${version} from ${fromVersion}`,
                head: releasingBranch,
                base: releaseBranch
            });
            return data;
        },

        /**
         * Close a pull request
         * @param {Number|String} prNumber - the pull request number
         * @param {Boolean} [forceMerge = false] - do we merge the PR if not yet done ?
         * @returns {Promise}
         */
        async closePR(prNumber, forceMerge = false) {
            validate.prNumber(prNumber);

            const { data: pullRequest } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: prNumber
            });

            if (!pullRequest.merged) {
                if (!forceMerge) {
                    throw new Error('I do not close an open PR');
                }
                await octokit.rest.pulls.merge({
                    owner,
                    repo,
                    pull_number: prNumber,
                    commit_title: 'Forced merged'
                });
            }

            await octokit.rest.pulls.update({
                owner,
                repo,
                pull_number: prNumber,
                state: 'closed'
            });
            return true;
        },

        /**
         * Creates a Github release from a tag
         * @param {String} tag - the tag to release
         * @param {String} [comment] - comment the release
         * @returns {Promise}
         */
        async release(tag, comment = '') {
            const { data } = await octokit.rest.repos.createRelease({
                owner,
                repo,
                tag_name: tag,
                name: tag,
                body: comment
            });
            return data;
        },

        /**
         * Get the commits SHAs from a Pull Request
         * @param {String|Number} prNumber - the pull request number
         * @returns {Promise<String[]>} resolves with the list of SHAs
         */
        async getPRCommitShas(prNumber) {
            const commits = [];

            let hasNextPage = true;
            let nextPageCursor = '';

            while (hasNextPage) {
                const {
                    repository: {
                        pullRequest: {
                            commits: {
                                nodes,
                                pageInfo
                            }
                        }
                    }
                } = await githubApiClient.getPRCommits(prNumber, repo, owner, nextPageCursor);

                commits.push(...nodes
                    .map(({ commit: { oid } }) => oid.slice(0, 8))
                );

                hasNextPage = pageInfo.hasNextPage;
                nextPageCursor = pageInfo.endCursor;
            }

            return commits;
        },

        /**
         * Format a release note string from release note data
         * @param {Object} noteData - the
         * @param {String} [noteData.title] - the title of original PR
         * @param {String} [noteData.number] - the number of the original PR
         * @param {String} [noteData.url] - the URL to the PR
         * @param {String} [noteData.user] -  the login of the developer
         * @param {String} [noteData.assignee] - the login of the reviewer
         * @param {String} [noteData.commit] - the merge commit SHA
         * @param {String} [noteData.body] - the PR body
         * @param {String} [noteData.branch] - the name of the merged branch
         * @returns {String} the release note description
         */
        formatReleaseNote(noteData) {
            const note = [];
            const typeExp = /(fix|feature|breaking)/i;
            const jiraIdExp = /[A-Z]{2,6}[- ]{1}[0-9]{1,6}/i;

            //internal extraction helper
            const extract = (string = '', exp) => {
                let match = string.match(exp);
                if (match !== null && match.index > -1) {
                    return match[0];
                }
                return false;
            };

            //extract the type of change
            const extractType = () => {
                var type;

                if (noteData.branch) {
                    type = extract(noteData.branch, typeExp);
                }
                if (!type && noteData.title) {
                    type = extract(noteData.title, typeExp);
                }
                if (type) {
                    type = type.trim();
                    type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
                }
                return type;
            };

            //extract the Jira Id
            const extractJiraId = () => {
                var jiraId;

                if (noteData.branch) {
                    jiraId = extract(noteData.branch, jiraIdExp);
                }
                if (!jiraId && noteData.title) {
                    jiraId = extract(noteData.title, jiraIdExp);
                }
                if (!jiraId && noteData.body) {
                    jiraId = extract(noteData.body, jiraIdExp);
                }
                if (jiraId) {
                    jiraId = jiraId
                        .trim()
                        .replace(/\s/, '-')
                        .toUpperCase();
                }
                return jiraId;
            };

            if (noteData) {
                const type = extractType();
                const jiraId = extractJiraId();

                if (type) {
                    note.push(`_${type}_`);
                }
                if (jiraId) {
                    note.push(`[${jiraId}](https://oat-sa.atlassian.net/browse/${jiraId})`);
                }
                if (note.length) {
                    note.push(':');
                }
                if (noteData.title) {
                    note.push(
                        noteData.title
                            .replace(typeExp, '')
                            .replace(jiraIdExp, '')
                            .replace(/\//g, '')
                            .replace(/\s\s+/g, ' ')
                            .trim()
                    );
                }
                if (noteData.number && noteData.url) {
                    note.push(`[#${noteData.number}](${noteData.url})`);
                }

                if (noteData.user && noteData.assignee) {
                    note.push('(');
                    note.push(`by [${noteData.user}](https://github.com/${noteData.user})`);
                    note.push('-');
                    note.push(`validated by [${noteData.assignee}](https://github.com/${noteData.assignee})`);
                    note.push(')');
                }
            }
            return note.join(' ');
        },

        /**
         * Extract the release notes from a release pull request.
         * We first retrieve all commits included in the release,
         * then we filter out to get only sub pull requests.
         * We retrieve the data from each of this pull request to extract the relevant info.
         *
         * @param {String|Number} prNumber - the number of the release pull request
         * @returns {Promise<String>} resolves with the release note description
         */
        async extractReleaseNotesFromReleasePR(prNumber) {
            const commits = await this.getPRCommitShas(prNumber) || [];
            const chunkSize = 28;

            const issues = [];
            for (let i = 0; i < commits.length; i += chunkSize) {
                issues.push(...(await githubApiClient.searchPullRequests(
                    `${commits.slice(i, i + chunkSize).join(' ')} repo:${repository} type:pr base:develop is:merged`,
                )).search.nodes);
            }

            // Remove dublicates
            const uniqIssue = issues.filter((issue, index, self) =>
                index === self.findIndex((d) => (
                    d.number === issue.number
                ))
            );

            return uniqIssue
                .map(issue => ({
                    ...issue,
                    assignee: issue.assignee.nodes[0] && issue.assignee.nodes[0].login,
                    commit: issue.commit.oid,
                    user: issue.user.login,
                    closedAt: new Date(issue.closedAt).getTime(),
                }))
                .sort(({ closedAt: a }, { closedAt: b }) => {
                    return a - b;
                })
                .map(this.formatReleaseNote)
                .reduce((acc, note) => note ? `${acc} - ${note}\n` : acc, '');
        }
    };
}
