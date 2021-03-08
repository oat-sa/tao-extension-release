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
 * This module provides TAO extension-specific implementations of methods to ../release.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const path = require('path');
const inquirer = require('inquirer');
const taoInstanceFactory = require('../taoInstance.js');
const log = require('../log.js');

/**
 * @param {Object} params
 * @param {String} [params.releaseBranch] - branch to release to
 * @param {String} [params.wwwUser] - name of the www user
 * @param {String} [params.pathToTao] - path to the instance root
 * @param {String} [params.extensionToRelease] - name of the extension
 * @param {boolean} [params.updateTranslations=false] - should translations be included?
 * @param {boolean} [params.interactive=true] - run in interactive mode
 * @param {Object} data - copy of global data object
 */
module.exports = function extensionApiFactory(params = {}, data = { extension: {} }) {

    const { interactive, updateTranslations } = params;

    return {
        gitClient: null,

        taoInstance: null,

        /**
         * Read from the private data property
         * @returns {Object}
         */
        getData() {
            return data;
        },

        /**
         * Assign to the private data property
         * @param {Object} data
         */
        setData(newData) {
            data = newData;
        },

        /**
         * Select the target : the tao instance and the extension
         * @returns {Object}
         */
        async selectTarget() {
            await this.selectTaoInstance();
            await this.selectExtension();

            return data;
        },

        /**
         * Select and initialise tao instance
         */
        async selectTaoInstance() {
            // Start with CLI option, if it's missing we'll prompt user
            let taoRoot = params.pathToTao;

            if (!taoRoot && interactive) {
                ({ taoRoot } = await inquirer.prompt({
                    type: 'input',
                    name: 'taoRoot',
                    message: 'Path to the TAO instance : ',
                    default: data.taoRoot || process.cwd()
                }));
            }

            this.taoInstance = taoInstanceFactory(path.resolve(taoRoot || '.'), false, params.wwwUser);
            const { dir, root } = await this.taoInstance.isRoot();

            if (!root) {
                log.exit(`${dir} is not a TAO instance.`);
            }

            if (!(await this.taoInstance.isInstalled())) {
                log.exit('It looks like the given TAO instance is not installed.');
            }

            data.taoRoot = dir;
        },

        /**
         * Select and initialise the extension to release
         */
        async selectExtension() {
            if (!data.extension) {
                data.extension = {};
            }

            // Start with CLI option, if it's missing we'll prompt user
            let extension = params.extensionToRelease;

            const availableExtensions = await this.taoInstance.getExtensions();

            if (!extension && interactive) {
                ({ extension } = await inquirer.prompt({
                    type: 'list',
                    name: 'extension',
                    message: 'Which extension you want to release ? ',
                    pageSize: 12,
                    choices: availableExtensions,
                    default: data.extension.name
                }));
            }
            if (extension && !availableExtensions.includes(extension)) {
                log.exit(`Specified extension ${extension} not found in ${data.taoRoot}`);
            } else if (!extension) {
                log.exit(`Missing extension. Please set an extension using the parameter '--extension-to-release' from one available in ${data.taoRoot}.`);
            }

            data.extension.name = extension;
            data.extension.path = `${data.taoRoot}/${extension}`;
        },

        /**
         * Extract extension metadata from its metafile
         * @returns {Object}
         */
        async getMetadata() {
            const repoName = await this.taoInstance.getRepoName(data.extension.name);
            return { repoName };
        },

        /**
         * Build and push releasable assets
         * @param {String} releasingBranch
         */
        async build(releasingBranch) {
            await this.compileAssets(releasingBranch);
            await this.updateTranslations(releasingBranch);
        },

        /**
         * Compile and push extension assets
         * @param {String} releasingBranch
         */
        async compileAssets(releasingBranch) {
            log.doing('Bundling');
            log.info('Asset build started, this may take a while');

            try {
                await this.taoInstance.buildAssets(data.extension.name, false);

                const changes = await this.gitClient.commitAndPush(releasingBranch, 'chore: bundle assets');

                if (changes && changes.length) {
                    log.info(`Commit : [bundle assets - ${changes.length} files]`);
                    changes.forEach(file => log.info(`  - ${file}`));
                }
            } catch (error) {
                log.error(`Unable to bundle assets. ${error.message}. Continue.`);
            }

            log.done();
        },

        /**
         * Build and push translations
         * @param {String} releasingBranch
         */
        async updateTranslations(releasingBranch) {
            //translations runs only in interactive mode
            if (interactive && updateTranslations) {
                log.doing('Translations');
                log.warn('Update translations during a release only if you know what you are doing');

                const { runTranslations } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'runTranslations',
                    message: `${data.extension.name} needs updated translations ? `,
                    default: false
                });
                if (runTranslations) {
                    try {
                        await this.taoInstance.updateTranslations(data.extension.name);

                        const changes = await this.gitClient.commitAndPush(releasingBranch, 'chore: update translations');

                        if (changes && changes.length) {
                            log.info(`Commit : [update translations - ${changes.length} files]`);
                            changes.forEach(file => log.info(`  - ${file}`));
                        }
                    } catch (error) {
                        log.error(`Unable to update translations. ${error.message}. Continue.`);
                    }
                }

                log.done();
            }
        },

        publish() {
            // Not implemented
        },

        updateVersion() {
            // Not implemented
        }
    };
};
