/**
 *
 * Unit test the extractReleaseNotes method of module src/release.js
 *
 * @copyright 2019 Open Assessment Technologies SA;
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const branchPrefix = 'release';
const config = {
    write: () => { },
};
const extension = 'testExtension';
const prNumber = '123';
const githubInstance = {
    extractReleaseNotesFromReleasePR: () => { },
    createReleasePR: () => ({ state: 'open', number: prNumber }),
};
const githubFactory = sandbox.stub().callsFake(() => githubInstance);
const gitClientInstance = {
    pull: () => { }
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
    info: () => { },
};
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const version = '1.1.1';
const releaseBranch = 'testReleaseBranch';
const taoInstance = {
    getExtensions: () => [],
    getRepoName: () => 'testRepo',
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({ version })
};
const taoINstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './github.js': githubFactory,
    './log.js': log,
    './taoInstance.js': taoINstanceFactory,
    inquirer,
})(null, branchPrefix, null, releaseBranch);

test('should define extractReleaseNotes method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.extractReleaseNotes === 'function', 'The release instance has extractReleaseNotes method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(log, 'doing');

    await release.extractReleaseNotes();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith('Extract release notes'), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should extract release notes', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(githubInstance, 'extractReleaseNotesFromReleasePR');

    await release.extractReleaseNotes();

    t.equal(githubInstance.extractReleaseNotesFromReleasePR.callCount, 1, 'Release notes has been extracted');
    t.ok(githubInstance.extractReleaseNotesFromReleasePR.calledWith(prNumber), 'Release notes has been extracted from apropriate pull request');

    sandbox.restore();
    t.end();
});

test('should log info message', async (t) => {
    t.plan(2);

    const releaseNotes = 'testRleaseNotes';

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(githubInstance, 'extractReleaseNotesFromReleasePR').returns(releaseNotes);
    sandbox.stub(log, 'info');

    await release.extractReleaseNotes();

    t.equal(log.info.callCount, 1, 'Info has been logged');
    t.ok(log.info.calledWith(releaseNotes), 'Info has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    const releaseNotes = 'testRleaseNotes';

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(githubInstance, 'extractReleaseNotesFromReleasePR').returns(releaseNotes);
    sandbox.stub(log, 'done');

    await release.extractReleaseNotes();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});

test('should log exit message if can not extract release notes', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(log, 'exit');

    await release.extractReleaseNotes();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');
    t.ok(log.exit.calledWith('Unable to create the release notes'), 'Exit has been logged with apropriate message');

    sandbox.restore();
    t.end();
});