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

module.exports = function extensionApiFactory(params, data) {

    return {
        gitClient: null,
        taoInstance: null,

        /**
         * Select the target : the tao instance and the extension
         * @returns {Object}
         */
        async selectTarget() {
            // Start with CLI option, if it's missing we'll prompt user
            let taoRoot = params.pathToTao;

            if (!taoRoot) {
                ({
                    taoRoot
                } = await inquirer.prompt({
                    type: 'input',
                    name: 'taoRoot',
                    message: 'Path to the TAO instance : ',
                    default: data.taoRoot || process.cwd()
                }));
            }

            this.taoInstance = taoInstanceFactory(path.resolve(taoRoot), false, params.wwwUser);

            const {
                dir,
                root
            } = await this.taoInstance.isRoot();

            if (!root) {
                log.exit(`${dir} is not a TAO instance`);
            }

            if (!await this.taoInstance.isInstalled()) {
                log.exit('It looks like the given TAO instance is not installed.');
            }

            // Start with CLI option, if it's missing we'll prompt user
            let extension = params.extensionToRelease;
            const availableExtensions = await this.taoInstance.getExtensions();

            if (extension && !availableExtensions.includes(extension)) {
                log.exit(`Specified extension ${extension} not found in ${taoRoot}`);
            } else if (!extension) {
                ({
                    extension
                } = await inquirer.prompt({
                    type: 'list',
                    name: 'extension',
                    message: 'Which extension you want to release ? ',
                    pageSize: 12,
                    choices: availableExtensions,
                    default: data.name
                }));
            }

            return {
                taoRoot,
                name: extension,
                path: `${taoRoot}/${extension}`,
            };
        },


        /**
         * Verify that the version that we are going to release is valid
         * - is the same on branch name and manifest
         * - is bigger than current release branch version.
         * @returns
         */
        async check() {
            log.doing('Checking out and verifying releasing branch.');

            // Cross check releasing branch version with manifest version
            const releasingBranchManifest = await this.taoInstance.parseManifest(`${data.extension.path}/manifest.php`);
            if (compareVersions(releasingBranchManifest.version, data.version) === 0) {
                log.doing(`Branch ${data.releasingBranch} has valid manifest.`);
            } else {
                log.exit(`Branch '${data.releasingBranch}' cannot be released because it's branch name does not match its own manifest version (${releasingBranchManifest.version}).`);
            }

            // Cross check releasing branch wth release branch and make sure new version is highest
            await this.gitClient.checkout(params.releaseBranch);
            const releaseBranchManifest = await this.taoInstance.parseManifest(`${data.extension.path}/manifest.php`);
            if (compareVersions(releasingBranchManifest.version, releaseBranchManifest.version) === 1) {
                data.lastVersion = releaseBranchManifest.version;
                data.lastTag = `v${releaseBranchManifest.version}`;

                log.done(`Branch ${data.releasingBranch} is valid.`);
            } else {
                log.exit(`Branch '${data.releasingBranch}' cannot be released because its manifest version (${data.version}) is not greater than the manifest version of '${params.releaseBranch}' (${releaseBranchManifest.version}).`);
            }

            return data;
        },

        /**
         * Compile and publish extension assets
         * Build and publish translations
         *
         */
        async build() {
            log.doing('Bundling');
            log.info('Asset build started, this may take a while');

            try {
                await this.taoInstance.buildAssets(data.extension.name, false);

                const changes = await this.gitClient.commitAndPush(data.releasingBranch, 'bundle assets');

                if (changes && changes.length) {
                    log.info(`Commit : [bundle assets - ${changes.length} files]`);
                    changes.forEach(file => log.info(`  - ${file}`));
                }
            } catch (error) {
                log.error(`Unable to bundle assets. ${error.message}. Continue.`);
            }

            log.done();

            log.doing('Translations');

            // Start with CLI option, if it's missing we'll prompt user
            let translation = params.updateTranslations;

            if (!translation) {
                log.warn('Update translations during a release only if you know what you are doing');

                ({
                    translation
                } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'translation',
                    message: `${data.extension.name} needs updated translations ? `,
                    default: false
                }));
            }

            if (translation) {
                try {
                    await this.taoInstance.updateTranslations(data.extension.name);

                    const changes = await this.gitClient.commitAndPush(data.releasingBranch, 'update translations');

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

        publish(){

        },

        async getMetadata(){
            const manifest = await this.taoInstance.parseManifest(`${data.extension.path}/manifest.php`);
            const repoName = await this.taoInstance.getRepoName(data.extension.name);
            return { ...manifest, repoName };
        }
    };
};

