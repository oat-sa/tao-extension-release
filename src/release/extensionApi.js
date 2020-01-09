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
const gitClientFactory = require('../git.js');
const config = require('../config.js')();
const log = require('../log.js');

module.exports = {
    /**
     * Select and initialise tao instance
     * @param {Object} params - command line params
     * @param {String} [params.pathToTao] - path to the instance root
     * @param {String} [params.wwwUser] - name of the www user
     * @param {Object} data - release subject data
     * @returns {Object}
     */
    async selectTaoInstance(params, data) {
        // Start with CLI option, if it's missing we'll prompt user
        let taoRoot = params.pathToTao;

        if (!taoRoot) {
            ( { taoRoot } = await inquirer.prompt({
                type: 'input',
                name: 'taoRoot',
                message: 'Path to the TAO instance : ',
                default: data.taoRoot || process.cwd()
            }) );
        }

        const taoInstance = taoInstanceFactory(path.resolve(taoRoot), false, params.wwwUser);

        const { dir, root } = await taoInstance.isRoot();

        if (!root) {
            log.exit(`${dir} is not a TAO instance`);
        }

        if (!await taoInstance.isInstalled()) {
            log.exit('It looks like the given TAO instance is not installed.');
        }

        data.taoRoot = dir;

        return {
            data,
            taoInstance
        };
    },

    /**
     * Select and initialise the extension to release
     * @param {Object} params - command line params
     * @param {String} [params.extensionToRelease] - name of the extension
     * @param {String} [params.origin] - git repository origin
     * @param {Object} data - release subject data
     * @param {TaoInstance} taoInstance
     * @returns {GitClient}
     */
    async selectExtension(params, data, taoInstance) {
        // Start with CLI option, if it's missing we'll prompt user
        let extension = params.extensionToRelease;
        const availableExtensions = await taoInstance.getExtensions();

        if (extension && !availableExtensions.includes(extension)) {
            log.exit(`Specified extension ${extension} not found in ${data.taoRoot}`);
        }
        else if (!extension) {
            ( { extension } = await inquirer.prompt({
                type: 'list',
                name: 'extension',
                message: 'Which extension you want to release ? ',
                pageSize: 12,
                choices: availableExtensions,
                default: data.extension && data.extension.name,
            }) );
        }

        // TODO: split
        const gitClient = gitClientFactory(`${data.taoRoot}/${extension}`, params.origin, extension);

        data.extension = {
            name: extension,
            path: `${data.taoRoot}/${extension}`,
        };

        await config.write(data);

        return {
            data,
            gitClient
        };
    },

    /**
     * Verify that the version that we are going to release is valid
     * - is the same on branch name and manifest
     * - is bigger than current release branch version.
     * @param {Object} params - command line params
     * @param {Object} data - release subject data
     * @param {TaoInstance} taoInstance
     * @param {GitClient} gitClient
     * @returns
     */
    async verifyReleasingBranch(params, data, gitClient, taoInstance) {
        log.doing('Checking out and verifying releasing branch.');

        // Cross check releasing branch version with manifest version
        const releasingBranchManifest = await taoInstance.parseManifest(`${data.extension.path}/manifest.php`);
        if (compareVersions(releasingBranchManifest.version, data.version) === 0 ) {
            log.doing(`Branch ${data.releasingBranch} has valid manifest.`);
        } else {
            log.exit(`Branch '${data.releasingBranch}' cannot be released because it's branch name does not match its own manifest version (${releasingBranchManifest.version}).`);
        }

        // Cross check releasing branch wth release branch and make sure new version is highest
        await gitClient.checkout(params.releaseBranch);
        const releaseBranchManifest = await taoInstance.parseManifest(`${data.extension.path}/manifest.php`);
        if (compareVersions(releasingBranchManifest.version, releaseBranchManifest.version) === 1 ) {
            data.lastVersion = releaseBranchManifest.version;
            data.lastTag = `v${releaseBranchManifest.version}`;

            log.done(`Branch ${data.releasingBranch} is valid.`);
        } else {
            log.exit(`Branch '${data.releasingBranch}' cannot be released because its manifest version (${data.version}) is not greater than the manifest version of '${releaseBranch}' (${releaseBranchManifest.version}).`);
        }

        return data;
    },

    /**
     * Compile and publish extension assets
     * @param {Object} data - release subject data
     * @param {TaoInstance} taoInstance
     * @param {GitClient} gitClient
     */
    async compileAssets(data, taoInstance, gitClient) {
        log.doing('Bundling');
        log.info('Asset build started, this may take a while');

        try {
            await taoInstance.buildAssets(data.extension.name, false);

            const changes = await gitClient.commitAndPush(data.releasingBranch, 'bundle assets');

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
     * Update and publish translations
     * @param {Object} params - command line params
     * @param {Boolean} [params.updateTranslations] - should translations be included?
     * @param {Object} data - release subject data
     * @param {TaoInstance} taoInstance
     * @param {GitClient} gitClient
     */
    async updateTranslations(params, data, taoInstance, gitClient) {
        log.doing('Translations');

        // Start with CLI option, if it's missing we'll prompt user
        let translation = params.updateTranslations;

        if (!translation) {
            log.warn('Update translations during a release only if you know what you are doing');

            ( { translation } = await inquirer.prompt({
                type: 'confirm',
                name: 'translation',
                message: `${data.extension.name} needs updated translations ? `,
                default: false
            }) );
        }

        if (translation) {
            try {
                await taoInstance.updateTranslations(data.extension.name);

                const changes = await gitClient.commitAndPush(data.releasingBranch, 'update translations');

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
};
