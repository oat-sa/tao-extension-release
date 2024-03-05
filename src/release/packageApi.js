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
 * Copyright (c) 2020-2024 Open Assessment Technologies SA;
 */

/**
 * This module provides NPM-package-specific implementations of methods to ../release.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

import fs from 'fs';
import inquirer from 'inquirer';

import npmPackageFactory from '../npmPackage.js';
import log from '../log.js';

/**
* @param {Object} params
* @param {String} [params.releaseBranch] - branch to release to
*/
export default function packageApiFactory(params = {}, data) {

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
         * Checkout master,
         * Prompt user whether he wants to publish packages
         * @returns {Promise<Boolean>}
         */
        async beforePublish() {
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
            return publishPackage;
        },

        /**
         * Checkout master, show a prompt and then run `npm publish`
         * TODO: checkout latest tag?
         * @returns {Promise}
         */
        async publish() {
            const publishPackage = await this.beforePublish();
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
        },

        /**
         * For lerna monorepo, get list of packages
         * @returns {Promise<Object[]>} - `[{ packageName: string, packagePath: string, lastVersion: string, dependencies: string[] }]`
         */
        async monorepoGetPackagesList() {
            return await this.npmPackage.lernaGetPackagesList();
        },

        /**
         * For monorepo, update version in the root and in the packages
         * @param {Object[]} packagesInfo - `[{packageName: string, packagePath: string, version: string}]`
         * @returns {Promise<void>}
         */
        async monorepoUpdateVersions(packagesInfo) {
            await this.npmPackage.lernaUpdateVersions(packagesInfo, data.version);
        },

        /**
         * For lerna monorepo, publish packages to npm
         * @returns {Promise<void>}
         */
        async monorepoPublish() {
            const publishPackage = await this.beforePublish();
            if (publishPackage) {
                log.doing('Publishing monorepo packages');
                return this.npmPackage.lernaPublish();
            }
        }
    };
}
