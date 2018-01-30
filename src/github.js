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
 * Github client helper
 */
module.exports = {

    /**
     * Create the release pull request
     * @param {Object} options
     * @param {Object} options.ghrepo - a github repository client
     * @param {String} options.releasingBranch - the temp branch that contains the commits to release
     * @param {String} options.releaseBranch - the base branch
     * @param {String} options.version - the version of the release
     * @param {String} options.fromVersion - the last version
     * @returns {Promise} resolves with the pull request data
     */
    createReleasePR({ ghrepo, releasingBranch, releaseBranch, version, fromVersion }) {
        const prBody = `Please check :
 - [ ] the manifest (versions ${version} and dependencies)
 - [ ] the update script (from ${fromVersion} to ${version})
 - [ ] CSS and JavaScript bundles
 - [ ] Extension specials (version in tao-core, nested dependencies, etc.)
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
     * Try to extract the release notes from a release PR
     * @param {Object} options
     * @param {Object} options.client - github client
     * @param {Object} options.repository - the repository name
     * @param {Number} options.id - the PR id
     * @returns {Promise<String>} resolves with the list of release notes
     */
    getReleaseNotes({ client, repository, id }) {
        const mergePrExp = /^Merge pull request #\d+ from oat-sa\//i;
        const ticketExp  = /[A-Z]{2,4}-\d{1,5}/;
        return new Promise( (resolve, reject) => {
            const ghpr = client.pr(repository, id);
            ghpr.commits( (err, data) => {
                const notes = [];
                if(err){
                    return reject(err);
                }
                if(data && data.length){
                    data.filter( commit => commit.sha && commit.commit && mergePrExp.test(commit.commit.message))
                        .forEach( commit => {
                            const noteData = commit.commit.message.replace(mergePrExp, '').split(/\n+/);
                            if(noteData.length === 2){
                                let branchData = noteData[0].split('/');
                                let ticketData = noteData[0].match(ticketExp);
                                notes.push({
                                    sha : commit.sha,
                                    type : branchData[0],
                                    ticket : ticketData[0],
                                    message : noteData[1]
                                });
                            } else {
                                notes.push({
                                    sha : commit.sha,
                                    message : noteData.join(' ')
                                });
                            }
                        });
                }

                return resolve(notes);
            });
        })
            .then( notes  => {
                return  notes.reduce( (acc, note) => {
                    acc += '-';
                    if(note.type){
                        acc+= ` [${note.type}]`;
                    }
                    if(note.ticket){
                        acc += ` [${note.ticket}](https://oat-sa.atlassian.net/browse/${note.ticket}) `;
                    }
                    acc += ` ${note.message} ([commit](https://github.com/${repository}/commit/${note.sha}))\n`;
                    return acc;
                }, '');
            });
    },

    /**
     * Close a pull request
     * @param {Object} options
     * @param {Object} options.client - github client
     * @param {Object} options.repository - the repository name
     * @param {Number|String} options.id - the pull request id
     * @param {Boolean} [options.forceMerge = false] - do we merge the PR if not yet done ?
     * @returns {Promise}
     */
    closePR({ client, repository, id, forceMerge = false }){
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
     * @param {Object} options
     * @param {Object} options.ghrepo - a github repository client
     * @param {String} options.tag - the tag to release
     * @param {String} [options.comment] - comment the release
     * @returns {Promise}
     */
    release({ ghrepo, tag, comment = ''}){
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
