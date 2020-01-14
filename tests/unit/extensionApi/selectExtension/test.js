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
 * Copyright (c) 2019-2020 Open Assessment Technologies SA;
 */

/**
 *
 * Unit test the selectExtension method of module src/release/extensionApi.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
    info: () => { },
};
const origin = 'testOrigin';
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ taoRoot }),
};
const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    getRepoName: () => ''
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const extensionApi = proxyquire.noCallThru().load('../../../../src/release/extensionApi.js', {
    '../log.js': log,
    '../taoInstance.js': taoInstanceFactory,
    inquirer,
})({ origin });

test('should define selectExtension method on extensionApi instance', (t) => {
    t.plan(1);

    t.ok(typeof extensionApi.selectExtension === 'function', 'The extensionApi instance has selectExtension method');

    t.end();
});

test('should get available extensions', async (t) => {
    t.plan(1);

    await extensionApi.selectTaoInstance();

    sandbox.stub(inquirer, 'prompt').returns({ extension: '' });
    sandbox.stub(taoInstance, 'getExtensions').returns([]);

    await extensionApi.selectExtension();

    t.equal(taoInstance.getExtensions.callCount, 1, 'Avaliable extension has been received');

    sandbox.restore();
    t.end();
});

test('should prompt to select tao extension', async (t) => {
    t.plan(6);

    const availableExtensions = ['testExtensionFoo', 'testExtensionBar'];

    await extensionApi.selectTaoInstance();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message, pageSize, choices }) => {
        t.equal(type, 'list', 'The type should be "list"');
        t.equal(name, 'extension', 'The param name should be extension');
        t.equal(message, 'Which extension you want to release ? ', 'Should disaplay appropriate message');
        t.equal(pageSize, 12, 'The page size should be 12');
        t.equal(choices, availableExtensions, 'Should use avaiable extensions as choices');

        return { extension: '' };
    });
    sandbox.stub(taoInstance, 'getExtensions').returns(availableExtensions);

    await extensionApi.selectExtension();

    t.equal(inquirer.prompt.callCount, 1, 'Extension has been prompted');

    sandbox.restore();
    t.end();
});

const extensionApiWithCliOption = proxyquire.noCallThru().load('../../../../src/release/extensionApi.js', {
    '../log.js': log,
    '../taoInstance.js': taoInstanceFactory,
    inquirer,
})({ origin, extensionToRelease: 'testExtensionFoo' });

test('should use CLI extension instead of prompting', async (t) => {
    t.plan(1);

    const availableExtensions = ['testExtensionFoo', 'testExtensionBar'];

    await extensionApiWithCliOption.selectTaoInstance();

    sandbox.stub(inquirer, 'prompt');
    sandbox.stub(taoInstance, 'getExtensions').returns(availableExtensions);

    await extensionApiWithCliOption.selectExtension();

    t.ok(inquirer.prompt.notCalled, 'No prompt shown');

    sandbox.restore();
    t.end();
});

test('should log exit message when bad CLI extension provided', async (t) => {
    t.plan(2);

    const availableExtensions = ['testExtensionBaz', 'testExtensionBar'];

    await extensionApiWithCliOption.selectTaoInstance();

    sandbox.stub(taoInstance, 'getExtensions').returns(availableExtensions);
    sandbox.stub(log, 'exit');

    await extensionApiWithCliOption.selectExtension();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');
    t.ok(log.exit.calledWith('Specified extension testExtensionFoo not found in testRoot'), 'Error has been logged with apropriate message');

    sandbox.restore();
    t.end();
});
