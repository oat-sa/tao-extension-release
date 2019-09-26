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
 * Unit test the verifyReleasingBranch method of module src/release.js
 *
 * @author Ricardo Proença <ricardo@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const config = {
    write: () => { },
};

const gitClientInstance = {
    getLocalBranches: () => {},
    fetch: () => { },
    checkout: () => { },
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

const taoRoot = 'testRoot';
const extension = 'testExtension';

const inquirer = {
    prompt: () => ({ extension, pull: true, taoRoot }),
};

const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({}),
};

const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);

const releaseOptions = {
    branchPrefix: 'release',
    origin: 'origin',
    versionToRelease: '0.9.0',
    releaseBranch: 'master'
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})(releaseOptions);

const releasingBranch = 'remotes/origin/release-0.9.0';
const releaseBranch = 'master';

test('should define mergeWithReleaseBranch method on release instance', (t) => {
    t.plan(1);
    t.ok(typeof release.mergeWithReleaseBranch === 'function', 'The release instance has mergeWithReleaseBranch method');
    t.end();
});

test('Merging release branch into releasing branch, no conflicts found', async (t) => {
    t.plan(9);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'getLocalBranches').returns([releasingBranch]);

    await release.selectReleasingBranch();

    sandbox.stub(taoInstance, 'parseManifest').returns({ version: '0.9.0'});

    await release.verifyReleasingBranch();

    sandbox.stub(gitClientInstance, 'checkout');
    sandbox.stub(gitClientInstance, 'pull');
    sandbox.stub(gitClientInstance, 'merge');
    sandbox.stub(log, 'doing');
    sandbox.stub(log, 'done');

    await release.mergeWithReleaseBranch();

    // Assertions
    t.equal(log.doing.callCount, 1, 'Doing message has been logged');
    t.ok(log.doing.calledWith(`Merging '${releaseBranch}' into '${releasingBranch}'.`), 'Doing message has been logged with apropriate message');

    t.equal(gitClientInstance.checkout.callCount, 2, 'git checkout has been called.');
    t.ok(gitClientInstance.checkout.calledWith(releaseBranch), `Checkout ${releaseBranch} called`);
    t.ok(gitClientInstance.checkout.calledWith(`${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease}`), `Checkout ${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease} has been called`);

    t.equal(gitClientInstance.pull.callCount, 1, 'git pull has been called.');

    t.equal(gitClientInstance.merge.callCount, 1, 'Merge has been called due to conflicts');
    t.equal(log.done.callCount, 1, 'Done message has been logged');
    t.ok(log.done.calledWith(`'${releaseBranch}' merged into '${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease}'.`), 'Done message has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('Merging release branch into releasing branch, found conflicts and user abort merge', async (t) => {
    t.plan(14);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'getLocalBranches').returns([releasingBranch]);

    await release.selectReleasingBranch();

    sandbox.stub(taoInstance, 'parseManifest').returns({ version: '0.9.0'});

    await release.verifyReleasingBranch();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'isMergeDone', 'The param name should be isMergeDone');
        t.equal(message, `Has the merge been completed manually? I need to push the branch to ${releaseOptions.origin}.`, 'Should disaplay appropriate message');

        return { isMergeDone: false };
    });

    sandbox.stub(gitClientInstance, 'checkout');
    sandbox.stub(gitClientInstance, 'pull');
    sandbox.stub(gitClientInstance, 'merge').throws({stack : 'Error: CONFLICTS:', message: 'CONFLICTS:'});
    sandbox.stub(gitClientInstance, 'abortMerge');
    sandbox.stub(log, 'doing');
    sandbox.stub(log, 'warn');
    sandbox.stub(log, 'exit');

    await release.mergeWithReleaseBranch();

    // Assertions
    t.equal(log.doing.callCount, 1, 'Doing message has been logged');
    t.ok(log.doing.calledWith(`Merging '${releaseBranch}' into '${releasingBranch}'.`), 'Doing message has been logged with apropriate message');

    t.equal(gitClientInstance.checkout.callCount, 2, 'git checkout has been called.');
    t.ok(gitClientInstance.checkout.calledWith(releaseBranch), `Checkout ${releaseBranch} called`);
    t.ok(gitClientInstance.checkout.calledWith(`${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease}`), `Checkout ${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease} has been called`);

    t.equal(gitClientInstance.pull.callCount, 1, 'git pull has been called.');

    t.equal(gitClientInstance.merge.callCount, 1, 'Merge has been called due to conflicts');

    t.equal(log.warn.callCount, 1, 'Warn message has been logged');
    t.ok(log.warn.calledWith('Please resolve the conflicts and complete the merge manually (including making the merge commit).'), 'Warn message has been logged with apropriate message');

    t.equal(gitClientInstance.abortMerge.callCount, 1, 'Abort merge has been called.');
    t.equal(log.exit.callCount, 1, 'Exit message has been logged');

    sandbox.restore();
    t.end();
});

test('Merging release branch into releasing branch, found conflicts and user proceed with merge and resolved conflicts', async (t) => {
    t.plan(16);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'getLocalBranches').returns([releasingBranch]);

    await release.selectReleasingBranch();

    sandbox.stub(taoInstance, 'parseManifest').returns({ version: '0.9.0'});

    await release.verifyReleasingBranch();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'isMergeDone', 'The param name should be isMergeDone');
        t.equal(message, `Has the merge been completed manually? I need to push the branch to ${releaseOptions.origin}.`, 'Should disaplay appropriate message');

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

    await release.mergeWithReleaseBranch();

    // Assertions
    t.equal(log.doing.callCount, 1, 'Doing message has been logged');
    t.ok(log.doing.calledWith(`Merging '${releaseBranch}' into '${releasingBranch}'.`), 'Doing message has been logged with apropriate message');

    t.equal(gitClientInstance.checkout.callCount, 2, 'git checkout has been called.');
    t.ok(gitClientInstance.checkout.calledWith(releaseBranch), `Checkout ${releaseBranch} called`);
    t.ok(gitClientInstance.checkout.calledWith(`${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease}`), `Checkout ${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease} has been called`);

    t.equal(gitClientInstance.pull.callCount, 1, 'git pull has been called.');

    t.equal(gitClientInstance.merge.callCount, 1, 'Merge has been called due to conflicts');

    t.equal(log.warn.callCount, 1, 'Warn message has been logged');
    t.ok(log.warn.calledWith('Please resolve the conflicts and complete the merge manually (including making the merge commit).'), 'Warn message has been logged with apropriate message');

    t.equal(gitClientInstance.hasLocalChanges.callCount, 1, 'hasLocalChanges has been called.');
    t.equal(gitClientInstance.push.callCount, 1, 'git push has been called.');

    t.equal(log.done.callCount, 1, 'Done message has been logged');
    t.ok(log.done.calledWith(`'${releaseBranch}' merged into '${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease}'.`), 'Done message has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('Merging release branch into releasing branch, found conflicts and user proceed with merge without commiting local changes', async (t) => {
    t.plan(15);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'getLocalBranches').returns([releasingBranch]);

    await release.selectReleasingBranch();

    sandbox.stub(taoInstance, 'parseManifest').returns({ version: '0.9.0'});

    await release.verifyReleasingBranch();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'isMergeDone', 'The param name should be isMergeDone');
        t.equal(message, `Has the merge been completed manually? I need to push the branch to ${releaseOptions.origin}.`, 'Should disaplay appropriate message');

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

    await release.mergeWithReleaseBranch();

    // Assertions
    t.equal(log.doing.callCount, 1, 'Doing message has been logged');
    t.ok(log.doing.calledWith(`Merging '${releaseBranch}' into '${releasingBranch}'.`), 'Doing message has been logged with apropriate message');

    t.equal(gitClientInstance.checkout.callCount, 2, 'git checkout has been called.');
    t.ok(gitClientInstance.checkout.calledWith(releaseBranch), `Checkout ${releaseBranch} called`);
    t.ok(gitClientInstance.checkout.calledWith(`${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease}`), `Checkout ${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease} has been called`);

    t.equal(gitClientInstance.pull.callCount, 1, 'git pull has been called.');

    t.equal(gitClientInstance.merge.callCount, 1, 'Merge has been called due to conflicts');

    t.equal(log.warn.callCount, 1, 'Warn message has been logged');
    t.ok(log.warn.calledWith('Please resolve the conflicts and complete the merge manually (including making the merge commit).'), 'Warn message has been logged with apropriate message');
    t.equal(gitClientInstance.hasLocalChanges.callCount, 1, 'hasLocalChanges has been called.');

    t.equal(log.exit.callCount, 1, 'Exit message has been logged');
    t.ok(log.exit.calledWith(`Cannot push changes because local branch '${releasingBranch}' still has changes to commit.`), 'Exit message has been logged with apropriate message');

    sandbox.restore();
    t.end();
});