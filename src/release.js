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
const open = require('open');
const compareVersions = require('compare-versions');
const semverGt = require('semver/functions/gt');

const config = require('./config.js')();
const github = require('./github.js');
const gitClientFactory = require('./git.js');
const log = require('./log.js');
const conventionalCommits = require('./conventionalCommits.js');

const adaptees = {
    extension : require('./release/extensionApi.js'),
    package: require('./release/packageApi.js'),
    repository: require('./release/repositoryApi.js')
};

/**
 * Get the taoExtensionRelease
 *
 * @param {Object} params
 * @param {String} [params.baseBranch] - branch to release from
 * @param {String} [params.branchPrefix] - releasing branch prefix
 * @param {String} [params.origin] - git repository origin
 * @param {String} [params.releaseBranch] - branch to release to
 * @param {String} [params.wwwUser] - name of the www user
 * @param {String} [params.pathToTao] - path to the instance root
 * @param {String} [params.extensionToRelease] - name of the extension
 * @param {String} [params.releaseVersion] - version to create
 * @param {Boolea unset: 0, commits : 0n} [params.updateTranslations] - should translations be included?
 * @param {String} [params.releaseComment] - the release author's comment
 * @param {String} [params.subjectType='extension'] - extension or package
 * @return {Object} - instance of taoExtensionRelease
 */
module.exports = function taoExtensionReleaseFactory(params = {}) {
    const { baseBranch, branchPrefix, origin, releaseBranch, releaseVersion } = params;
    const { subjectType = 'extension' } = params;
    let { releaseComment } = params;

    let data = {};
    let gitClient;
    let githubClient;

    if (!adaptees[subjectType]) {
        throw new Error(`No implementation found for the type '${subjectType}'`);
    }
    /**
     * @typedef adaptee - an instance of a supplemental API with methods specific to the release subject type
     */
    const adaptee = adaptees[subjectType](params, data);

    return {
        /**
         * Read from the private data property
         * This is to simplify unit testing
         * @returns {Object}
         */
        getData() {
            return data;
        },

        /**
         * Assign to the private data property
         * This is to simplify unit testing
         * @param {Object} data
         */
        setData(newData) {
            data = newData;
        },

        /**
         * Allows the user to specify the path to what they want to release
         */
        async selectTarget() {
            const newData = await adaptee.selectTarget();

            if (!data[subjectType]) {
                data[subjectType] = {};
            }
            data[subjectType].name = newData[subjectType].name;
            data[subjectType].path = newData[subjectType].path;

            // change root to release target
            process.chdir(data[subjectType].path);
        },

        /**
         * Initialise a client to interact with local git commands
         * The same client will be stored both here and in the adaptee
         */
        initialiseGitClient() {
            gitClient = gitClientFactory(data[subjectType].path, params.origin);
            adaptee.gitClient = gitClient;
        },

        /**
         * Fetch metadata about the extension or package from its local metafile
         * @returns {Promise} object containing metadata
         */
        async getMetadata() {
            return await adaptee.getMetadata();
        },

        /**
         * Verify that the version that we are going to release is valid
         */
        async verifyReleasingBranch() {
            const { lastVersion, lastTag } = await adaptee.verifyReleasingBranch(data.releasingBranch, data.version);
            data = { ...data, lastVersion, lastTag };
        },

        /**
         * Build assets, commit them to the releasing branch and push that branch
         *
         * @returns
         */
        async build() {
            return await adaptee.build(data.releasingBranch);
        },

        /**
         * Publish the released package
         * @returns {Promise}
         */
        async publish() {
            return await adaptee.publish();
        },

        /**
         * Check out the predefined releasing branch
         */
        async checkoutReleasingBranch() {
            const allBranches = await gitClient.getLocalBranches();

            if (allBranches.includes(data.releasingBranch)) {
                // Branch exists locally
                await gitClient.checkout(data.releasingBranch);
            } else {
                // Branch only exists remotely
                await gitClient.checkoutNonLocal(data.releasingBranch, origin);
            }
        },

        /**
         * Prompt user to confirm release
         */
        async confirmRelease() {
            const { go } = await inquirer.prompt({
                type: 'confirm',
                name: 'go',
                message: `Let's release version ${data[subjectType].name}@${data.version} 🚀 ?`
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

            // Start with CLI option, if it's missing we'll prompt user
            let comment = releaseComment;

            if (!comment || !comment.length) {
                ({ comment } = await inquirer.prompt({
                    type: 'input',
                    name: 'comment',
                    message: 'Any comment on the release ?'
                }));
            }
            const fullReleaseComment = `${comment}\n\n**Release notes :**\n${data.pr.notes}`;

            await githubClient.release(data.tag, fullReleaseComment);

            log.done();
        },

        /**
         * Create release pull request from releasing branch
         */
        async createPullRequest() {
            log.doing('Create the pull request');

            const pullRequest = await githubClient.createReleasePR(
                data.releasingBranch,
                releaseBranch,
                data.version,
                data.lastVersion,
                subjectType
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
            await gitClient.push(origin, data.releasingBranch);

            log.done(`${data.releasingBranch} created`);
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
         * Check if releasing branch exists on remote
         */
        async doesReleasingBranchExists() {
            log.doing(`Check if branch remotes/${origin}/${data.releasingBranch} exists`);

            if (await gitClient.hasBranch(`remotes/${origin}/${data.releasingBranch}`)) {
                log.exit(`The remote branch remotes/${origin}/${data.releasingBranch} already exists.`);
            }

            log.done();
        },

        /**
         * Extract release notes from release pull request
         */
        async extractReleaseNotes() {
            log.doing('Extract release notes');

            const releaseNotes = await githubClient.extractReleaseNotesFromReleasePR(data.pr.number);

            if (releaseNotes) {
                data.pr.notes = releaseNotes;

                log.info(data.pr.notes);
                log.done();
            } else {
                data.pr.notes = '';
                log.error('Unable to create the release notes. Continue.');
            }
        },

        /**
         * Initialise github client for the extension to release repository
         */
        async initialiseGithubClient() {
            const metadata = await this.getMetadata();

            if (metadata && metadata.repoName) {
                githubClient = github(data.token, metadata.repoName);
            } else {
                log.exit('Unable to find the github repository name');
            }
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
                setTimeout(() => open('https://github.com/settings/tokens'), 2000);

                const { token } = await inquirer.prompt({
                    type: 'input',
                    name: 'token',
                    message: 'I need a Github token, with "repo" rights (check your browser) : ',
                    validate: token => /[a-z0-9]{32,48}/i.test(token),
                    filter: token => token.trim()
                });

                data.token = token;

                await config.write(data);
            }

            adaptee.setData(data);
        },

        /**
         * Write the data object back to a file on disk
         * @returns true
         */
        async writeConfig() {
            await config.write(data);
            return true;
        },

        /**
         * Merge release branch back into base branch
         */
        async mergeBack() {
            log.doing(`Merging back ${releaseBranch} into ${baseBranch}`);

            try {
                await gitClient.mergeBack(baseBranch, releaseBranch);
                log.done();
            } catch (err) {
                if (err && err.message && err.message.startsWith('CONFLICTS:')) {
                    log.error(`There were conflicts preventing the merge of ${releaseBranch} back into ${baseBranch}.`);
                    log.warn(
                        'Please resolve the conflicts and complete the merge manually (including making the merge commit).'
                    );

                    const mergeDone = await this.promptToResolveConflicts();
                    if (mergeDone) {
                        if (await gitClient.hasLocalChanges()) {
                            log.exit(
                                `Cannot push changes because local branch '${baseBranch}' still has changes to commit.`
                            );
                        }
                        await gitClient.push(origin, baseBranch);
                        log.done();
                    } else {
                        log.exit(`Not able to bring ${baseBranch} up to date. Please fix it manually.`);
                    }
                } else {
                    log.exit(`An error occurred: ${err}`);
                }
            }
        },

        /**
         * Merge release pull request
         */
        async mergePullRequest() {
            setTimeout(() => open(data.pr.url), 2000);

            const { pr } = await inquirer.prompt({
                type: 'confirm',
                name: 'pr',
                message: 'Please review the release PR (you can make the last changes now). Can I merge it now ?'
            });

            if (!pr) {
                log.exit();
            }

            log.doing('Merging the pull request');

            await gitClient.mergePr(releaseBranch, data.releasingBranch);

            log.done('PR merged');
        },

        /**
         * Merge release branch into releasing branch and ask user to resolve conflicts manually if any
         */
        async mergeWithReleaseBranch() {
            log.doing(`Merging '${releaseBranch}' into '${data.releasingBranch}'.`);

            // checkout master
            await gitClient.checkout(releaseBranch);

            // pull master
            await gitClient.pull(releaseBranch);

            // checkout releasingBranch
            await this.checkoutReleasingBranch();

            try {
                // merge release branch into releasingBranch
                await gitClient.merge([releaseBranch]);

                log.done(`'${releaseBranch}' merged into '${branchPrefix}-${data.version}'.`);
            } catch (err) {
                // error is about merging conflicts
                if (err && err.message && err.message.startsWith('CONFLICTS:')) {
                    log.warn(
                        'Please resolve the conflicts and complete the merge manually (including making the merge commit).'
                    );

                    const mergeDone = await this.promptToResolveConflicts();
                    if (mergeDone) {
                        if (await gitClient.hasLocalChanges()) {
                            log.exit(
                                `Cannot push changes because local branch '${data.releasingBranch}' still has changes to commit.`
                            );
                        } else {
                            await gitClient.push(origin, data.releasingBranch);
                            log.done(`'${releaseBranch}' merged into '${branchPrefix}-${data.version}'.`);
                        }
                    } else {
                        await gitClient.abortMerge([releaseBranch]);
                        log.exit();
                    }
                } else {
                    log.exit(`An error occurred: ${err}`);
                }
            }
        },

        /**
         * Show a prompt to pause the program and make them confirm they have resolved conflicts.
         * @returns {Promise}
         */
        async promptToResolveConflicts() {
            const { isMergeDone } = await inquirer.prompt({
                name: 'isMergeDone',
                type: 'confirm',
                message: `Has the merge been completed manually? I need to push the branch to ${origin}.`,
                default: false
            });

            return isMergeDone;
        },

        /**
         * Push the releasing branch to the remote repo
         */
        async pushReleasingBranch() {
            log.doing(`Pushing branch ${data.releasingBranch}`);

            await gitClient.push(origin, data.releasingBranch);

            log.done();
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
         * Sign tags (todo, not yet implemented)
         */
        async signTags() {
            data.signtags = await gitClient.hasSignKey();
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

            log.doing(`Updating ${data[subjectType].name}`);

            // Get last released version:
            await gitClient.pull(releaseBranch);
            await gitClient.pull(baseBranch);

        },

        /**
         * Extract the version from conventionalCommits or parameters
         */
        async extractVersion() {

            const lastTag = await gitClient.getLastTag();

            let {
                recommendation,
                lastVersion,
                version,
            } = await conventionalCommits.getNextVersion(lastTag);

            if (releaseVersion) {
                if(!semverGt(releaseVersion, lastVersion)) {
                    log.exit(`The provided version is lesser than the latest version ${lastVersion}.`);
                }
                log.info(`Release version provided: ${releaseVersion}`);
            } else {

                if (recommendation.stats && recommendation.stats.commits === 0) {
                    const { releaseAgain  } = await inquirer.prompt({
                        type: 'confirm',
                        name: 'releaseAgain',
                        default : false,
                        message: 'There\'s no new commits, do you really want to release a new version?'
                    });

                    if (!releaseAgain) {
                        log.exit();
                    }
                }
                else if (recommendation.stats && recommendation.stats.unset > 0) {
                    const { acceptDefaultVersion  } = await inquirer.prompt({
                        type: 'confirm',
                        name: 'acceptDefaultVersion',
                        message: recommendation.stats.unset === recommendation.stats.commits ?
                            'The commits are non conventional. A PATCH version will be applied for the release. Do you want to continue?' :
                            'There are some non conventional commits. Are you sure you want to continue?',
                    });

                    if (!acceptDefaultVersion) {
                        log.exit();
                    }
                }

                log.info(`Last version found: ${lastVersion}`);
                log.info(`Recommended version from commits: ${version}`);
                log.info(`Reason: ${recommendation.reason}`);
            }

            version = releaseVersion || version;

            data.lastVersion = `${lastVersion}`;
            data.lastTag = `v${lastVersion}`;
            data.version = `${version}`;
            data.tag = `v${version}`;
            data.releasingBranch = `${branchPrefix}-${version}`;
        },

        /**
         * Verify if local branch has no un-commtied changes
         */
        async verifyLocalChanges() {
            log.doing(`Checking ${subjectType} status`);

            if (await gitClient.hasLocalChanges()) {
                log.exit(
                    `The ${subjectType} ${data[subjectType].name} has local changes, please clean or stash them before releasing`
                );
            }

            log.done(`${data[subjectType].name} is clean`);
        },

        /**
          * Update version in releasing repository
          */
        async updateVersion() {
            await adaptee.updateVersion();

            await gitClient.commitAndPush(data.releasingBranch, 'chore: bump version');
        }
    };
};
