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
 * This module provides NPM-package-specific implementations of methods to ../release.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const fs = require('fs');
const inquirer = require('inquirer');

const npmPackageFactory = require('../npmPackage.js');
const gitClientFactory = require('../git.js');
const config = require('../config.js')();
const log = require('../log.js');

module.exports = {
    /**
     * Select and initialise the npm package to release
     * @param {Object} data - release subject data
     * @returns {Object}
     */
    async selectPackage(data) {
        // Only the current folder is supported, due to `npm publish` limitation
        const absolutePathToPackage = process.cwd();

        // Verify package.json
        if (!fs.existsSync(`${absolutePathToPackage}/package.json`)) {
            log.error(`No package.json found in ${absolutePathToPackage}. Please run the command inside a npm package repo.`)
                .exit();
        }
        /**
         * @typedef {Object} npmPackage
         */
        const npmPackage = npmPackageFactory(absolutePathToPackage, false);

        // Verify validity of chosen package
        if (!await npmPackage.isValidPackage()) {
            log.error(`Invalid package.json found in ${absolutePathToPackage}`)
                .exit();
        }

        data.package = {
            name: npmPackage.name,
            path: absolutePathToPackage,
        };

        await config.write(data);

        return {
            data,
            npmPackage
        };
    },

    /**
     * Initialise and return a git client in the release folder
     * @param {Object} params - command line params
     * @param {Object} data - release subject data
     * @returns {GitClient}
     */
    initialiseGitClient(params, data) {
        return gitClientFactory(data.package.path, params.origin);
    },

    /**
     * Show a prompt and then run `npm publish`
     * @returns {Promise}
     * @param {Object} params - command line params
     * @param {String} [params.releaseBranch] - branch to release to
     * @param {Object} data - release subject data
     * @param {GitClient} gitClient
     * @param {NpmPackage} npmPackage
     * @returns {Promise}
     */
    async publishToNpm(params, data, gitClient, npmPackage) {
        await gitClient.checkout(params.releaseBranch);

        log.doing('Preparing for npm publish');
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
        if (confirmPublish) {
            log.doing(`Publishing package ${data.package.name} @ ${data.version}`);
            return npmPackage.publish();
        }
        log.exit();
    }
};
