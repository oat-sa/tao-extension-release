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

import log from '../log.js';
import commander from 'commander';
import cliOptions from './cliOptions.js';
import taoExtensionReleaseFactory from '../release.js';

const program = new commander.Command();

program
    .name('taoRelease npmReleaseMonorepo')
    .usage('[options]')
    .option(...cliOptions.debug)
    .option(...cliOptions.releaseVersion)

    // options with defaults
    .option(...cliOptions.baseBranch)
    .option(...cliOptions.branchPrefix)
    .option(...cliOptions.origin)
    .option(...cliOptions.releaseBranch)
    .option(...cliOptions.noInteractive)
    .option(...cliOptions.noWrite)

    // options which fall back to user prompts if undefined
    .option(...cliOptions.releaseComment)
    .parse(process.argv);

if (program.debug) {
    log.info(program.opts());
}

log.setExitCode(1);  //if we exit early, we assume it's an error

const release = taoExtensionReleaseFactory({ ...program.opts(), subjectType: 'package' });

async function npmRelease() {
    try {
        log.title('Release npm packages in monorepo');

        //somewhere confirm that it's a lerna monorepo, lerna is installed [npx lerna]
        //check that command is called from repo root
        //
        await release.loadConfig();
        await release.selectTarget();
        await release.initialiseGithubClient();
        await release.verifyCredentials();
        await release.writeConfig();
        await release.initialiseGitClient();
        await release.verifyLocalChanges();
        await release.signTags();
        await release.verifyBranches();
        await release.extractVersion();
        await release.extractLernaMonorepoVersion();
        await release.pruneRemoteOrigin();
        await release.doesTagExists();
        await release.doesReleasingBranchExists();
        await release.isReleaseRequired();
        await release.confirmLernaMonorepoRelease();
        await release.createReleasingBranch();
        await release.updateLernaMonorepoVersions();
        await release.createPullRequest();
        await release.extractReleaseNotes();
        await release.mergePullRequest();
        await release.createReleaseTag();
        await release.createGithubRelease();
        await release.mergeBack();
        await release.removeReleasingBranch();
        await release.publishLernaMonorepo();

        log.setExitCode(0);
        log.done('Good job!').exit();
    } catch (error) {
        log.error(error).exit();
    }
}

npmRelease();
