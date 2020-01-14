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
 * Unit test the isReleaseRequired method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const baseBranch = 'testBaseBranch';
const releaseBranch = 'testReleaseBranch';
const extension = 'testExtension';
const taoRoot = 'testRoot';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';

const gitClientInstance = {
    hasDiff: () => true,
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const log = {
    doing: () => { },
    done: () => { },
    exit: () => { },
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './log.js': log,
    inquirer,
})({ baseBranch, releaseBranch });

release.setData({ releasingBranch, token });

test('should define isReleaseRequired method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.isReleaseRequired === 'function', 'The release instance has isReleaseRequired method');

    t.end();
});

test('should check for diffs between base and release branches', async (t) => {
    t.plan(2);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'hasDiff').returns(true);

    await release.isReleaseRequired();

    t.equal(gitClientInstance.hasDiff.callCount, 1, 'Diffs has been checked');
    t.ok(gitClientInstance.hasDiff.calledWith(baseBranch, releaseBranch), 1, 'Diffs has been checked between appropriate branches');

    sandbox.restore();
    t.end();
});

test('should prompt about release if there is no diffs', async (t) => {
    t.plan(4);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'hasDiff').returns(false);
    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'diff', 'The param name should be diff');
        t.equal(message, `It seems there is no changes between ${baseBranch} and ${releaseBranch}. Do you want to release anyway?`, 'Should display appropriate message');

        return { diff: true };
    });

    await release.isReleaseRequired();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should log exit', async (t) => {
    t.plan(1);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'hasDiff').returns(false);
    sandbox.stub(inquirer, 'prompt').returns({ diff: false });
    sandbox.stub(log, 'exit');

    await release.isReleaseRequired();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.initialiseGitClient();

    sandbox.stub(log, 'done');

    await release.isReleaseRequired();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
