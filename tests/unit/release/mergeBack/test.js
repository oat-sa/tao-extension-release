/**
 *
 * Unit test the mergeBack method of module src/release.js
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
    mergeBack: () => { },
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const log = {
    doing: () => { },
    done: () => { },
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
    './taoInstance.js': taoInstanceFactory,
    './log.js': log,
    inquirer,
})({ baseBranch, releaseBranch });

test('should define mergeBack method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.mergeBack === 'function', 'The release instance has mergeBack method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(log, 'doing');

    await release.mergeBack();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith(`Merging back ${releaseBranch} into ${baseBranch}`), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should merge release branch into base branch', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'mergeBack');

    await release.mergeBack();

    t.equal(gitClientInstance.mergeBack.callCount, 1, 'Branch has been merged');
    t.ok(gitClientInstance.mergeBack.calledWith(baseBranch, releaseBranch), 'Release branch has been merged into base branch');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(log, 'done');

    await release.mergeBack();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
