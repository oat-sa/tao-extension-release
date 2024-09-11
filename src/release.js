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
 * Copyright (c) 2019-2024 Open Assessment Technologies SA;
 */

/**
 * This module contains methods to release a TAO extension.
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

import inquirer from 'inquirer';
import open from 'open';
import semverGt from 'semver/functions/gt.js';

import configFactory from './config.js';
import github from './github.js';
import gitClientFactory from './git.js';
import log from './log.js';
import conventionalCommits, { conventionalBumpTypes } from './conventionalCommits.js';
import semverValid from 'semver/functions/valid.js';

import extension from './release/extensionApi.js';
import packageApi from './release/packageApi.js';
import repository from './release/repositoryApi.js';
const adaptees = {
    extension,
    package: packageApi,
    repository
};
const config = configFactory();
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
 * @param {Boolean} [params.updateTranslations] - should translations be included?
 * @param {String} [params.releaseComment] - the release author's comment
 * @param {boolean} [params.interactive=true] - interactive mode
 * @param {boolean} [params.write=true] - allow to write data in host file system
 * @param {String} [params.subjectType='extension'] - extension or package
 * @param {String} [params.releaseTag] - the tag to create for the release
 * @param {String} [params.conventionalBumpType] - none|patch|minor|major
 * @param {String} [params.publish=true] - publish packages to npm
 * @return {Object} - instance of taoExtensionRelease
 */
export default function taoExtensionReleaseFactory(params = {}) {
    const {
        baseBranch,
        branchPrefix,
        origin,
        releaseVersion,
        subjectType = 'extension',
        write = true
    } = params;
    let { releaseComment, interactive = true } = params;

    let data = {};
    let gitClient;
    let githubClient;

    if (!adaptees[subjectType]) {
        throw new Error(`No implementation found for the type '${subjectType}'`);
    }

    if (releaseVersion && semverValid(releaseVersion) === null) {
        throw new Error(`'${releaseVersion}' is not a valid semver version.`);
    }

    //in non TTY shells we turn off the interactive mode
    if (!process.stdin.isTTY) {
        interactive = false;
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
         * Change a property of the params object
         * @param paramName
         * @param paramValue
         */
        setParam(paramName, paramValue) {
            params[paramName] = paramValue;
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
         * Build assets, commit them to the releasing branch and push that branch
         *
         * @returns
         */
        async build() {
            return await adaptee.build(data.releasingBranch);
        },

        /**
         * Publish the released package(s)
         * @returns {Promise}
         */
        async publish() {
            if (params.publish) {
                if (data.monorepoPackages) {
                    return await adaptee.monorepoPublish();
                } else {
                    return await adaptee.publish();
                }
            }
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
            let confirmMessage = `Let's release version ${data[subjectType].name}@${data.version} 🚀`;

            if (data.monorepoPackages) {
                for (const packageInfo of data.monorepoPackages.filter(i => !i.noChanges)) {
                    confirmMessage += `\n  ${packageInfo.packageName} ${packageInfo.lastVersion} => ${packageInfo.version}`;
                }
            }

            if (interactive) {
                const { go } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'go',
                    message: `${confirmMessage}?`
                });

                if (!go) {
                    log.exit();
                }
            } else {
                log.info(confirmMessage);
            }
        },

        /**
         * Create release on github
         */
        async createGithubRelease() {
            log.doing(`Creating github release ${data.version}`);

            // Start with CLI option, if it's missing we'll prompt user
            let comment = releaseComment || '';

            if (interactive && (!comment || !comment.length)) {
                ({ comment } = await inquirer.prompt({
                    type: 'input',
                    name: 'comment',
                    message: 'Any comment on the release ?'
                }));
            }
            let fullReleaseComment = `${comment}\n\n**Release notes :**\n${data.pr.notes}`;

            if (data.monorepoPackages && params.conventionalBumpType !== conventionalBumpTypes.none) {
                fullReleaseComment += [
                    '\n```',
                    data.monorepoPackages
                        .map(i => `"${i.packageName}": ${i.version}`)
                        .join('\n'),
                    '```'
                ].join('\n');
            }

            await githubClient.release(data.tag, fullReleaseComment);

            log.done();
        },

        /**
         * Create release pull request from releasing branch
         */
        async createPullRequest() {
            log.doing('Create the pull request');

            try {
                const pullRequest = await githubClient.createReleasePR(
                    data.releasingBranch,
                    params.releaseBranch,
                    data.version,
                    data.lastVersion,
                    subjectType,
                );
                if (pullRequest && pullRequest.state === 'open') {
                    data.pr = {
                        url: pullRequest.html_url,
                        apiUrl: pullRequest.url,
                        number: pullRequest.number,
                        id: pullRequest.id,
                        full_name: pullRequest.head.repo.full_name,
                    };
                    const labels = ['releases'];
                    await githubClient.addLabel(data.pr.full_name, data.pr.number, labels);
                    log.info(`${data.pr.url} created`);
                    log.done();
                } else {
                    log.exit('Unable to create the release pull request');
                }
            } catch (err) {
                log.error(
                    'There are errors on the pull request creation, things like: '
                    + 'the repository name and/or local changes that could prevent the PR '
                    + `from going through, context: ${data.package}, error: ${err}`
                );
                log.exit(
                    'Please remove the release branch remotely/locally and try again. Also '
                    + 'please check this page on confluence that will help you with hints about '
                    + 'releasing it manually: https://oat-sa.atlassian.net/wiki/spaces/OAT/pages/2292646061/Troubleshoot+of+failing+releases'
                );
            }
        },

        /**
         * Create and publish release tag
         */
        async createReleaseTag() {
            log.doing(`Add and push tag ${data.tag}`);

            await gitClient.tag(params.releaseBranch, data.tag, `version ${data.version}`);

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
         * Prune no longer existing branches in the remote origin
         */
        async pruneRemoteOrigin() {
            log.doing('Pruning the remote branches');

            await gitClient.pruneRemote(origin);

            log.done('Remote branches pruned');
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
         * Check if the github token credentials are valid
         */
        async verifyCredentials() {
            log.doing('Checking the GitHub token before we go anywhere');

            if (await githubClient.verifyRepository()) {
                log.done();
            }
        },

        /**
         * Check if there is any diffs between base and release branches and prompt to confirm release user if there is no diffs
         */
        async isReleaseRequired() {
            log.doing(`Diff ${baseBranch}..${params.releaseBranch}`);
            const hasDiff = await gitClient.hasDiff(baseBranch, params.releaseBranch);
            const diffMessage = `It seems there is no changes between ${baseBranch} and ${params.releaseBranch}.`;
            if (!hasDiff) {

                if (interactive) {
                    const { diff } = await inquirer.prompt({
                        type: 'confirm',
                        name: 'diff',
                        message: `${diffMessage} Do you want to release anyway?`
                    });

                    if (!diff) {
                        log.exit();
                    }
                } else {
                    log.exit(`${diffMessage}. Nothing to release.`);
                }
            }

            log.done();
        },

        /**
         * Load and initialise release extension config
         */
        async loadConfig() {
            data = Object.assign({}, await config.load());

            if (!data.token && process.env.GITHUB_TOKEN) {
                data.token = process.env.GITHUB_TOKEN;
            }
            // Request github token if necessary
            if (!data.token) {

                if (!interactive) {
                    return log.exit('Unable to find the GITHUB_TOKEN. Please configure a token in the config file or set it as an env variable.');
                }
                setTimeout(() => open('https://github.com/settings/tokens'), 2000);

                const { token } = await inquirer.prompt({
                    type: 'input',
                    name: 'token',
                    message: 'I need a Github token, with "repo" rights (check your browser) : ',
                    validate: token => /[a-z0-9]{32,48}/i.test(token),
                    filter: token => token.trim()
                });

                data.token = token;
            }
            await this.writeConfig();

            adaptee.setData(data);
        },

        /**
         * Write the data object back to a file on disk
         * @returns true
         */
        async writeConfig() {
            if (write) {
                await config.write(data);
            }
            return true;
        },

        /**
         * Merge release branch back into base branch
         */
        async mergeBack() {
            log.doing(`Merging back ${params.releaseBranch} into ${baseBranch}`);

            try {
                await gitClient.mergeBack(baseBranch, params.releaseBranch);
                log.done();
            } catch (err) {
                if (err && err.message && err.message.startsWith('CONFLICTS:') && interactive) {
                    log.error(`There were conflicts preventing the merge of ${params.releaseBranch} back into ${baseBranch}.`);
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
            if (interactive) {
                setTimeout(() => open(data.pr.url), 2000);

                const { pr } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'pr',
                    message: 'Please review the release PR (you can make the last changes now). Can I merge it now ?'
                });

                if (!pr) {
                    log.exit();
                }
            }

            log.doing('Merging the pull request');

            await gitClient.mergePr(params.releaseBranch, data.releasingBranch);

            log.done('PR merged');
        },

        /**
         * Merge release branch into releasing branch and ask user to resolve conflicts manually if any
         */
        async mergeWithReleaseBranch() {
            log.doing(`Merging '${params.releaseBranch}' into '${data.releasingBranch}'.`);

            // checkout master
            await gitClient.checkout(params.releaseBranch);

            // pull master
            await gitClient.pull(params.releaseBranch);

            // checkout releasingBranch
            await this.checkoutReleasingBranch();

            try {
                // merge release branch into releasingBranch
                await gitClient.merge([params.releaseBranch]);

                log.done(`'${params.releaseBranch}' merged into '${branchPrefix}-${data.version}'.`);
            } catch (err) {
                // error is about merging conflicts
                if (err && err.message && err.message.startsWith('CONFLICTS:') && interactive) {
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
                            log.done(`'${params.releaseBranch}' merged into '${branchPrefix}-${data.version}'.`);
                        }
                    } else {
                        await gitClient.abortMerge([params.releaseBranch]);
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
            if (!interactive) {
                return false;
            }
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

            try {
                await gitClient.deleteBranch(data.releasingBranch);
            } catch (error) {
                // If a github setting auto-deleted the closed PR branch on the remote before this step,
                // these are some of the observed error messages
                if (error.message.includes('remote ref does not exist') || error.message.includes('unable to resolve reference')) {
                    log.warn(`Cannot delete branch ${data.releasingBranch}: ${error} - ${error.stack}`);
                } else {
                    throw error;
                }
            }

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
            let releaseBranchTracked = await gitClient.getReleaseBranchName(params.releaseBranch);
            if (releaseBranchTracked && releaseBranchTracked !== params.releaseBranch) {
                this.setParam('releaseBranch', releaseBranchTracked);
            }

            if (interactive) {
                const { pull } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'pull',
                    message: `Can I checkout and pull ${baseBranch} and ${params.releaseBranch}  ?`
                });

                if (!pull) {
                    log.exit();
                }
            }

            log.doing(`Updating ${data[subjectType].name}`);

            // Get last released version:
            await gitClient.pull(params.releaseBranch);
            await gitClient.pull(baseBranch);
        },

        /**
         * Extract the version from conventionalCommits or parameters
         */
        async extractVersion() {
            if (params.conventionalBumpType && !Object.values(conventionalBumpTypes).includes(params.conventionalBumpType)) {
                throw new TypeError(`Invalid value of conventional-bump-type. Should be one of: "${Object.values(conventionalBumpTypes).join(', ')}", or not specified`);
            }

            let lastTag;
            let lastVersion;
            if (params.releaseTag) {
                // if npm, tags don't have to be semver-compliant. `lastVersion` can be read from root package.json (of base branch)
                const metadata = await this.getMetadata();
                lastVersion = metadata.version;
            }
            if (!lastVersion) {
                lastTag = await gitClient.getLastTag();
                lastVersion = conventionalCommits.getVersionFromTag(lastTag);
            }

            let recommendation;
            let version;
            if (params.conventionalBumpType && params.conventionalBumpType !== conventionalBumpTypes.none) {
                version = conventionalCommits.incrementVersion(lastVersion, params.conventionalBumpType);
                recommendation = { reason: `fixed bump to "${params.conventionalBumpType}"` };
            } else {
                const convNext = await conventionalCommits.getNextVersion(lastVersion);
                version = convNext.version;
                recommendation = convNext.recommendation;
            }

            if (releaseVersion) {
                if (!semverGt(releaseVersion, lastVersion)) {
                    log.exit(`The provided version is lesser than the latest version ${lastVersion}.`);
                }
                log.info(`Release version provided: ${releaseVersion}`);
            } else {

                if (interactive) {
                    if (recommendation.stats && recommendation.stats.commits === 0) {
                        const { releaseAgain } = await inquirer.prompt({
                            type: 'confirm',
                            name: 'releaseAgain',
                            default: false,
                            message: 'There\'s no new commits, do you really want to release a new version?'
                        });

                        if (!releaseAgain) {
                            log.exit();
                        }
                    }
                    else if (recommendation.stats && recommendation.stats.unset > 0) {
                        const { acceptDefaultVersion } = await inquirer.prompt({
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
                }

                log.info(`Last version found: ${lastVersion}`);
                log.info(`Recommended version from commits: ${version}`);
                log.info(`Reason: ${recommendation.reason}`);
            }

            version = releaseVersion || version;

            data.lastVersion = `${lastVersion}`;
            data.lastTag = lastTag;
            data.version = `${version}`;
            data.tag = params.releaseTag || `v${version}`;
            data.releasingBranch = `${branchPrefix}-${version}`;
        },

        /**
         * For monorepo,
         * extract the version of packages, from conventionalCommits or parameters
         * @returns {Promise}
         */
        async extractMonorepoVersions() {
            /**
             * @typedef {Object} PackageInfo
             * @property {Object} packageName
             * @property {String} packagePath - path to the package, relative to repository root
             * @property {String} lastVersion - current version
             * @property {String} version - new version; will be calculated and added here
             * @property {String[]} dependencies - list of related monorepo package names
             */
            /**
             * @type {PackageInfo[]}
             */
            let packagesInfo = await adaptee.monorepoGetPackagesList();

            //calculate next version for each package (own changes)
            for (const packageInfo of packagesInfo) {
                if (params.conventionalBumpType === conventionalBumpTypes.none) {
                    //update versions manually once PR is opened
                    packageInfo.noChanges = true;
                    packageInfo.recommendation = { reason: 'no bump' };
                    packageInfo.version = packageInfo.lastVersion;
                } else if (params.conventionalBumpType) {
                    //same fixed bump for all packages
                    const version = conventionalCommits.incrementVersion(packageInfo.lastVersion, params.conventionalBumpType);
                    packageInfo.recommendation = { reason: `fixed bump to "${params.conventionalBumpType}"` };
                    packageInfo.version = version;
                } else {
                    //from conventional commits which change files in this package
                    const { version, recommendation } = await conventionalCommits.getNextVersion(packageInfo.lastVersion, packageInfo.packagePath);
                    packageInfo.recommendation = recommendation;
                    if (recommendation.stats && recommendation.stats.commits === 0) {
                        packageInfo.noChanges = true;
                        packageInfo.version = packageInfo.lastVersion;
                    } else {
                        packageInfo.version = version;
                    }
                }
            }

            //calculate next version for each package (no own changes, only dependency update = 'patch' bump)
            for (const packageInfo of packagesInfo) {
                if (packageInfo.noChanges && packageInfo.dependencies.some(i =>
                    !packagesInfo.find(k => k.packageName === i).noChanges)
                ) {
                    packageInfo.recommendation = { reason: 'dependency update' };
                    packageInfo.version = conventionalCommits.incrementVersion(packageInfo.lastVersion, 'patch');
                    delete packageInfo.noChanges;
                }
            }

            //log result
            log.info('Monorepo package versions:');
            for (const packageInfo of packagesInfo) {
                log.info(`  Package: ${packageInfo.packageName}`);
                log.info(`    Last version found: ${packageInfo.lastVersion}`);
                if (packageInfo.noChanges) {
                    log.info('    No changes');
                } else {
                    log.info(`    Recommended version from commits: ${packageInfo.version}`);
                }
                log.info(`    Reason: ${packageInfo.recommendation.reason}`);
            }

            data.monorepoPackages = packagesInfo;
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
          * Update version(s) in releasing repository
          */
        async updateVersion() {
            if (data.monorepoPackages) {
                await adaptee.monorepoUpdateVersions(data.monorepoPackages.filter(i => !i.noChanges));
            } else {
                await adaptee.updateVersion();
            }

            await gitClient.commitAndPush(data.releasingBranch, 'chore: bump version');
        },
    };
}