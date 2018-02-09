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
 * This module let's you perform some actions on a local git repository
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */

const git = require('simple-git/promise');
const os  = require('os');

/**
 * Creates a git client
 *
 * @param {String} repository - the git repository path
 * @param {String} origin - remote name
 * @returns {githubClient} the client
 */
module.exports = function gitFactory(repository = '', origin = 'origin') {


    /**
     * @typedef gitClient
     * @type {Objet}
     */
    return {

        /**
         * Get repository branches
         * @returns {Promise<String[]>} resolves with the list of branch names
         */
        getLocalBranches(){
            return git(repository)
                .branch()
                .then( branches => branches.all);
        },

        /**
         * Delete a branch, remotely and locally.
         * This operation requires git >= 1.8
         * @param {String} branchName - the branch name
         * @returns {Promise}
         */
        deleteBranch(branchName){
            return git(repository).push([origin, branchName, '--delete'])
                .then( () => git(repository).deleteLocalBranch(branchName) );
        },

        /**
         * Create and checkout a local branch
         * @param {String} branchName - the branch name
         * @returns {Promise}
         */
        localBranch(branchName){
            return git(repository)
                .checkoutLocalBranch(branchName);
        },

        /**
         * Does the repository has changes ?
         * @returns {Promise<Boolean>}
         */
        hasLocalChanges(){
            const empty = ['modified', 'renamed', 'conflicted', 'created', 'deleted'];
            return git(repository)
                .status()
                .then(status =>
                    empty.some(value => status[value].length > 0)
                );
        },

        /**
         * Is a GPG key configured ?
         * @returns {Promise<Boolean>}
         */
        hasSignKey(){
            return git(repository)
                .raw(['config', '--list'])
                .then(results => {
                    const configs = results.split(os.EOL).map(row => row.split('=')[0]);
                    return configs && configs.indexOf('user.signingkey') > 0;
                });
        },

        /**
         * Full pull (fetch, checkout branch from remote if not there, and pull)
         * @param {String} branchName - the branch name
         * @returns {Promise}
         */
        pull(branchName){

            return git(repository).fetch(origin)
                .then(() => this.getLocalBranches() )
                .then( branches => branches && branches.indexOf(branchName) > -1 )
                .then( hasBranch => {
                    if(!hasBranch){
                        return git(repository).checkoutBranch(branchName, `${origin}/${branchName}`);
                    } else {
                        return git(repository).checkout(branchName);
                    }
                })
                .then(() => git(repository).pull(origin, branchName));
        },

        /**
         * Does the given tag exists
         * @param {String} tagName
         * @returns {Promise<Boolean>}
         */
        hasTag(tagName){
            return git(repository).tags()
                .then(tags => tags && tags.all && tags.all.indexOf(tagName) > -1);
        },

        /**
         * Create and push the given tag
         * @param {String} tagBranch - the branch to create the tag from
         * @param {String} tagName - the name of the tag to create and push
         * @param {String} [comment] - the tag comment
         * @returns {Promise<Boolean>}
         */
        tag(tagBranch, tagName, comment = ''){
            return git(repository).checkout(tagBranch)
                .then(() => git(repository).pull(origin, tagBranch))
                .then(() => git(repository).tag([tagName, `-m "${comment}`]))
                .then(() => git(repository).pushTags(origin));
        },

        /**
         * Is there a diff between the two branches ?
         * @param {String} aBranch
         * @param {String} anotherBranch
         * @returns {Promise<Boolean>}
         */
        hasDiff(aBranch, anotherBranch){
            return git(repository).raw(['diff', '--shortstat', `${aBranch}..${anotherBranch}`]);
        },


        /**
         * Merge and push branches in a Pull Request style layout
         * @param {String} baseBranch - the branch that receive the feature
         * @param {String} releaseBranch - the branch that contain the feature
         * @returns {Promise}
         */
        mergePr(baseBranch, featureBranch){

            return git(repository).checkout(baseBranch)
                .then( () => git(repository).pull(origin, baseBranch) )
                .then( () => git(repository).merge(['--no-ff', featureBranch]) )
                .then( () => git(repository).push(origin, baseBranch) );
        },

        /**
         * Operation to merge a released branch merged back in a base branch
         * @param {String} baseBranch - the branch used to create the release (develop)
         * @param {String} releaseBranch - the branch that received the release (master)
         * @returns {Promise}
         */
        mergeBack(baseBranch, releaseBranch){

            return git(repository).checkout(baseBranch)
                .then( () => git(repository).pull(origin, baseBranch) )
                .then( () => git(repository).merge([releaseBranch]) )
                .then( () => git(repository).push(origin, baseBranch) );
        },

        /**
         * Commit and push every changes on the current branch
         * @param {String} branchName - name of the branch to push to
         * @param {String} comment - commit comment
         * @returns {Promise}
         */
        commitAndPush(branchName, comment = ''){
            var changes =[];
            return git(repository).diffSummary()
                .then(results => {
                    if (results && results.files) {
                        changes = results.files.map(file => file.file);
                        return git(repository).commit(comment, changes)
                                .then(() => git(repository).push(origin, branchName));
                    }
                })
                .then(() => changes);
        },
    };
};
