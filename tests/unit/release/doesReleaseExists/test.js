/**
 *
 * Unit test the doesReleaseExists method of module src/release.js
 *
 * @copyright 2019 Open Assessment Technologies SA;
 * @author Anton Tsymuk <anton@taotesting.com>
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
    hasTag: () => false
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
const taoINstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoINstanceFactory,
    inquirer,
})();

test('should define doesReleaseExists method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.doesReleaseExists === 'function', 'The release instance has doesReleaseExists method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'doing');

    await release.doesReleaseExists();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith(`Check if tag v${version} exists`), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should check if release exists', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(gitClientInstance, 'hasTag');

    await release.doesReleaseExists();

    t.equal(gitClientInstance.hasTag.callCount, 1, 'Release has been checked');
    t.ok(gitClientInstance.hasTag.calledWith(`v${version}`), 'Apropriated release has been checked');

    sandbox.restore();
    t.end();
});

test('should log exit if release exists', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'exit');
    sandbox.stub(gitClientInstance, 'hasTag').returns(true);

    await release.doesReleaseExists();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');
    t.ok(log.exit.calledWith(`The tag v${version} already exists`), 'Exit has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'done');

    await release.doesReleaseExists();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
