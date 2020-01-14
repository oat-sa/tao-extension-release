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
 * Unit test the doesTagExists method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const extension = 'testExtension';
const taoRoot = 'testRoot';
const version = '1.1.1';
const tag = 'v1.1.1';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';

const gitClientInstance = {
    pull: () => { },
    hasTag: () => false
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
};
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './log.js': log,
    inquirer,
})();

release.setData({ releasingBranch, version, tag, token });

test('should define doesTagExists method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.doesTagExists === 'function', 'The release instance has doesTagExists method');

    t.end();
});

test('should check if tag exists', async (t) => {
    t.plan(2);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'hasTag');

    await release.doesTagExists();

    t.equal(gitClientInstance.hasTag.callCount, 1, 'Tag has been checked');
    t.ok(gitClientInstance.hasTag.calledWith(`v${version}`), 'Appropriate tag has been checked');

    sandbox.restore();
    t.end();
});

test('should log exit if tag exists', async (t) => {
    t.plan(2);

    await release.initialiseGitClient();

    sandbox.stub(log, 'exit');
    sandbox.stub(gitClientInstance, 'hasTag').returns(true);

    await release.doesTagExists();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');
    t.ok(log.exit.calledWith(`The tag v${version} already exists`), 'Exit has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.initialiseGitClient();

    sandbox.stub(log, 'done');

    await release.doesTagExists();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
