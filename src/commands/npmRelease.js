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

const log = require('../log.js');

const commander = require('commander');
const program = new commander.Command();

const cliOptions =  require('./cliOptions');

program // CLI OPTIONS TBD
    .name('taoRelease npmRelease')
    .usage('[options]')
    .option(...cliOptions.debug)
    // options with defaults
    .option(...cliOptions.baseBranch)
    .option(...cliOptions.branchPrefix)
    .option(...cliOptions.origin)
    .option(...cliOptions.releaseBranch)
    .option(...cliOptions.pathToPackage)
    // options which fall back to user prompts if undefined
    .option(...cliOptions.versionToRelease)
    .option(...cliOptions.releaseComment)
    .parse(process.argv);

if (program.debug) console.log(program.opts());

const release = require('../release')(program.opts());

async function createRelease() {
    try {
        log.title('TAO Extension Release: npmRelease');

        await release.loadConfig();
        // await release.selectTaoInstance(); // -> skip? // creates taoInstance, sets data.taoRoot
        // await release.selectExtension();
        await release.selectPackage(); // -> [new] takes path to package and validates it, creates npmPackage, sets data.package.{name,path}
        await release.verifyLocalChanges('package'); // generalise text
        await release.signTags();
        await release.verifyBranches('package'); // parameterise for manifest.php OR package.json
        await release.doesTagExists();
        await release.doesReleasingBranchExists();
        await release.isReleaseRequired();
        await release.confirmRelease('package'); // generalise text
        await release.createReleasingBranch();
        // await release.compileAssets(); // -> skip
        await release.buildPackage(); // -> [new] npm run build
        // await release.updateTranslations(); // -> skip

        // await release.initialiseGithubClient(); // uses data.extension.name // get repo from package.json
        // await release.createPullRequest();
        // await release.extractReleaseNotes();
        // await release.mergePullRequest();
        // await release.createReleaseTag();
        // await release.createGithubRelease();
        // await release.mergeBack();
        // await release.removeReleasingBranch();
        // await release.publishToNpm(); // -> [new]

        log.done('Good job!').exit();
    } catch (error) {
        log.error(error).exit();
    }
}

createRelease();
