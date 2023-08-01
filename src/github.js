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
 * Copyright (c) 2017 Open Assessment Technologies SA;
 */

/**
 * This module let's you perform some actions on a Github repository
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */

import githubApiClientFactory from './githubApiClient.js';
import validate from './validate.js';
import octonode from 'octonode';

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

    /* TODO: Since github v4 api does not support all required functionality at the moment of integration,
       currently mixed approach is used:
            - Github v4 api is used to fetch data.
            - octonode package is used for creating pull request and release.
       Once github v4 api add support for missing functionality, the application should be fully migrated to the v4 api
    */
    const client = octonode.client(token);
    const ghrepo = client.repo(repository);
    const githubApiClient = githubApiClientFactory(token);

    /**
     * @typedef {Object} githubClient
     */
    return {

        /**
         * Verify the credentials for said repository by checking it's info
         * @returns {Promise<Object>} resolves with the repository data, if the credentials are valid
         */
        verifyRepository() {
            return new Promise((resolve, reject) => {
                ghrepo.info((err, data) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(data);
                });
            });
        },
        /**
         * Create the release pull request
         * @param {String} releasingBranch - the temp branch that contains the commits to release
         * @param {String} releaseBranch - the base branch
         * @param {String} version - the version of the release
         * @param {String} fromVersion - the last version
         * @returns {Promise<Object>} - resolves with the pull request data
         */

        addLabel(repo, number, label) {
            const ghpr = client.issue(repo, number);
            return new Promise((resolve, reject) => {
                ghpr.addLabels({
                    labels: label
                }, (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(data);
                });
            });
        },

        /**
         * Create the release pull request
         * @param {String} releasingBranch - the temp branch that contains the commits to release
         * @param {String} releaseBranch - the base branch
         * @param {String} version - the version of the release
         * @param {String} fromVersion - the last version
         * @returns {Promise<Object>} resolves with the pull request data
         */
        createReleasePR(releasingBranch, releaseBranch, version = '?.?.?', fromVersion = '?.?.?') {

            if (!releasingBranch || !releaseBranch) {
                return Promise.reject(new TypeError('Unable to create a release pull request when the branches are not defined'));
            }
            return new Promise((resolve, reject) => {
                ghrepo.pr({
                    title: `Release ${version}`,
                    body: `Release ${version} from ${fromVersion}`,
                    head: releasingBranch,
                    base: releaseBranch
                }, (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(data);
                });
            });
        },

        /**
         * Close a pull request
         * @param {Number|String} prNumber - the pull request number
         * @param {Boolean} [forceMerge = false] - do we merge the PR if not yet done ?
         * @returns {Promise}
         */
        closePR(prNumber, forceMerge = false) {
            return new Promise((resolve, reject) => {

                validate.prNumber(prNumber);

                const ghpr = client.pr(repository, prNumber);
                const doClose = () => {
                    ghpr.close(closeErr => {
                        if (closeErr) {
                            return reject(closeErr);
                        }
                        return resolve(true);
                    });
                };
                ghpr.merged((err, merged) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!merged) {
                        if (forceMerge) {
                            return ghpr.merge('Forced merged', mergeErr => {
                                if (mergeErr) {
                                    return reject(mergeErr);
                                }
                                return doClose();
                            });
                        } else {
                            return reject(new Error('I do not close an open PR'));
                        }
                    }
                    return doClose();
                });
            });
        },

        /**
         * Creates a Github release from a tag
         * @param {String} tag - the tag to release
         * @param {String} [comment] - comment the release
         * @returns {Promise}
         */
        release(tag, comment = '') {
            return new Promise((resolve, reject) => {
                ghrepo.release({
                    tag_name: tag,
                    name: tag,
                    body: comment
                }, (err, released) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(released);
                });
            });
        },

        /**
         * Get the commits SHAs from a Pull Request
         * @param {String|Number} prNumber - the pull request number
         * @returns {Promise<String[]>} resolves with the list of SHAs
         */
        async getPRCommitShas(prNumber) {
            const commits = [];
            const [owner, name] = repository.split('/');

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
                } = await githubApiClient.getPRCommits(prNumber, name, owner, nextPageCursor);

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