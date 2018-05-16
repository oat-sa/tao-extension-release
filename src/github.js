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

const validate = require('./validate.js');

/**
 * Creates a github client helper
 * @param {String} token - the github token, with permissions to manage the repo
 * @param {String} repository - the github repository name
 * @returns {githubClient} the client
 */
module.exports = function githubFactory(token, repository) {

    //check parameters
    validate
        .githubToken(token)
        .githubRepository(repository);

    const client = require('octonode').client(token);
    const ghrepo = client.repo(repository);

    /**
     * Add the checks to display in a release PR for a given repository
     */
    const extensionPRChecks = {
        'oat-sa/tao-core' : 'Increase TAO-VERSION in `manifest.php`',
        'oat-sa/extension-tao-delivery-rdf' : 'Do not forget to update the dependency and release oat-sa/extension-tao-community'
    };

    /**
     * @typedef {Object} githubClient
     */
    return {

        /**
         * Create the release pull request
         * @param {String} releasingBranch - the temp branch that contains the commits to release
         * @param {String} releaseBranch - the base branch
         * @param {String} version - the version of the release
         * @param {String} fromVersion - the last version
         * @returns {Promise<Object>} resolves with the pull request data
         */
        createReleasePR(releasingBranch, releaseBranch, version = '?.?.?', fromVersion = '?.?.?') {
            if(!releasingBranch || !releaseBranch) {
                return Promise.reject(new TypeError('Unable to create a release pull request when the branches are not defined'));
            }
            return new Promise( (resolve, reject) => {
                ghrepo.pr({
                    title: `Release ${version}`,
                    body : this.getReleasePRComment(version, fromVersion),
                    head: releasingBranch,
                    base: releaseBranch
                }, (err, data)  => {
                    if(err){
                        return reject(err);
                    }
                    return resolve(data);
                });
            });
        },

        /**
         * Get the comment of the release pull request
         * @param {String} version - the version of the release
         * @param {String} fromVersion - the last version
         * @returns {String} the comment
         */
        getReleasePRComment(version = '?.?.?', fromVersion = '?.?.?') {
            const checks = [
                `the manifest (versions ${version} and dependencies)`,
                `the update script (from ${fromVersion} to ${version})`,
                'CSS and JavaScript bundles'
            ];

            if(typeof extensionPRChecks[repository] !== 'undefined'){
                checks.push(extensionPRChecks[repository]);
            }
            return `Please verify the following points :\n${checks.map( c => '\n- [] ' + c)}`;
        },

        /**
         * Close a pull request
         * @param {Number|String} prNumber - the pull request number
         * @param {Boolean} [forceMerge = false] - do we merge the PR if not yet done ?
         * @returns {Promise}
         */
        closePR(prNumber, forceMerge = false){
            return new Promise( (resolve, reject) => {

                validate.check(prNumber);

                const ghpr = client.pr(repository, prNumber);
                const doClose = () => {
                    ghpr.close( closeErr => {
                        if(closeErr){
                            return reject(closeErr);
                        }
                        return resolve(true);
                    });
                };
                ghpr.merged( (err, merged) => {
                    if(err){
                        return reject(err);
                    }
                    if(!merged){
                        if(forceMerge){
                            return ghpr.merge('Forced merged', mergeErr => {
                                if(mergeErr){
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
        release(tag, comment = ''){
            return new Promise( (resolve, reject) => {
                ghrepo.release({
                    tag_name : tag,
                    name : tag,
                    body : comment
                }, (err, released) => {
                    if(err){
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
        getPRCommitShas(prNumber){
            return new Promise( (resolve, reject) => {

                validate.check(prNumber);

                client
                    .pr(repository, prNumber)
                    .commits( (err, commits) => {
                        if(err){
                            return reject(err);
                        }
                        return commits.map( commit => commit.sha);
                    });
            });
        },

        /**
         * Search issues
         * @param {Object} [searchOptions] - search parameters
         * @param {String} [searchOptions.q] - the github search query
         * @param {String} [searchOptions.sort = created] - how to sort the issues
         * @param {String} [searchOptions.order = asc] - the sort order
         * @returns {Promise<Object[]>} resolves with the list issues
         */
        searchIssues(searchOptions = {q : '', sort : 'created', order : 'asc'}){
            return new Promise( (resolve, reject) => {
                client
                    .search()
                    .issues(searchOptions, (searchErr, results) => {
                        if(searchErr){
                            return reject(searchErr);
                        }
                        if(results && results.items && results.items.length){
                            return resolve(results.items);
                        }
                        return resolve([]);
                    });
            });
        },

        /**
         * Load all info about a Pull Request
         * @param {String|Number} prNumber - the pull request number
         * @returns {Promise<Object>} resolves with the pull request data
         */
        getPRData(prNumber){
            return new Promise( (resolve, reject) => {

                validate.check(prNumber);

                client
                    .pr(repository, prNumber)
                    .info( (err, data) => {
                        if(err){
                            return reject(err);
                        }
                        return data;
                    });
            });
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
        formatReleaseNote(noteData){
            const note      = [];
            const typeExp   = /(fix|feature|breaking)/i;
            const jiraIdExp = /[A-Z]{2,6}[- ]{1}[0-9]{1,6}/i;

            //internal extraction helper
            const extract = (string = '', exp) => {
                let match = string.match(exp);
                if(match !== null && match.index > -1){
                    return match[0];
                }
                return false;
            };

            //extract the type of change
            const extractType   = () => {
                var type;

                if(noteData.branch){
                    type = extract(noteData.branch, typeExp);
                }
                if(!type && noteData.title){
                    type = extract(noteData.title, typeExp);
                }
                if(type){
                    type = type.trim();
                    type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
                }
                return type;
            };

            //extract the Jira Id
            const extractJiraId = () => {
                var jiraId;

                if(noteData.branch){
                    jiraId = extract(noteData.branch, jiraIdExp);
                }
                if(!jiraId && noteData.title){
                    jiraId = extract(noteData.title, jiraIdExp);
                }
                if(!jiraId && noteData.body){
                    jiraId = extract(noteData.body, jiraIdExp);
                }
                if(jiraId){
                    jiraId = jiraId
                        .trim()
                        .replace(/\s/, '-')
                        .toUpperCase();
                }
                return jiraId;
            };

            if(noteData){
                const type = extractType();
                const jiraId = extractJiraId();

                if(type){
                    note.push(`_${type}_`);
                }
                if(jiraId){
                    note.push(`[https://oat-sa.atlassian.net/browse/${jiraId}](${jiraId})`);
                }
                if(note.length){
                    note.push(':');
                }
                if(noteData.title){
                    note.push(
                        noteData.title
                            .replace(typeExp, '')
                            .replace(jiraIdExp, '')
                            .replace(/\//g, '')
                            .replace(/\s\s+/g, ' ')
                            .trim()
                    );
                }
                if(noteData.number && noteData.url){
                    note.push(`[${noteData.url}](#${noteData.number})`);
                }

                if(noteData.user && noteData.assignee){
                    note.push('(');
                    note.push(`by [https://github.com/${noteData.user}](${noteData.user})`);
                    note.push('-');
                    note.push(`validated by [https://github.com/${noteData.assignee}](${noteData.assignee})`);
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
        extractReleaseNotesFromReleasePR(prNumber) {

            //1. Get all commits from the release PR
            return this.getPRCommitShas(prNumber)
                .then( commits => {
                    if(commits && commits.length){

                        // we filter out PR inside those commits
                        // (github considers pr as issues)
                        return this.searchIssues({
                            q : `${commits.join('+')}+repo:${repository}+type:pr+base:develop+is:merged`,
                            sort: 'closed',
                            order: 'asc'
                        });
                    }
                })
                .then( issues => {
                    if(issues && issues.length) {
                        //we load the full description from all of them (for the head branch mostly)
                        return Promise.all(
                            issues.map( issue => this.getPRData(issue.number) )
                        );
                    }
                    return [];
                })
                .then( mergedPrResults => {
                    //extract only useful data
                    if(mergedPrResults && mergedPrResults.length){
                        return mergedPrResults.map( result => {
                            return {
                                title : result.title,
                                number : result.number,
                                url : result.html_url,
                                user : result.user && result.user.login,
                                assignee : result.assignee && result.assignee.login,
                                commit: result.merge_commit_sha,
                                body : result.body,
                                branch : result.head && result.head.ref
                            };
                        });
                    }
                    return [];
                })
                .then( notesData => {
                    //extract the IDs and format the notes
                    if(notesData && notesData.length){
                        return notesData
                            .map( noteData => this.formatRealseNote(noteData) )
                            .reduce( (acc, note) => {
                                if(note){
                                    acc += `- ${note}\n`;
                                }
                                return acc;
                            }, '');
                    }
                });
        }
    };
};
