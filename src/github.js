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


/**
 * Creates a github client helper
 * @param {String} token - the github token, with permissions to manage the repo
 * @param {String} repository - the github repository name
 * @returns {githubClient} the client
 */
module.exports = function githubFactory(token, repository) {

    const client = require('octonode').client(token);
    const ghrepo = client.repo(repository);

    /**
     * @typedef {Object} githubClient
     */
    return {

        /**
         * Create the release pull request
         * @param {String} releasingBranch - the temp branch that contains the commits to release
         * @param {String} releaseBranch - the base branch
         * @param {String} version - the version of the release
         * @returns {Promise} resolves with the pull request data
         */
        createReleasePR(releasingBranch, releaseBranch, version) {
            const prBody = `Please check :
 - [ ] the manifest (versions and dependencies)
 - [ ] the update script
 - [ ] CSS and JavaScript bundles
`;
            return new Promise( (resolve, reject) => {
                ghrepo.pr({
                    title: `Release ${version}`,
                    body : prBody,
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
         * Close a pull request
         * @param {Number|String} id - the pull request id
         * @param {Boolean} [forceMerge = false] - do we merge the PR if not yet done ?
         * @returns {Promise}
         */
        closePR(id, forceMerge = false){
            return new Promise( (resolve, reject) => {

                const ghpr = client.pr(repository, id);
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

        }
    };
};
