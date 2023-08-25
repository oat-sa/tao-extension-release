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
 * Copyright (c) 2019-2021 Open Assessment Technologies SA;
 */

import log from '../log.js';
import commander from 'commander';
import cliOptions from './cliOptions.js';
import taoExtensionReleaseFactory from '../release.js';

const program = new commander.Command();

program
    .name('taoRelease extensionRelease')
    .usage('[options]')
    .option(...cliOptions.debug)
    .option(...cliOptions.releaseVersion)

    // options with defaults
    .option(...cliOptions.baseBranch)
    .option(...cliOptions.branchPrefix)
    .option(...cliOptions.origin)
    .option(...cliOptions.releaseBranch)
    .option(...cliOptions.wwwUser)

    .option(...cliOptions.noInteractive)
    .option(...cliOptions.noWrite)

    // options which fall back to user prompts if undefined
    .option(...cliOptions.pathToTao)
    .option(...cliOptions.extensionToRelease)
    .option(...cliOptions.updateTranslations)

    .option(...cliOptions.releaseComment)
    .parse(process.argv);

if (program.debug) {
    log.info(program.opts());
}

const release = taoExtensionReleaseFactory({ ...program.opts(), subjectType: 'extension' });

async function releaseExtension() {
    try {
        log.title('Release a TAO extension');

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
        await release.pruneRemoteOrigin();
        await release.doesTagExists();
        await release.doesReleasingBranchExists();
        await release.isReleaseRequired();
        await release.confirmRelease();
        await release.createReleasingBranch();
        await release.build();
        await release.updateVersion();
        await release.createPullRequest();
        await release.extractReleaseNotes();
        await release.mergePullRequest();
        await release.createReleaseTag();
        await release.createGithubRelease();
        await release.mergeBack();
        await release.removeReleasingBranch();

        log.done('Good job!').exit();
    } catch (error) {
        log.error(error).exit();
    }
}

releaseExtension();
