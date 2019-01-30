/**
 *
 * Unit test the signTags method of module src/release.js
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
    hasSignKey: () => { },
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
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
    inquirer,
})();

test('should define signTags method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.signTags === 'function', 'The release instance has signTags method');

    t.end();
});

test('should check if there is any sign tags', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'hasSignKey');

    await release.signTags();

    t.equal(gitClientInstance.hasSignKey.callCount, 1, 'Sign tags has been checked');

    sandbox.restore();
    t.end();
});
