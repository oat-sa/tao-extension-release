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
 * Unit test the mergeWithReleaseBranch method of module src/release.js
 *
 * @author Ricardo Proença <ricardo@taotesting.com>
 */

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

const sandbox = sinon.sandbox.create();

const taoRoot = 'testRoot';
const extension = 'testExtension';
const localReleasingBranch = 'release-0.9.0';
const releaseBranch = 'master';
const token = 'abc123';
const version = '0.9.0';
const tag = 'v0.9.0';

const gitClientInstance = {
    getLocalBranches: () => {},
    fetch: () => { },
    checkout: () => { },
    checkoutNonLocal: () => { },
    pull: () => { },
    merge: () => { },
    abortMerge: () => { },
    push: () => { },
    hasLocalChanges: () => { }
};

const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const log = {
    doing: () => { },
    exit: () => { },
    error: () => { },
    done: () => { },
    warn: () => { }
};

const inquirer = {
    prompt: () => ({ extension, pull: true, taoRoot }),
};

const releaseOptions = {
    branchPrefix: 'release',
    origin: 'origin',
    versionToRelease: '0.9.0',
    releaseBranch: 'master'
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './log.js': log,
    inquirer,
})(releaseOptions);

release.setData({ releasingBranch: localReleasingBranch, token, version, tag, extension: {} });

test('should define mergeWithReleaseBranch method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.mergeWithReleaseBranch === 'function', 'The release instance has mergeWithReleaseBranch method');

    t.end();
});

test('Merging release branch into releasing branch, no conflicts found', async (t) => {
    t.plan(8);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'checkout');
    sandbox.stub(gitClientInstance, 'pull');
    sandbox.stub(gitClientInstance, 'merge');
    sandbox.stub(log, 'doing');
    sandbox.stub(log, 'done');

    sandbox.stub(release, 'checkoutReleasingBranch');

    await release.mergeWithReleaseBranch();

    // Assertions
    t.equal(log.doing.callCount, 1, 'Doing message has been logged');
    t.equal(log.doing.getCall(0).args[0], `Merging '${releaseBranch}' into '${localReleasingBranch}'.`, 'Doing message has been logged with appropriate message');

    t.equal(gitClientInstance.checkout.callCount, 1, 'git checkout has been called.');
    t.ok(gitClientInstance.checkout.calledWith(releaseBranch), `Checkout ${releaseBranch} called`);

    t.equal(gitClientInstance.pull.callCount, 1, 'git pull has been called.');

    t.equal(gitClientInstance.merge.callCount, 1, 'Merge has been called due to conflicts');
    t.equal(log.done.callCount, 1, 'Done message has been logged');
    t.ok(log.done.calledWith(`'${releaseBranch}' merged into '${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease}'.`), 'Done message has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('Merging release branch into releasing branch, found conflicts and user abort merge', async (t) => {
    t.plan(13);

    await release.initialiseGitClient();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'isMergeDone', 'The param name should be isMergeDone');
        t.equal(message, `Has the merge been completed manually? I need to push the branch to ${releaseOptions.origin}.`, 'Should display appropriate message');

        return { isMergeDone: false };
    });

    sandbox.stub(gitClientInstance, 'checkout');
    sandbox.stub(gitClientInstance, 'pull');
    sandbox.stub(gitClientInstance, 'merge').throws({stack : 'Error: CONFLICTS:', message: 'CONFLICTS:'});
    sandbox.stub(gitClientInstance, 'abortMerge');
    sandbox.stub(log, 'doing');
    sandbox.stub(log, 'warn');
    sandbox.stub(log, 'exit');

    sandbox.stub(release, 'checkoutReleasingBranch');

    await release.mergeWithReleaseBranch();

    // Assertions
    t.equal(log.doing.callCount, 1, 'Doing message has been logged');
    t.ok(log.doing.calledWith(`Merging '${releaseBranch}' into '${localReleasingBranch}'.`), 'Doing message has been logged with appropriate message');

    t.equal(gitClientInstance.checkout.callCount, 1, 'git checkout has been called.');
    t.ok(gitClientInstance.checkout.calledWith(releaseBranch), `Checkout ${releaseBranch} called`);

    t.equal(gitClientInstance.pull.callCount, 1, 'git pull has been called.');

    t.equal(gitClientInstance.merge.callCount, 1, 'Merge has been called due to conflicts');

    t.equal(log.warn.callCount, 1, 'Warn message has been logged');
    t.ok(log.warn.calledWith('Please resolve the conflicts and complete the merge manually (including making the merge commit).'), 'Warn message has been logged with appropriate message');

    t.equal(gitClientInstance.abortMerge.callCount, 1, 'Abort merge has been called.');
    t.equal(log.exit.callCount, 1, 'Exit message has been logged');

    sandbox.restore();
    t.end();
});

test('Merging release branch into releasing branch, found conflicts and user proceed with merge and resolved conflicts', async (t) => {
    t.plan(15);

    await release.initialiseGitClient();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'isMergeDone', 'The param name should be isMergeDone');
        t.equal(message, `Has the merge been completed manually? I need to push the branch to ${releaseOptions.origin}.`, 'Should display appropriate message');

        return { isMergeDone: true };
    });

    sandbox.stub(gitClientInstance, 'checkout');
    sandbox.stub(gitClientInstance, 'pull');
    sandbox.stub(gitClientInstance, 'merge').throws({stack : 'Error: CONFLICTS:', message: 'CONFLICTS:'});
    sandbox.stub(gitClientInstance, 'hasLocalChanges').returns(false);
    sandbox.stub(gitClientInstance, 'push');

    sandbox.stub(log, 'doing');
    sandbox.stub(log, 'warn');
    sandbox.stub(log, 'done');

    sandbox.stub(release, 'checkoutReleasingBranch');

    await release.mergeWithReleaseBranch();

    // Assertions
    t.equal(log.doing.callCount, 1, 'Doing message has been logged');
    t.ok(log.doing.calledWith(`Merging '${releaseBranch}' into '${localReleasingBranch}'.`), 'Doing message has been logged with appropriate message');

    t.equal(gitClientInstance.checkout.callCount, 1, 'git checkout has been called.');
    t.ok(gitClientInstance.checkout.calledWith(releaseBranch), `Checkout ${releaseBranch} called`);

    t.equal(gitClientInstance.pull.callCount, 1, 'git pull has been called.');

    t.equal(gitClientInstance.merge.callCount, 1, 'Merge has been called due to conflicts');

    t.equal(log.warn.callCount, 1, 'Warn message has been logged');
    t.ok(log.warn.calledWith('Please resolve the conflicts and complete the merge manually (including making the merge commit).'), 'Warn message has been logged with appropriate message');

    t.equal(gitClientInstance.hasLocalChanges.callCount, 1, 'hasLocalChanges has been called.');
    t.equal(gitClientInstance.push.callCount, 1, 'git push has been called.');

    t.equal(log.done.callCount, 1, 'Done message has been logged');
    t.ok(log.done.calledWith(`'${releaseBranch}' merged into '${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease}'.`), 'Done message has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('Merging release branch into releasing branch, found conflicts and user proceed with merge without commiting local changes', async (t) => {
    t.plan(14);

    await release.initialiseGitClient();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'isMergeDone', 'The param name should be isMergeDone');
        t.equal(message, `Has the merge been completed manually? I need to push the branch to ${releaseOptions.origin}.`, 'Should display appropriate message');

        return { isMergeDone: true };
    });

    sandbox.stub(gitClientInstance, 'checkout');
    sandbox.stub(gitClientInstance, 'pull');
    sandbox.stub(gitClientInstance, 'merge').throws({stack : 'Error: CONFLICTS:', message: 'CONFLICTS:'});
    sandbox.stub(gitClientInstance, 'hasLocalChanges').returns(true);
    sandbox.stub(gitClientInstance, 'push');

    sandbox.stub(log, 'doing');
    sandbox.stub(log, 'warn');
    sandbox.stub(log, 'exit');

    sandbox.stub(release, 'checkoutReleasingBranch');

    await release.mergeWithReleaseBranch();

    // Assertions
    t.equal(log.doing.callCount, 1, 'Doing message has been logged');
    t.ok(log.doing.calledWith(`Merging '${releaseBranch}' into '${localReleasingBranch}'.`), 'Doing message has been logged with appropriate message');

    t.equal(gitClientInstance.checkout.callCount, 1, 'git checkout has been called.');
    t.ok(gitClientInstance.checkout.calledWith(releaseBranch), `Checkout ${releaseBranch} called`);

    t.equal(gitClientInstance.pull.callCount, 1, 'git pull has been called.');

    t.equal(gitClientInstance.merge.callCount, 1, 'Merge has been called due to conflicts');

    t.equal(log.warn.callCount, 1, 'Warn message has been logged');
    t.ok(log.warn.calledWith('Please resolve the conflicts and complete the merge manually (including making the merge commit).'), 'Warn message has been logged with appropriate message');
    t.equal(gitClientInstance.hasLocalChanges.callCount, 1, 'hasLocalChanges has been called.');

    t.equal(log.exit.callCount, 1, 'Exit message has been logged');
    t.ok(log.exit.calledWith(`Cannot push changes because local branch '${localReleasingBranch}' still has changes to commit.`), 'Exit message has been logged with appropriate message');

    sandbox.restore();
    t.end();
});
