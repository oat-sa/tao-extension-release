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
 * Copyright (c) 2017 Open Assessment Technologies SA;
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

const argv = require('minimist')(process.argv.slice(2));

const baseBranch = argv['base-branch'] || 'develop';
const branchPrefix = argv['branch-prefix'] || 'release';
const origin = argv['origin'] || 'origin';
const releaseBranch = argv['release-branch'] || 'master';
const wwwUser = argv['www-user'] || 'www-data';

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
        await release.doesTagExists();
        await release.doesReleaseBranchExists();
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
