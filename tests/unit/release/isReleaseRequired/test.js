/**
 *
 * Unit test the isReleaseRequired method of module src/release.js
 *
 * @copyright 2019 Open Assessment Technologies SA;
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const baseBranch = 'testBaseBranch';
const config = {
    write: () => { },
};
const extension = 'testExtension';
const gitClientInstance = {
    hasDiff: () => true,
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const log = {
    doing: () => { },
    done: () => { },
    exit: () => { },
};
const releaseBranch = 'testReleaseBranch';
const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})(baseBranch, null, null, releaseBranch);

test('should define isReleaseRequired method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.isReleaseRequired === 'function', 'The release instance has isReleaseRequired method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(log, 'doing');

    await release.isReleaseRequired();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith(`Diff ${baseBranch}..${releaseBranch}`), 1, 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should check for diffs between base and release branches', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'hasDiff').returns(true);

    await release.isReleaseRequired();

    t.equal(gitClientInstance.hasDiff.callCount, 1, 'Diffs has been checked');
    t.ok(gitClientInstance.hasDiff.calledWith(baseBranch, releaseBranch), 1, 'Diffs has been checked between apropriate branches');

    sandbox.restore();
    t.end();
});

test('should prompt about release if there is no diffs', async (t) => {
    t.plan(4);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'hasDiff').returns(false);
    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'diff', 'The param name should be diff');
        t.equal(message, `It seems there is no changes between ${baseBranch} and ${releaseBranch}. Do you want to release anyway?`, 'Should disaplay appropriate message');

        return { diff: true };
    });

    await release.isReleaseRequired();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should log exit', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'hasDiff').returns(false);
    sandbox.stub(inquirer, 'prompt').returns({ diff: false });
    sandbox.stub(log, 'exit');

    await release.isReleaseRequired();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(log, 'done');

    await release.isReleaseRequired();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
