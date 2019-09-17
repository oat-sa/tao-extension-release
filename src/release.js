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
 * Copyright (c) 2019 Open Assessment Technologies SA;
 */

/**
 * This module contains methods to release a TAO extension.
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const inquirer = require('inquirer');
const opn = require('opn');
const path = require('path');

const config = require('./config.js')();
const gitClientFactory = require('./git.js');
const github = require('./github.js');
const log = require('./log.js');
const taoInstanceFactory = require('./taoInstance.js');

/**
 * Get the taoExtensionRelease
 *
 * @param {String} baseBranch - branch to release from
 * @param {String} branchPrefix - releasing branch prefix
 * @param {String} origin - git repository origin
 * @param {String} releaseBranch - branch to release to
 * @param {String} wwwUser - name of the www user
 * @return {Object} - instance of taoExtensionRelease
 */
module.exports = function taoExtensionReleaseFactory(baseBranch, branchPrefix, origin, releaseBranch, wwwUser) {
    let data = {};
    let gitClient;
    let githubClient;
    let taoInstance;

    return {
        /**
         * Compile and publish extension assets
         */
        async compileAssets() {
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
         * Prompt user to confrim release
         */
        async confirmRelease() {
            const { go } = await inquirer.prompt({
                type: 'confirm',
                name: 'go',
                message: `Let's release version ${data.extension.name}@${data.version} 🚀 ?`
            });

            if (!go) {
                log.exit();
            }
        },

        /**
         * Create release on github
         */
        async createGithubRelease() {
            log.doing(`Creating github release ${data.version}`);

            const { comment } = await inquirer.prompt({
                type: 'input',
                name: 'comment',
                message: 'Any comment on the release ?',
            });

            const releaseComment = `${comment}\n\n**Release notes :**\n${data.pr.notes}`;

            await githubClient.release(data.tag, releaseComment);

            log.done();
        },

        /**
         * Create relase pull request from releasing branch
         */
        async createPullRequest() {
            log.doing('Create the pull request');

            const pullRequest = await githubClient.createReleasePR(
                data.releasingBranch,
                releaseBranch,
                data.version,
                data.lastVersion
            );

            if (pullRequest && pullRequest.state === 'open') {
                data.pr = {
                    url: pullRequest.html_url,
                    apiUrl: pullRequest.url,
                    number: pullRequest.number,
                    id: pullRequest.id
                };

                log.info(`${data.pr.url} created`);
                log.done();
            } else {
                log.exit('Unable to create the release pull request');
            }
        },

        /**
         * Create and publish release tag
         */
        async createReleaseTag() {
            log.doing(`Add and push tag ${data.tag}`);

            await gitClient.tag(releaseBranch, data.tag, `version ${data.version}`);

            log.done();
        },

        /**
         * Create releasing branch
         */
        async createReleasingBranch() {
            log.doing('Create release branch');

            await gitClient.localBranch(data.releasingBranch);

            log.done(`${data.releasingBranch} created`);
        },

        /**
         * Extract release notes from release pull request
         */
        async extractReleaseNotes() {
            log.doing('Extract release notes');

            const releaseNotes = await githubClient
                .extractReleaseNotesFromReleasePR(data.pr.number);

            if (releaseNotes) {
                data.pr.notes = releaseNotes;

                log.info(data.pr.notes);
                log.done();
            } else {
                log.exit('Unable to create the release notes');
            }
        },

        /**
         * Initialise github client for the extension to release repository
         */
        async initialiseGithubClient() {
            const repoName = await taoInstance.getRepoName(data.extension.name);

            if (repoName) {
                githubClient = github(data.token, repoName);
            } else {
                log.exit('Unable to find the github repository name');
            }
        },

        /**
         * Check if release exists
         */
        async doesReleaseExists() {
            log.doing(`Check if tag ${data.tag} exists`);

            if (await gitClient.hasTag(data.tag)) {
                log.exit(`The tag ${data.tag} already exists`);
            }

            log.done();
        },

        /**
         * Check if release tag exists
         */
        async doesTagExists() {
            log.doing(`Check if tag ${data.tag} exists`);

            if (await gitClient.hasTag(data.tag)) {
                log.exit(`The tag ${data.tag} already exists`);
            }

            log.done();
        },

        /**
         * Check if release branch exists
         */
        async doesReleaseBranchExists() {
            log.doing(`Check if branch ${data.releaseBranch} exists`);

            if (await gitClient.hasBranch(data.releaseBranch)) {
                log.exit(`The branch ${data.releaseBranch} already exists`);
            }

            log.done();
        },

        /**
         * Check if there is any diffs between base and release branches and prompt to confirm release user if there is no diffs
         */
        async isReleaseRequired() {
            log.doing(`Diff ${baseBranch}..${releaseBranch}`);
            const hasDiff = await gitClient.hasDiff(baseBranch, releaseBranch);
            if (!hasDiff) {
                const { diff } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'diff',
                    message: `It seems there is no changes between ${baseBranch} and ${releaseBranch}. Do you want to release anyway?`
                });

                if (!diff) {
                    log.exit();
                }
            }

            log.done();
        },

        /**
         * Load and initialise release extension config
         */
        async loadConfig() {
            data = Object.assign({}, await config.load());

            // Request github token if necessary
            if (!data.token) {
                setTimeout(() => opn('https://github.com/settings/tokens'), 2000);

                const { token } = await inquirer.prompt({
                    type: 'input',
                    name: 'token',
                    message: 'I need a Github token, with "repo" rights (check your browser)  : ',
                    validate: token => /[a-z0-9]{32,48}/i.test(token),
                    filter: token => token.trim()
                });

                data.token = token;

                await config.write(data);
            }
        },

        /**
         * Merge release branch back into base branch
         */
        async mergeBack() {
            log.doing(`Merging back ${releaseBranch} into ${baseBranch}`);

            await gitClient.mergeBack(baseBranch, releaseBranch);

            log.done();
        },

        /**
         * Merge release pull request
         */
        async mergePullRequest() {
            setTimeout(() => opn(data.pr.url), 2000);

            const { pr } = await inquirer.prompt({
                type: 'confirm',
                name: 'pr',
                message: 'Please review the release PR (you can make the last changes now). Can I merge it now ?',
            });

            if (!pr) {
                log.exit();
            }

            log.doing('Merging the pull request');

            await gitClient.mergePr(releaseBranch, data.releasingBranch);

            log.done('PR merged');
        },

        /**
         * Remove releasing branch
         */
        async removeReleasingBranch() {
            log.doing('Clean up the place');

            await gitClient.deleteBranch(data.releasingBranch);

            log.done();
        },

        /**
         * Select and initialise the extension to release
         */
        async selectExtension() {
            const availableExtensions = await taoInstance.getExtensions();

            const { extension } = await inquirer.prompt({
                type: 'list',
                name: 'extension',
                message: 'Which extension you want to release ? ',
                pageSize: 12,
                choices: availableExtensions,
                default: data.extension && data.extension.name,
            });

            gitClient = gitClientFactory(`${data.taoRoot}/${extension}`, origin, extension);

            data.extension = {
                name: extension,
                path: `${data.taoRoot}/${extension}`,
            };

            await config.write(data);
        },

        /**
         * Select and initialise tao instance
         */
        async selectTaoInstance() {
            const { taoRoot } = await inquirer.prompt({
                type: 'input',
                name: 'taoRoot',
                message: 'Path to the TAO instance : ',
                default: data.taoRoot || process.cwd()
            });

            taoInstance = taoInstanceFactory(path.resolve(taoRoot), false, wwwUser);

            const { dir, root } = await taoInstance.isRoot();

            if (!root) {
                log.exit(`${dir} is not a TAO instance`);
            }

            if (!await taoInstance.isInstalled()) {
                log.exit('It looks like the given TAO instance is not installed.');
            }

            data.taoRoot = dir;
        },

        /**
         * Sign tags (todo, not yet implemented)
         */
        async signTags() {
            data.signtags = await gitClient.hasSignKey();
        },

        /**
         * Update and publish translations
         */
        async updateTranslations() {
            log.doing('Translations');
            log.warn('Update translations during a release only if you know what you are doing');

            const { translation } = await inquirer.prompt({
                type: 'confirm',
                name: 'translation',
                message: `${data.extension.name} needs updated translations ? `,
                default: false
            });

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

        /**
         * Fetch and pull branches, extract manifests and repo name
         */
        async verifyBranches() {
            const { pull } = await inquirer.prompt({
                type: 'confirm',
                name: 'pull',
                message: `Can I checkout and pull ${baseBranch} and ${releaseBranch}  ?`
            });

            if (!pull) {
                log.exit();
            }

            log.doing(`Updating ${data.extension.name}`);

            await gitClient.pull(releaseBranch);

            const { version: lastVersion } = await taoInstance.parseManifest(`${data.extension.path}/manifest.php`);
            data.lastVersion = lastVersion;
            data.lastTag = `v${lastVersion}`;

            await gitClient.pull(baseBranch);

            const manifest = await taoInstance.parseManifest(`${data.extension.path}/manifest.php`);

            data.extension = manifest;
            data.version = manifest.version;
            data.tag = `v${manifest.version}`;
            data.releasingBranch = `${branchPrefix}-${manifest.version}`;
        },

        /**
         * Verify if local branch has no uncommied changes
         */
        async verifyLocalChanges() {
            log.doing('Checking extension status');

            if (await gitClient.hasLocalChanges()) {
                log.exit(`The extension ${data.extension.name} has local changes, please clean or stash them before releasing`);
            }

            log.done(`${data.extension.name} is clean`);
        },
    };
};
