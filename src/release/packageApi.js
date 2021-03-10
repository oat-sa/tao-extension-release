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
 * Copyright (c) 2020-2021 Open Assessment Technologies SA;
 */

/**
 * This module provides NPM-package-specific implementations of methods to ../release.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const fs = require('fs');
const inquirer = require('inquirer');

const npmPackageFactory = require('../npmPackage.js');
const log = require('../log.js');

/**
* @param {Object} params
* @param {String} [params.releaseBranch] - branch to release to
*/
module.exports = function packageApiFactory(params = {}, data) {

    const { interactive } = params;

    return {

        gitClient: null,

        npmPackage: null,

        getData() {
            // Not implemented
        },

        setData(newData) {
            data = newData;
        },

        /**
         * Select and initialise the npm package to release
         * @returns {Object}
         */
        async selectTarget() {
            // Only the current folder is supported, due to `npm publish` limitation
            const absolutePathToPackage = process.cwd();

            // Verify package.json
            if (!fs.existsSync(`${absolutePathToPackage}/package.json`)) {
                log.error(`No package.json found in ${absolutePathToPackage}. Please run the command inside a npm package repo.`)
                    .exit();
            }

            this.npmPackage = npmPackageFactory(absolutePathToPackage, false);

            // Verify validity of chosen package
            if (!await this.npmPackage.isValidPackage()) {
                log.error(`Invalid package.json found in ${absolutePathToPackage}`)
                    .exit();
            }

            return {
                package: {
                    name: this.npmPackage.name,
                    path: absolutePathToPackage
                }
            };
        },

        /**
         * Extract package metadata from its metafile
         * @returns {Object}
         */
        getMetadata(){
            return this.npmPackage.parsePackageJson();
        },

        /**
         * Checkout master, show a prompt and then run `npm publish`
         * TODO: checkout latest tag?
         * @returns {Promise}
         */
        async publish() {
            if (this.gitClient) {
                await this.gitClient.checkout(params.releaseBranch);
            }
            let publishPackage = !interactive;
            log.doing('Preparing for npm publish');
            if (interactive) {
                log.info(`
        Before publishing, please be sure your npm account is configured and is a member of the appropriate organisation.
        https://docs.npmjs.com/getting-started/setting-up-your-npm-user-account
        https://www.npmjs.com/settings/oat-sa/packages
                `);
                const { confirmPublish } = await inquirer.prompt({
                    name: 'confirmPublish',
                    type: 'confirm',
                    message: 'Do you want to proceed with the \'npm publish\' command?',
                    default: false
                });
                publishPackage = confirmPublish;
            }
            if (publishPackage)     {
                log.doing(`Publishing package ${this.npmPackage.name} @ ${this.npmPackage.version}`);
                return this.npmPackage.publish();
            }
            log.exit();
        },

        build(){
            // Not implemented
        },

        /**
         * Update package version
         */
        async updateVersion() {
            await this.npmPackage.updateVersion(undefined, data.version);
        }
    };
};
