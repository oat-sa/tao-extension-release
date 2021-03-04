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
 * Copyright (c) 2020 Open Assessment Technologies SA;
 */

/**
 * This module provides repository-specific implementations of methods to ../release.js
 */

const log = require('../log.js');
const gitClientFactory = require('../git');

/**
 * Factory for the repository implementation
 * @param {Object} params
 * @param {Object} data
 */
module.exports = function repositoryApiFactory(params = {}, data) {

    return {

        gitClient: null,

        getData() {
            return data;
        },

        setData(newData) {
            data = newData;
        },

        /**
         * Select the path and repo name
         * @returns {Object}
         */
        async selectTarget() {
            // Only the current folder is supported
            const absolutePathToRepo = process.cwd();

            let name;
            try {
                //git client is not yet available, since it will be created if this fn succeeds
                name = await gitClientFactory(absolutePathToRepo, params.origin).getRepositoryName();
            }
            catch(err){
                log.error(`Unable to fetch remote name from ${absolutePathToRepo}: ${err.message}`)
                    .exit();
            }

            return {
                repository: {
                    path: absolutePathToRepo,
                    name
                }
            };
        },

        /**
         * get repository metadata
         */
        async getMetadata(){
            return {
                repoName: data.repository.name  //for compatibility
            };
        },

        publish() {
            // Not implemented
        },

        build(){
            // Not implemented
        },

        updateVersion() {
            //Not implemented
        }
    };
};
