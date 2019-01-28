/**
 *
 * Unit test the createReleasingBranch method of module src/release.js
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
const gitClientInstance = {
    pull: () => { },
    localBranch: () => { },
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

test('should define createReleasingBranch method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.createReleasingBranch === 'function', 'The release instance has createReleasingBranch method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'doing');

    await release.createReleasingBranch();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith('Create release branch'), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should create releasing branch', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(gitClientInstance, 'localBranch');

    await release.createReleasingBranch();

    t.equal(gitClientInstance.localBranch.callCount, 1, 'Branch has been created');
    t.ok(gitClientInstance.localBranch.calledWith(`${branchPrefix}-${version}`), 'Apropriated branch has been created');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'done');

    await release.createReleasingBranch();

    t.equal(log.done.callCount, 1, 'Done has been logged');
    t.ok(log.done.calledWith(`${branchPrefix}-${version} created`), 'Done has been logged with apropriate message');

    sandbox.restore();
    t.end();
});
