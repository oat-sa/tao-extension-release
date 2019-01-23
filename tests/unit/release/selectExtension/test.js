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
const taoINstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './taoInstance.js': taoINstanceFactory,
    inquirer,
})(null, null, origin);

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
    }), 'Extesion has been saved to config');

    sandbox.restore();
    t.end();
});
