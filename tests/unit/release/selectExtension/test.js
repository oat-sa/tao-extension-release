/**
 *
 * Unit test the selectTaoInstance method of module src/release.js
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
const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
    info: () => { },
};
const gitClientFactory = sandbox.stub();
const origin = 'testOrigin';
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ taoRoot }),
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
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})({ origin });

test('should define selectExtension method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.selectExtension === 'function', 'The release instance has selectExtension method');

    t.end();
});

test('should get available extensions', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();

    sandbox.stub(inquirer, 'prompt').returns({ extension: '' });
    sandbox.stub(taoInstance, 'getExtensions').returns([]);

    await release.selectExtension();

    t.equal(taoInstance.getExtensions.callCount, 1, 'Avaliable extension has been received');

    sandbox.restore();
    t.end();
});

test('should prompt to select tao extension', async (t) => {
    t.plan(6);

    const availableExtensions = ['testExtensionFoo', 'testExtensionBar'];

    await release.selectTaoInstance();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message, pageSize, choices }) => {
        t.equal(type, 'list', 'The type should be "list"');
        t.equal(name, 'extension', 'The param name should be extension');
        t.equal(message, 'Which extension you want to release ? ', 'Should disaplay appropriate message');
        t.equal(pageSize, 12, 'The page size should be 12');
        t.equal(choices, availableExtensions, 'Should use avaiable extensions as choices');

        return { extension: '' };
    });
    sandbox.stub(taoInstance, 'getExtensions').returns(availableExtensions);

    await release.selectExtension();

    t.equal(inquirer.prompt.callCount, 1, 'Extension has been prompted');

    sandbox.restore();
    t.end();
});

test('should create gitClient instance', async (t) => {
    t.plan(2);

    const extension = 'testExtension';

    await release.selectTaoInstance();

    sandbox.stub(inquirer, 'prompt').returns({ extension });
    sandbox.stub(taoInstance, 'getExtensions').returns([]);
    gitClientFactory.resetHistory();

    await release.selectExtension();

    t.equal(gitClientFactory.callCount, 1, 'gitClient instance has been created');
    t.ok(gitClientFactory.calledWith(`${taoRoot}/${extension}`, origin, extension), 'gitClient instance has been created with appropriate args');

    sandbox.restore();
    t.end();
});

test('should save selected extension to config', async (t) => {
    t.plan(2);

    const extension = 'testExtension';

    await release.selectTaoInstance();

    sandbox.stub(inquirer, 'prompt').returns({ extension });
    sandbox.stub(taoInstance, 'getExtensions').returns([]);
    sandbox.stub(config, 'write');

    await release.selectExtension();

    t.equal(config.write.callCount, 1, 'Config has been saved');
    t.ok(config.write.calledWith({
        extension: {
            path: `${taoRoot}/${extension}`,
            name: extension,
        },
        taoRoot,
    }), 'Extension has been saved to config');

    sandbox.restore();
    t.end();
});

const releaseWithCliOption = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})({ origin, extensionToRelease: 'testExtensionFoo' });

test('should use CLI extension instead of prompting', async (t) => {
    t.plan(3);

    const availableExtensions = ['testExtensionFoo', 'testExtensionBar'];

    await releaseWithCliOption.selectTaoInstance();

    sandbox.stub(inquirer, 'prompt');
    sandbox.stub(taoInstance, 'getExtensions').returns(availableExtensions);
    gitClientFactory.resetHistory();

    await releaseWithCliOption.selectExtension();

    t.ok(inquirer.prompt.notCalled, 'No prompt shown');
    t.equal(gitClientFactory.callCount, 1, 'gitClient instance has been created');
    t.ok(gitClientFactory.calledWith(`${taoRoot}/testExtensionFoo`, origin, 'testExtensionFoo'), 'gitClient instance has been passed CLI extension');

    sandbox.restore();
    t.end();
});

test('should log exit message when bad CLI extension provided', async (t) => {
    t.plan(2);

    const availableExtensions = ['testExtensionBaz', 'testExtensionBar'];

    await releaseWithCliOption.selectTaoInstance();

    sandbox.stub(taoInstance, 'getExtensions').returns(availableExtensions);
    sandbox.stub(log, 'exit');

    await releaseWithCliOption.selectExtension();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');
    t.ok(log.exit.calledWith(`Specified extension testExtensionFoo not found in testRoot`), 'Error has been logged with apropriate message');

    sandbox.restore();
    t.end();
});
