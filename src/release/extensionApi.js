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
 * This module provides TAO extension-specific implementations of methods to ../release.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const path = require('path');
const inquirer = require('inquirer');
const compareVersions = require('compare-versions');

const taoInstanceFactory = require('../taoInstance.js');
const log = require('../log.js');

/**
 * @param {Object} params
 * @param {String} [params.releaseBranch] - branch to release to
 * @param {String} [params.wwwUser] - name of the www user
 * @param {String} [params.pathToTao] - path to the instance root
 * @param {String} [params.extensionToRelease] - name of the extension
 * @param {Boolean} [params.updateTranslations] - should translations be included?
 * @param {Object} data - copy of global data object
 */
module.exports = function extensionApiFactory(params = {}, data = { extension: {} }) {
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

            if (!taoRoot) {
                ({ taoRoot } = await inquirer.prompt({
                    type: 'input',
                    name: 'taoRoot',
                    message: 'Path to the TAO instance : ',
                    default: data.taoRoot || process.cwd()
                }));
            }

            this.taoInstance = taoInstanceFactory(path.resolve(taoRoot), false, params.wwwUser);
            const { dir, root } = await this.taoInstance.isRoot();

            if (!root) {
                log.exit(`${dir} is not a TAO instance`);
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

            if (extension && !availableExtensions.includes(extension)) {
                log.exit(`Specified extension ${extension} not found in ${data.taoRoot}`);
            } else if (!extension) {
                ({ extension } = await inquirer.prompt({
                    type: 'list',
                    name: 'extension',
                    message: 'Which extension you want to release ? ',
                    pageSize: 12,
                    choices: availableExtensions,
                    default: data.extension.name
                }));
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
         * Verify that the version that we are going to release is valid
         * - is the same on branch name and manifest
         * - is bigger than current release branch version
         * @param {String} releasingBranch
         * @returns {Object}
         */
        async verifyReleasingBranch(releasingBranch, versionToRelease) {
            log.doing('Checking out and verifying releasing branch.');

            // Cross check releasing branch version with manifest version
            const releasingBranchManifest = await this.taoInstance.parseManifest(`${data.extension.path}/manifest.php`);

            if (compareVersions(releasingBranchManifest.version, versionToRelease) === 0) {
                log.doing(`Branch ${releasingBranch} has valid manifest.`);
            } else {
                log.exit(
                    `Branch '${releasingBranch}' cannot be released because its branch name does not match its own manifest version (${releasingBranchManifest.version}).`
                );
            }

            // Cross check releasing branch wth release branch and make sure new version is highest
            await this.gitClient.checkout(params.releaseBranch);

            const releaseBranchManifest = await this.taoInstance.parseManifest(`${data.extension.path}/manifest.php`);

            if (compareVersions(releasingBranchManifest.version, releaseBranchManifest.version) === 1) {
                data.lastVersion = releaseBranchManifest.version;
                data.lastTag = `v${releaseBranchManifest.version}`;
                log.done(`Branch ${releasingBranch} is valid.`);
            } else {
                log.exit(
                    `Branch '${releasingBranch}' cannot be released because its manifest version (${versionToRelease}) is not greater than the manifest version of '${params.releaseBranch}' (${releaseBranchManifest.version}).`
                );
            }

            return data;
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
            log.doing('Translations');

            // Start with CLI option, if it's missing we'll prompt user
            let translation = params.updateTranslations;

            if (!translation) {
                log.warn('Update translations during a release only if you know what you are doing');

                ({ translation } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'translation',
                    message: `${data.extension.name} needs updated translations ? `,
                    default: false
                }));
            }

            if (translation) {
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
        },

        publish() {
            // Not implemented
        },

        updateVersion() {
            // Not implemented
        }
    };
};
