/**
 *
 * Unit test the createReleaseTag method of module src/release.js
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
    tag: () => { },
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
const releaseBranch = 'testReleaseBranch';
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
})({ releaseBranch });

test('should define createReleaseTag method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.createReleaseTag === 'function', 'The release instance has createReleaseTag method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'doing');

    await release.createReleaseTag();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith(`Add and push tag v${version}`), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should create release tag', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(gitClientInstance, 'tag');

    await release.createReleaseTag();

    t.equal(gitClientInstance.tag.callCount, 1, 'Tag has been created');
    t.ok(
        gitClientInstance.tag.calledWith(
            releaseBranch,
            `v${version}`,
            `version ${version}`
        ),
        'Tag has been created with apropriate version'
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

    await release.createReleaseTag();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
