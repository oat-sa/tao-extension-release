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
 * This module let's you manage local configuration
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

/**
 * Get the config object
 * @param {String} [dir] - where the config is stored, in $HOME by default
 * @param {String} [fileName = .tao-extension-release] - the config file
 * @returns {config} the config manager
 */
module.exports = function configFactory(dir = os.homedir(), fileName = '.tao-extension-release'){
    const configFile = path.normalize(`${dir}/${fileName}`);

    /**
     * Provides you methods to manage the local configuration
     * @typedef {Object} config
     */
    return {

        /**
         * Load the config
         * @returns {Promise} always resolves with the config object
         */
        load(){
            return fs
                .readJSON(configFile)
                .catch( () => ({}) );
        },


        /**
         * Writes the config
         * @param {Object} data - the config data
         * @returns {Promise} resolves once written
         */
        write(data = {}){
            return fs.writeJson(configFile, data, { spaces : 2 });
        }
    };
};
