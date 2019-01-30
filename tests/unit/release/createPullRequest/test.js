/**
 *
 * Unit test the createPullRequest method of module src/release.js
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
const githubInstance = {
    createReleasePR: () => { },
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
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './github.js': githubFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})(null, branchPrefix, null, releaseBranch);

test('should define createPullRequest method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.createPullRequest === 'function', 'The release instance has createPullRequest method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();

    sandbox.stub(log, 'doing');

    await release.createPullRequest();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith('Create the pull request'), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should create pull request', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'createReleasePR');

    await release.createPullRequest();

    t.equal(githubInstance.createReleasePR.callCount, 1, 'Release pull request has been created');
    t.ok(
        githubInstance.createReleasePR.calledWith(
            `${branchPrefix}-${version}`,
            releaseBranch,
            version,
            version,
        ),
        'Release pull request has been created from releasing branch',
    );

    sandbox.restore();
    t.end();
});

test('should log info message', async (t) => {
    t.plan(2);

    const url = 'testUrl';

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'createReleasePR').returns({
        state: 'open',
        html_url: url,
    });
    sandbox.stub(log, 'info');

    await release.createPullRequest();

    t.equal(log.info.callCount, 1, 'Info has been logged');
    t.ok(log.info.calledWith(`${url} created`), 'Info has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'createReleasePR').returns({
        state: 'open',
    });
    sandbox.stub(log, 'done');

    await release.createPullRequest();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});

test('should log exit message if pull request is not created', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();

    sandbox.stub(log, 'exit');

    await release.createPullRequest();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');
    t.ok(log.exit.calledWith('Unable to create the release pull request'), 'Exit has been logged with apropriate message');

    sandbox.restore();
    t.end();
});
