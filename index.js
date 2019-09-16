#!/usr/bin/env node

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
 * Copyright (c) 2017-2019 Open Assessment Technologies SA;
 */

/**
 * CLI script entry point
 *
 * Long but linear process.
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */

const updateNotifier = require('update-notifier');

const log = require('./src/log.js');
const pkg = require('./package.json');

updateNotifier({pkg}).notify();

const commander = require('commander');
const program = new commander.Command();
program.version('0.5.0');

program
    .option('-d, --debug', 'output extra debugging')
    .option('-b, --base-branch <branch>', 'the source branch for the release', 'develop')
    .option('-p, --branch-prefix <prefix>', 'the prefix of the branch created for releasing', 'release')
    .option('-o, --origin <remotename>', 'the name of the remote repo', 'origin')
    .option('-r, --release-branch <branch>', 'the target branch for the release PR', 'master')
    .option('-u, --www-user <user>', 'the user who runs php commands', 'www-data');

program.parse(process.argv);

if (program.debug) console.log(program.opts());

const { baseBranch, branchPrefix, origin, releaseBranch, wwwUser } = program;

const release = require('./src/release')(baseBranch, branchPrefix, origin, releaseBranch, wwwUser);

async function releaseExtension() {
    try {
        log.title('TAO Extension Release');

        await release.loadConfig();
        await release.selectTaoInstance();
        await release.selectExtension();
        await release.verifyLocalChanges();
        await release.signTags();
        await release.verifyBranches();
        await release.initialiseGithubClient();
        await release.doesReleaseExists();
        await release.isReleaseRequired();
        await release.confirmRelease();
        await release.createReleasingBranch();
        await release.compileAssets();
        await release.updateTranslations();
        await release.createPullRequest();
        await release.extractReleaseNotes();
        await release.mergePullRequest();
        await release.createReleaseTag();
        await release.createGithubRelease();
        await release.mergeBack();
        await release.removeReleasingBranch();

        log.done('Good job!');
    } catch (error) {
        log.error(error);
    }
}

releaseExtension();
