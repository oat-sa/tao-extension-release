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
 * Unit test the selectReleasingBranch method of module src/release.js
 *
 * @author Ricardo Proença <ricardo@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const taoRoot = 'testRoot';
const extension = 'testExtension';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';

const gitClientInstance = {
    getLocalBranches: () => {},
    fetch: () => { },
};

const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const log = {
    doing: () => { },
    exit: () => { },
    error: () => { },
    done: () => { }
};

const inquirer = {
    prompt: () => ({ extension, pull: true, taoRoot }),
};

const releaseOptions = {
    branchPrefix: 'release',
    origin: 'origin',
    versionToRelease: '0.9.0'
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './log.js': log,
    inquirer,
})(releaseOptions);

release.setData({ releasingBranch, token, extension: {} });

test('should define selectReleasingBranch method on release instance', (t) => {
    t.plan(1);
    t.ok(typeof release.selectReleasingBranch === 'function', 'The release instance has selectReleasingBranch method');
    t.end();
});

test('Version provided but no branches found', async (t) => {
    t.plan(2);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'fetch');
    sandbox.stub(gitClientInstance, 'getLocalBranches').returns([
        'some-branch-with-weird-name',
        'remotes/origin/release-0.6.0',
        'remotes/origin/release-0.7.0',
        'remotes/origin/release-0.8.0',
        'remotes/origin/release-2.8.0.1',
        'release-0.9.0',
        'remotes/origin/release_0.9.0.5',
    ]);
    sandbox.stub(log, 'exit');

    await release.selectReleasingBranch();

    t.equal(log.exit.callCount, 1, 'Exit message has been logged');
    t.ok(log.exit.calledWith('Cannot find the branch \'remotes/origin/release-0.9.0\'.'), 'Exit message has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('version provided and found 1 branch', async (t) => {
    t.plan(2);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'fetch');
    sandbox.stub(gitClientInstance, 'getLocalBranches').returns([
        'some-branch-with-weird-name',
        'remotes/origin/release-0.7.0',
        'remotes/origin/release-0.8.0',
        'remotes/origin/release-0.9.0',
        'remotes/origin/release-0.9.0-alpha',
        'remotes/origin/release-0.9.0-beta',
        'remotes/origin/release-0.9.1.0-alpha',
        'remotes/origin/releasing-1.93.1.0-alpha',
        'remotes/origin/4.93.1.0-alpha-release'
    ]);

    sandbox.stub(log, 'done');

    await release.selectReleasingBranch();

    t.equal(log.done.callCount, 1, 'Done message has been logged');
    t.ok(log.done.calledWith('Branch release-0.9.0 is selected.'), 'Done message has been logged with appropriate message');

    sandbox.restore();
    t.end();
});
