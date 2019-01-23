const log = require('./src/log.js');

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
