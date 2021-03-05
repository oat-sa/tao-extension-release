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
 * Copyright (c) 2020 Open Assessment Technologies SA;
 */

/**
 *
 * Unit test the publish method of module src/release/packageApi.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');
const fs = require('fs');

const sandbox = sinon.sandbox.create();

const log = {
    exit: () => { },
    doing: () => { },
    info: () => { },
    done: () => { },
};
const inquirer = {
    prompt: () => { },
};
const taoRoot = 'testRoot';
const releaseBranch = 'testReleaseBranch';
const packageName = 'test-package';
const npmPackage = {
    name: packageName,
    isValidPackage: () => true,
    publish: () => { }
};
const npmPackageFactory = sandbox.stub().callsFake(() => npmPackage);

const packageApiFactory = proxyquire.noCallThru().load('../../../../src/release/packageApi.js', {
    '../log.js': log,
    '../npmPackage.js': npmPackageFactory,
    inquirer,
});

const gitClientInstance = {
    checkout: () => { },
};

test('should define publish method on packageApi instance', (t) => {
    t.plan(1);

    const packageApi = packageApiFactory();
    t.ok(typeof packageApi.publish === 'function', 'The packageApi instance has publish method');

    t.end();
});

test('should checkout releasing branch', async (t) => {
    t.plan(1);

    const packageApi = packageApiFactory({ releaseBranch, interactive: true });
    packageApi.gitClient = gitClientInstance;

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(gitClientInstance, 'checkout').returns(Promise.resolve());
    sandbox.stub(inquirer, 'prompt').returns({ confirmPublish: true });

    await packageApi.selectTarget();
    await packageApi.publish();

    t.equal(gitClientInstance.checkout.callCount, 1, 'git checkout has been called');

    sandbox.restore();
    t.end();
});

test('should prompt about publishing', async (t) => {
    t.plan(5);

    const packageApi = packageApiFactory({ releaseBranch, interactive: true });
    packageApi.gitClient = gitClientInstance;

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(gitClientInstance, 'checkout').returns(Promise.resolve());
    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'confirmPublish', 'The param name should be confirmPublish');
        t.equal(message, 'Do you want to proceed with the \'npm publish\' command?', 'Should display appropriate message');
        return { confirmPublish: false };
    });
    sandbox.stub(log, 'exit');

    await packageApi.selectTarget();
    await packageApi.publish();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');
    t.equal(log.exit.callCount, 1, 'Exit has been called');

    sandbox.restore();
    t.end();
});

test('should call npmPackage.publish', async (t) => {
    t.plan(3);

    const packageApi = packageApiFactory({ releaseBranch, interactive: true });
    packageApi.gitClient = gitClientInstance;

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(gitClientInstance, 'checkout').returns(Promise.resolve());
    sandbox.stub(inquirer, 'prompt').returns({ confirmPublish: true });
    sandbox.stub(log, 'doing');
    sandbox.stub(npmPackage, 'publish');

    await packageApi.selectTarget();
    await packageApi.publish();

    t.equal(log.doing.callCount, 2, 'Doing has been logged');
    t.ok(log.doing.getCall(1).args[0].startsWith('Publishing package'), 'Doing has been logged with appropriate message');
    t.equal(npmPackage.publish.callCount, 1, 'npmPackage.publish has been called');

    sandbox.restore();
    t.end();
});


test('should not prompt in non interactive mode', async (t) => {
    t.plan(3);

    const packageApi = packageApiFactory({ releaseBranch, interactive : false });
    packageApi.gitClient = gitClientInstance;

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(gitClientInstance, 'checkout').returns(Promise.resolve());
    sandbox.stub(inquirer, 'prompt');
    sandbox.stub(log, 'doing');
    sandbox.stub(npmPackage, 'publish');

    await packageApi.selectTarget();
    await packageApi.publish();

    t.equal(log.doing.callCount, 2, 'Doing has been logged');
    t.ok(log.doing.getCall(1).args[0].startsWith('Publishing package'), 'Doing has been logged with appropriate message');
    t.equal(inquirer.prompt.callCount, 0, 'No prompt called');

    sandbox.restore();
    t.end();
});
