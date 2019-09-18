/**
 *
 * Unit test the doesReleaseBranchExists method of module src/release.js
 *
 * @copyright 2019 Open Assessment Technologies SA;
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const config = {
    write: () => { },
};
const extension = 'testExtension';
const gitClientInstance = {
    pull: () => { },
    hasBranch: () => false
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
};
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const branchPrefix = 'release';
const version = '1.1.1';
const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({ version })
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})(null, branchPrefix);

test('should define doesReleaseBranchExists method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.doesReleaseBranchExists === 'function', 'The release instance has doesReleaseBranchExists method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'doing');

    await release.doesReleaseBranchExists();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith(`Check if branch ${branchPrefix}-${version} exists`), 'Doing has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should check if release branch exists', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(gitClientInstance, 'hasBranch');

    await release.doesReleaseBranchExists();

    t.equal(gitClientInstance.hasBranch.callCount, 1, 'Release has been checked');
    t.ok(gitClientInstance.hasBranch.calledWith(`${branchPrefix}-${version}`), 'Appropriate release has been checked');

    sandbox.restore();
    t.end();
});

test('should log exit if release branch exists', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'exit');
    sandbox.stub(gitClientInstance, 'hasBranch').returns(true);

    await release.doesReleaseBranchExists();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');
    t.ok(log.exit.calledWith(`The branch ${branchPrefix}-${version} already exists`), 'Exit has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'done');

    await release.doesReleaseBranchExists();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});