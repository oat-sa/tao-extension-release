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
const fs = require('fs');
const inquirer = require('inquirer');
const taoInstanceFactory = require('../taoInstance.js');
const log = require('../log.js');
const conventionalRecommendedBump = require('conventional-recommended-bump');
const conventionalChangelogCore = require('conventional-changelog-core');
const semverParse = require('semver/functions/parse');
const semverInc = require('semver/functions/inc');

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
    const metadata = {};
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
            if (!data.conventionalExtension) {
                data.conventionalExtension = {};
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
                    default: data.conventionalExtension.name
                }));
            }

            data.conventionalExtension.name = extension;
            data.conventionalExtension.path = `${data.taoRoot}/${extension}`;
        },

        async checkConvenionalUsage(){

        },

        async guessNextVersion(){
            await this.gitClient.fetch(['--tags']);
            const lastTag = await this.gitClient.getLastTag();
            const lastVersionObject = semverParse(lastTag);
            if( !lastVersionObject) {
                throw new Error('Unable to retrieve last version from tags');
            }
            return new Promise( (resolve, reject) => {
                conventionalRecommendedBump({
                    preset: {
                        name: 'conventionalcommits'
                    }
                }, {}, (err, recommendation) => {
                    if(err){
                        return reject(err);
                    }
                    const lastVersion = lastVersionObject.version;

                    //carefull inc mutate lastVersionObject
                    const version = semverInc(lastVersionObject, recommendation.releaseType);
                    resolve({ lastVersion, version, recommendation });
                });
            });
        },


        async buildChangelog(){
            const $chanegelog = fs.createWriteStream(path.join(data.conventionalExtension.path, 'CHANGELOG.md'), { flags : 'a' });
            return new Promise( (resolve, reject) => {
                conventionalChangelogCore({
                    preset: 'conventionalcommits',
                    append: true
                }, {
                    version: data.version
                })
                .on('error', err => reject(err))
                .on('finish', () => resolve)
                .pipe($chanegelog);
            });
        },

        /**
         * Extract extension metadata from its metafile
         * @returns {Object}
         */
        async getMetadata() {
            if(!metadata.repoName) {
                metadata.repoName = await this.taoInstance.getRepoName(data.conventionalExtension.name);
            }
            if (!metadata.lastVersion) {
                const { lastVersion, version, recommendation } = await this.guessNextVersion();
                Object.assign(metadata, {lastVersion, version, recommendation});
            }
            return metadata;
        },

        /**
         * Verify that the version that we are going to release is valid
         * - is the same on branch name and manifest
         * - is bigger than current release branch version
         * @param {String} releasingBranch
         * @returns {Object}
         */
        async verifyReleasingBranch(releasingBranch, versionToRelease) {

            //TODO check conventional commit usage
            return data;
        },

        /**
         * Build and push releasable assets
         * @param {String} releasingBranch
         */
        async build(releasingBranch) {
            //await this.compileAssets(releasingBranch);
            //await this.updateTranslations(releasingBranch);
            await this.buildChangelog();
        },

        /**
         * Compile and push extension assets
         * @param {String} releasingBranch
         */
        async compileAssets(releasingBranch) {
            log.doing('Bundling');
            log.info('Asset build started, this may take a while');

            try {
                await this.taoInstance.buildAssets(data.conventionalExtension.name, false);

                const changes = await this.gitClient.commitAndPush(releasingBranch, 'bundle assets');

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
                    message: `${data.conventionalExtension.name} needs updated translations ? `,
                    default: false
                }));
            }

            if (translation) {
                try {
                    await this.taoInstance.updateTranslations(data.conventionalExtension.name);

                    const changes = await this.gitClient.commitAndPush(releasingBranch, 'update translations');

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
        }
    };
};
