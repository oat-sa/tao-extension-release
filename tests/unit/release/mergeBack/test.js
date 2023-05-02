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
 * Unit test the mergeBack method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

const conflictedSummary = {
    stack: [],
    message: 'CONFLICTS: manifest.php:content'
};

const sandbox = sinon.sandbox.create();

const baseBranch = 'testBaseBranch';
const releaseBranch = 'testReleaseBranch';
const extension = 'testExtension';
const taoRoot = 'testRoot';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';

const gitClientInstance = {
    mergeBack: () => { },
    push: () => { },
    hasLocalChanges: () => { }
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const log = {
    doing: () => { },
    done: () => { },
    error: () => { },
    exit: () => { },
    info: () => { },
    warn: () => { }
};
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './log.js': log,
    inquirer,
})({ baseBranch, releaseBranch });

release.setData({ releasingBranch, token, extension: {} });

test('should define mergeBack method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.mergeBack === 'function', 'The release instance has mergeBack method');

    t.end();
});

test('should merge release branch into base branch', async (t) => {
    t.plan(2);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'mergeBack');

    await release.mergeBack();

    t.equal(gitClientInstance.mergeBack.callCount, 1, 'Branch has been merged');
    t.ok(gitClientInstance.mergeBack.calledWith(baseBranch, releaseBranch), 'Release branch has been merged into base branch');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.initialiseGitClient();

    sandbox.stub(log, 'done');

    await release.mergeBack();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});

test('should prompt if there are merge conflicts', async (t) => {
    t.plan(2);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'mergeBack').throws(conflictedSummary);
    sandbox.stub(release, 'promptToResolveConflicts');
    sandbox.resetHistory();

    await release.mergeBack();

    t.equal(gitClientInstance.mergeBack.callCount, 1, 'git.mergeBack was called');
    t.equal(release.promptToResolveConflicts.callCount, 1, 'promptToResolveConflicts was called');

    sandbox.restore();
    t.end();
});

test('should push and log done if prompt accepted', async (t) => {
    t.plan(4);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'mergeBack').throws(conflictedSummary);
    sandbox.stub(gitClientInstance, 'push');
    sandbox.stub(gitClientInstance, 'hasLocalChanges').returns(false);
    sandbox.stub(release, 'promptToResolveConflicts').returns(true);
    sandbox.stub(log, 'done');
    sandbox.resetHistory();

    await release.mergeBack();

    t.equal(gitClientInstance.mergeBack.callCount, 1, 'git.mergeBack was called');
    t.equal(release.promptToResolveConflicts.callCount, 1, 'promptToResolveConflicts was called');
    t.equal(gitClientInstance.push.callCount, 1, 'git.push was called');
    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});

test('should log exit if prompt rejected', async (t) => {
    t.plan(5);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'mergeBack').throws(conflictedSummary);
    sandbox.stub(gitClientInstance, 'push');
    sandbox.stub(release, 'promptToResolveConflicts').returns(false);
    sandbox.stub(log, 'done');
    sandbox.stub(log, 'exit');
    sandbox.resetHistory();

    await release.mergeBack();

    t.equal(gitClientInstance.mergeBack.callCount, 1, 'git.mergeBack was called');
    t.equal(release.promptToResolveConflicts.callCount, 1, 'promptToResolveConflicts was called');
    t.equal(gitClientInstance.push.callCount, 0, 'git.push was not called');
    t.equal(log.done.callCount, 0, 'Done has not been logged');
    t.equal(log.exit.callCount, 1, 'Exit has been logged');

    sandbox.restore();
    t.end();
});
