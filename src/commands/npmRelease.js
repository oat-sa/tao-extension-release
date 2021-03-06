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

const log = require('../log.js');

const commander = require('commander');
const program = new commander.Command();

const cliOptions = require('./cliOptions.js');

program
    .name('taoRelease npmRelease')
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

const release = require('../release.js')({ ...program.opts(), subjectType: 'package' });

async function npmRelease() {
    try {
        log.title('Release an npm package');

        await release.loadConfig();
        await release.selectTarget();
        await release.writeConfig();
        await release.initialiseGitClient();
        await release.verifyLocalChanges();
        await release.signTags();
        await release.verifyBranches();
        await release.extractVersion();
        await release.doesTagExists();
        await release.doesReleasingBranchExists();
        await release.isReleaseRequired();
        await release.confirmRelease();
        await release.createReleasingBranch();
        await release.updateVersion();
        await release.initialiseGithubClient();
        await release.createPullRequest();
        await release.extractReleaseNotes();
        await release.mergePullRequest();
        await release.createReleaseTag();
        await release.createGithubRelease();
        await release.mergeBack();
        await release.removeReleasingBranch();
        await release.publish();

        log.done('Good job!').exit();
    } catch (error) {
        log.error(error).exit();
    }
}

npmRelease();
