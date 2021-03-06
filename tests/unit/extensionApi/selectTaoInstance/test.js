/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2019-2021 Open Assessment Technologies SA;
 */

/**
 *
 * Unit test the selectTaoInstance method of module src/release/extensionApi.js
 *
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
    getRepoName: () => ''
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const wwwUser = 'testwwwUser';
const release = proxyquire.noCallThru().load('../../../../src/release/extensionApi.js', {
    '../log.js': log,
    '../taoInstance.js': taoInstanceFactory,
    inquirer,
})({ wwwUser, interactive: true });

test('should define selectTaoInstance method on extensionApi instance', (t) => {
    t.plan(1);

    t.ok(typeof release.selectTaoInstance === 'function', 'The extensionApi instance has selectTaoInstance method');

    t.end();
});

test('should prompt to provide path to tao instance', async (t) => {
    t.plan(5);

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message, default: defaultValue }) => {
        t.equal(type, 'input', 'The type should be "input"');
        t.equal(name, 'taoRoot', 'The param name should be taoRoot');
        t.equal(message, 'Path to the TAO instance : ', 'Should display appropriate message');
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
    t.ok(log.exit.calledWith(`${dir} is not a TAO instance.`), 'Exit message has been logged with appropriate message');

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
    t.ok(log.exit.calledWith('It looks like the given TAO instance is not installed.'), 'Exit message has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

const releaseWithCliOption = proxyquire.noCallThru().load('../../../../src/release/extensionApi.js', {
    '../log.js': log,
    '../taoInstance.js': taoInstanceFactory,
    inquirer,
})({ pathToTao: '/path/to/tao' });

test('should use CLI pathToTao instead of prompting', async (t) => {
    t.plan(3);

    sandbox.stub(inquirer, 'prompt');
    taoInstanceFactory.resetHistory();

    await releaseWithCliOption.selectTaoInstance();

    t.equal(taoInstanceFactory.callCount, 1, 'Instance has been initialised');
    t.ok(taoInstanceFactory.calledWith('/path/to/tao'), 'Instance has been initialised with CLI path');
    t.ok(inquirer.prompt.notCalled, 'No prompt shown');

    sandbox.restore();
    t.end();
});
