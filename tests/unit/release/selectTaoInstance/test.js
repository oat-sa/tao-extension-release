/**
 *
 * Unit test the selectTaoInstance method of module src/release.js
 *
 * @copyright 2019 Open Assessment Technologies SA;
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const inquirer = {
    prompt: () => ({}),
};
const log = {
    exit: () => { },
};
const taoInstance = {
    isInstalled: () => ({}),
    isRoot: () => ({}),
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const wwwUser = 'testwwwUser';
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})(null, null, null, null, wwwUser);

test('should define selectTaoInstance method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.selectTaoInstance === 'function', 'The release instance has selectTaoInstance method');

    t.end();
});

test('should prompt to provide path to tao instance', async (t) => {
    t.plan(5);

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message, default: defaultValue }) => {
        t.equal(type, 'input', 'The type should be "input"');
        t.equal(name, 'taoRoot', 'The param name should be taoRoot');
        t.equal(message, 'Path to the TAO instance : ', 'Should disaplay appropriate message');
        t.equal(defaultValue, path.resolve(''), 'Should provide default value');

        return { taoRoot: '' };
    });

    await release.selectTaoInstance();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should initialise taoInstance', async (t) => {
    t.plan(2);

    const taoRoot = 'testRoot';

    sandbox.stub(inquirer, 'prompt').returns({ taoRoot });
    taoInstanceFactory.resetHistory();

    await release.selectTaoInstance();

    t.equal(taoInstanceFactory.callCount, 1, 'Instance has been initialised');
    t.ok(taoInstanceFactory.calledWith(path.resolve(taoRoot), false, wwwUser), 'Instance has been initialised with proper args');

    sandbox.restore();
    t.end();
});

test('should check if under provided path there is a real tao instance', async (t) => {
    t.plan(1);

    const taoRoot = 'testRoot';

    sandbox.stub(inquirer, 'prompt').returns({ taoRoot });
    sandbox.stub(taoInstance, 'isRoot').returns({});

    await release.selectTaoInstance();

    t.equal(taoInstance.isRoot.callCount, 1, 'Path has been checked');

    sandbox.restore();
    t.end();
});

test('should log exit if provided path is not a tao root', async (t) => {
    t.plan(2);

    const taoRoot = 'testRoot';
    const dir = 'testDir';

    sandbox.stub(log, 'exit');
    sandbox.stub(inquirer, 'prompt').returns({ taoRoot });
    sandbox.stub(taoInstance, 'isRoot').returns({ dir });

    await release.selectTaoInstance();

    t.equal(log.exit.callCount, 1, 'Exit message has been logged');
    t.ok(log.exit.calledWith(`${dir} is not a TAO instance`), 'Exit message has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should check if tao instance is installed', async (t) => {
    t.plan(1);

    const taoRoot = 'testRoot';

    sandbox.stub(inquirer, 'prompt').returns({ taoRoot });
    sandbox.stub(taoInstance, 'isInstalled').returns(true);
    sandbox.stub(taoInstance, 'isRoot').returns({ root: true });

    await release.selectTaoInstance();

    t.equal(taoInstance.isInstalled.callCount, 1, 'Path has been checked');

    sandbox.restore();
    t.end();
});

test('should log exit if tao instance is not installed', async (t) => {
    t.plan(2);

    const taoRoot = 'testRoot';

    sandbox.stub(log, 'exit');
    sandbox.stub(inquirer, 'prompt').returns({ taoRoot });
    sandbox.stub(taoInstance, 'isInstalled').returns(false);
    sandbox.stub(taoInstance, 'isRoot').returns({ root: true });

    await release.selectTaoInstance();

    t.equal(log.exit.callCount, 1, 'Exit message has been logged');
    t.ok(log.exit.calledWith('It looks like the given TAO instance is not installed.'), 'Exit message has been logged with apropriate message');

    sandbox.restore();
    t.end();
});
