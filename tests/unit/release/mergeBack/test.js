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
 * Unit test the mergeBack method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const conflictedSummary = {
    stack: [],
    message: 'CONFLICTS: manifest.php:content'
};

const sandbox = sinon.sandbox.create();

const baseBranch = 'testBaseBranch';
const config = {
    write: () => { },
};
const extension = 'testExtension';
const gitClientInstance = {
    mergeBack: () => { },
    push: () => { },
    hasLocalChanges: () => { }
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const taoRoot = 'testRoot';
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
const releaseBranch = 'testReleaseBranch';
const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './taoInstance.js': taoInstanceFactory,
    './log.js': log,
    inquirer,
})({ baseBranch, releaseBranch });

test('should define mergeBack method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.mergeBack === 'function', 'The release instance has mergeBack method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(log, 'doing');

    await release.mergeBack();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith(`Merging back ${releaseBranch} into ${baseBranch}`), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should merge release branch into base branch', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'mergeBack');

    await release.mergeBack();

    t.equal(gitClientInstance.mergeBack.callCount, 1, 'Branch has been merged');
    t.ok(gitClientInstance.mergeBack.calledWith(baseBranch, releaseBranch), 'Release branch has been merged into base branch');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(log, 'done');

    await release.mergeBack();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});

test('should prompt if there are merge conflicts', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

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

    await release.selectTaoInstance();
    await release.selectExtension();

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

    await release.selectTaoInstance();
    await release.selectExtension();

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
