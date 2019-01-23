/**
 *
 * Unit test the compileAssets method of module src/release.js
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
    commitAndPush: () => { },
    pull: () => { }
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
    error: () => { },
    info: () => { },
};
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const version = '1.1.1';
const taoInstance = {
    buildAssets: () => { },
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({ version, name: extension })
};
const taoINstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoINstanceFactory,
    inquirer,
})(null, branchPrefix);

test('should define compileAssets method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.compileAssets === 'function', 'The release instance has compileAssets method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'doing');

    await release.compileAssets();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith('Bundling'), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should log info message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'info');

    await release.compileAssets();

    t.equal(log.info.callCount, 1, 'Info has been logged');
    t.ok(log.info.calledWith('Asset build started, this may take a while'), 'Info has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should build assets', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(taoInstance, 'buildAssets');

    await release.compileAssets();

    t.equal(taoInstance.buildAssets.callCount, 1, 'Assets has been builded');
    t.ok(taoInstance.buildAssets.calledWith(extension, false), 'Assets of apropriate extension has been builded');

    sandbox.restore();
    t.end();
});

test('should publish assets', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(gitClientInstance, 'commitAndPush');

    await release.compileAssets();

    t.equal(gitClientInstance.commitAndPush.callCount, 1, 'Assets has been published');
    t.ok(gitClientInstance.commitAndPush.calledWith(`${branchPrefix}-${version}`, 'bundle assets'), 'Assets of apropriate extension has been published');

    sandbox.restore();
    t.end();
});

test('should log error message if compilation failed', async (t) => {
    t.plan(2);

    const errorMessage = 'testError';

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'error');
    sandbox.stub(taoInstance, 'buildAssets').throws(new Error(errorMessage));

    await release.compileAssets();

    t.equal(log.error.callCount, 1, 'Error has been logged');
    t.ok(log.error.calledWith(`Unable to bundle assets. ${errorMessage}. Continue.`), 'Error has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should log info message after compilation of assets', async (t) => {
    t.plan(4);

    const changes = ['change1', 'change2'];

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'info');
    sandbox.stub(gitClientInstance, 'commitAndPush').returns(changes);

    await release.compileAssets();

    t.equal(log.info.callCount, 4, 'Info has been logged');
    t.ok(log.info.calledWith(`Commit : [bundle assets - ${changes.length} files]`), 'Info has been logged with apropriate message');
    changes.forEach(change =>
        t.ok(log.info.calledWith(`  - ${change}`), 'Info has been logged with apropriate message')
    );

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'done');

    await release.compileAssets();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
