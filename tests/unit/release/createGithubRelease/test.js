/**
 *
 * Unit test the createGithubRelease method of module src/release.js
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
    createReleasePR: () => ({ state: 'open' }),
    release: () => { },
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
const releaseComment = 'testComment';
const inquirer = {
    prompt: () => ({ extension, taoRoot, comment: releaseComment }),
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

test('should define createGithubRelease method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.createGithubRelease === 'function', 'The release instance has createGithubRelease method');

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

    await release.createGithubRelease();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith(`Creating github release ${version}`), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should prompt about release comment', async (t) => {
    t.plan(4);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'input', 'The type should be "input"');
        t.equal(name, 'comment', 'The param name should be comment');
        t.equal(message, 'Any comment on the release ?', 'Should disaplay appropriate message');


        return { comment: releaseComment };
    });

    await release.createGithubRelease();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should create release', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(githubInstance, 'release');

    await release.createGithubRelease();

    t.equal(githubInstance.release.callCount, 1, 'Github release has been created');
    t.ok(githubInstance.release.calledWith(`v${version}`), 'Github release has been created from apropriate tag');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(log, 'done');

    await release.createGithubRelease();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
