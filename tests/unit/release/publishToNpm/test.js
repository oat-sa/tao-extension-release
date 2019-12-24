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
 * Copyright (c) 2019 Open Assessment Technologies SA;
 */

/**
 *
 * Unit test the publishToNpm method of module src/release.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');
const fs = require('fs');

const sandbox = sinon.sandbox.create();

const config = {
    write: () => { },
};
const gitClientInstance = {
    checkout: () => { },
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
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

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './npmPackage.js': npmPackageFactory,
    inquirer,
})({ releaseBranch });

test('should define publishToNpm method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.publishToNpm === 'function', 'The release instance has publishToNpm method');

    t.end();
});

test('should checkout releasing branch', async (t) => {
    t.plan(1);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(gitClientInstance, 'checkout').returns(Promise.resolve());
    sandbox.stub(inquirer, 'prompt').returns({ confirmPublish: true });

    await release.selectPackage();
    await release.publishToNpm();

    t.equal(gitClientInstance.checkout.callCount, 1, 'git checkout has been called');

    sandbox.restore();
    t.end();
});

test('should prompt about publishing', async (t) => {
    t.plan(5);

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

    await release.selectPackage();
    await release.publishToNpm();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');
    t.equal(log.exit.callCount, 1, 'Exit has been called');

    sandbox.restore();
    t.end();
});

test('should call npmPackage.publish', async (t) => {
    t.plan(3);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(gitClientInstance, 'checkout').returns(Promise.resolve());
    sandbox.stub(inquirer, 'prompt').returns({ confirmPublish: true });
    sandbox.stub(log, 'doing');
    sandbox.stub(npmPackage, 'publish');

    await release.selectPackage();
    await release.publishToNpm();

    t.equal(log.doing.callCount, 2, 'Doing has been logged');
    t.ok(log.doing.getCall(1).args[0].startsWith('Publishing package'), 'Doing has been logged with appropriate message');
    t.equal(npmPackage.publish.callCount, 1, 'npmPackage.publish has been called');

    sandbox.restore();
    t.end();
});
