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
 * This module tests the src/git.js module against the repos provided in fixtures
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const path = require('path');
const fs = require('fs-extra');
const replace = require('replace-in-file');

const localRepoFixturePath = path.resolve(__dirname, '../fixtures/localRepo');
const remoteRepoFixturePath = path.resolve(__dirname, '../fixtures/remoteRepo');
const tempDir = path.resolve(__dirname, '../temp');
const localRepoPath = path.join(tempDir, 'localRepo');
const remoteRepoPath = path.join(tempDir, 'remoteRepo');

const test = require('tape');
const gitFactory = require('../../../src/git.js');
const simpleGit = require('simple-git/promise');

/**
 * Lifecycle
 */
const setUp = function setUp() {
    tearDown();
    try {
        // copy fixtures/localRepo and fixtures/remoteRepo into temp dir
        // the working-remote link between them is even preserved!
        fs.copySync(localRepoFixturePath, localRepoPath);
        fs.copySync(remoteRepoFixturePath, remoteRepoPath);
        console.log('fixture repos copied to tempDir');
    }
    catch (err) {
        throw new Error('Error setting up test repos');
    }
};

const verifyLocal = async function verifyLocal(gitHelper) {
    const isBare = await gitHelper.raw(['rev-parse', '--is-bare-repository']);
    if (isBare.trim() === 'true') {
        throw new Error('The localRepo appears to be bare');
    }
    // verify repo is not the wrong one!
    const remotes = await gitHelper.getRemotes(true);
    if (remotes.some(r => r.refs.push.includes('github.com'))) {
        console.log('remotes', remotes);
        throw new Error(`I won't test against a github-connected repo!`);
    }
};

const verifyRemote = async function verifyRemote(gitHelper) {
    const isBare = await gitHelper.raw(['rev-parse', '--is-bare-repository']);
    if (isBare.trim() !== 'true') {
        throw new Error('The remoteRepo does not appear to be bare');
    }
    // verify repo is not the wrong one!
    const remotes = await gitHelper.getRemotes(true);
    if (remotes.filter(r => r.name).length) {
        throw new Error(`The remoteRepo should have 0 remotes, ${remotes.length} found`);
    }
};

const tearDown = function tearDown() {
    // empty temp dir
    console.log('emptying tempDir...');
    try {
        fs.emptyDirSync(tempDir);
    }
    catch (err) {
        throw new Error('Error removing test repos');
    }
};

test.onFinish( tearDown );
// test.onFailure( tearDown );

/**
 * Tests
 */
test('presence of original branches', async t => {
    setUp();
    t.plan(7);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    t.ok(await localRepo.hasBranch('master'), 'localRepo hasBranch master');
    t.ok(await localRepo.hasBranch('develop'), 'localRepo hasBranch develop');
    t.notOk(await localRepo.hasBranch('shoobidoo'), 'localRepo does not hasBranch shoobidoo');

    const branches = await localRepo.getLocalBranches();
    t.ok(branches.includes('develop'), 'local develop branch exists');
    t.ok(branches.includes('master'), 'local master branch exists');
    t.ok(branches.includes('remotes/origin/develop'), 'remote develop branch exists');
    t.ok(branches.includes('remotes/origin/master'), 'remote master branch exists');
});

test('creating/deleting branch', async t => {
    setUp();
    t.plan(4);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    testBranch = 'test1';
    t.notOk(await localRepo.hasBranch(testBranch), `localRepo does not hasBranch ${testBranch}`);

    // create branch & switch to it
    await localRepo.localBranch(testBranch);
    t.ok(await localRepo.hasBranch(testBranch), `localRepo hasBranch ${testBranch}`);

    const currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    t.equal(currentBranch.trim(), testBranch, `on correct branch ${testBranch}`);

    // push branch to remote
    await gitHelper.push('origin', testBranch);

    // clean up
    await gitHelper.checkout('master');
    const deleted = await localRepo.deleteBranch(testBranch);;
    t.equal(deleted.branch, testBranch, `deleted branch ${testBranch}`);
});

test('creating/deleting tag', async t => {
    setUp();
    t.plan(8);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const remoteRepo = gitFactory(remoteRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    const remoteGitHelper = simpleGit(remoteRepoPath); // helper lib
    await verifyLocal(gitHelper);
    await verifyRemote(remoteGitHelper);

    t.notOk(await localRepo.hasTag('tag1'), 'localRepo does not hasTag tag1');
    t.notOk(await remoteRepo.hasTag('tag1'), 'remoteRepo does not hasTag tag1');

    // create tag & push it
    await localRepo.tag('master', 'tag1', 'testing tag1 comment');

    // check tags
    t.ok(await localRepo.hasTag('tag1'), 'localRepo hasTag tag1');
    t.ok(await remoteRepo.hasTag('tag1'), 'remoteRepo hasTag tag1');

    const localTags = await gitHelper.tags();
    t.ok(localTags.all.includes('tag1'), 'tag exists on local');
    const remoteTags = await remoteGitHelper.tags();
    t.ok(remoteTags.all.includes('tag1'), 'tag exists on remote');

    // delete remote & local
    await gitHelper.raw(['push', '--delete', 'origin', 'tag1']);
    await gitHelper.raw(['tag', '-d', 'tag1']);
    t.notOk(await localRepo.hasTag('tag1'), 'tag1 gone on local');
    t.notOk(await remoteRepo.hasTag('tag1'), 'tag1 gone on remote');
});

test('hasSignKey (false)', async t => {
    setUp();
    t.plan(2);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    t.notOk(await localRepo.hasSignKey(), 'no signing key is set up');
    await gitHelper.raw(['config', '--local', 'user.signingkey', 'foobar']);
    t.ok(await localRepo.hasSignKey(), 'signing key is set up');
    await gitHelper.raw(['config', '--local', '--unset', 'user.signingkey']);
});

test('pull from remote', async t => {
    setUp();
    t.plan(10);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    // equal branch
    const branch1 = 'master';
    const pull1 = await localRepo.pull(branch1);
    let currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    t.equal(currentBranch.trim(), branch1, `on ${branch1} branch`);
    t.equal(pull1.files.length, 0, '0 files changed');
    t.equal(pull1.summary.insertions, 0, 'correct insertions');
    t.equal(pull1.summary.deletions, 0, 'correct deletions');

    // locally unknown remote branch
    const branch2 = 'remote-only';
    t.notOk(await localRepo.hasBranch(branch2), `branch ${branch2} unknown to local`);
    await localRepo.pull(branch2);
    currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    t.equal(currentBranch.trim(), branch2, `on ${branch2} branch`);

    // remote branch with changes
    const branch3 = 'remote-is-ahead';
    const pull3 = await localRepo.pull(branch3);
    currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    t.equal(currentBranch.trim(), branch3, `on ${branch3} branch`);
    t.equal(pull3.files.length, 1, '1 file changed');
    t.equal(pull3.summary.insertions, 1, 'correct insertions');
    t.equal(pull3.summary.deletions, 0, 'correct deletions');
});

test('branch, edit, commit, diff, push', async t => {
    setUp();
    t.plan(10);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const remoteRepo = gitFactory(remoteRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    const remoteGitHelper = simpleGit(remoteRepoPath); // helper lib
    await verifyLocal(gitHelper);
    await verifyRemote(remoteGitHelper);

    // start on develop
    await gitHelper.checkout('develop');
    let currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    t.equal(currentBranch.trim(), 'develop', 'on develop branch');

    // create branch & switch to it
    const newBranch = 'testing/TAO-xyz/my-feature'
    await localRepo.localBranch(newBranch);
    t.ok(await localRepo.hasBranch(newBranch), 'localRepo has new branch');
    currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    t.equal(currentBranch.trim(), newBranch, 'on the new branch');

    // edit file
    const manifest = path.join(localRepoPath, 'manifest.php');
    const replacings = await replace({
        files: manifest,
        from: '1.2.3',
        to: '1.3.0',
    });
    t.equal(replacings.length, 1, 'exactly one file was changed');
    t.equal(replacings[0].file, manifest, 'the manifest was changed');
    t.equal(replacings[0].hasChanged, true, 'the manifest was changed');

    // diff
    t.ok(await localRepo.hasLocalChanges(), 'there are local changes');

    // commit and push
    await localRepo.commitAndPush(newBranch, 'version bump 1.3.0');
    t.ok(await remoteRepo.hasBranch(newBranch), 'remoteRepo has branch');

    // branch comparisons
    const localDiff = await localRepo.hasDiff(newBranch, 'develop');
    t.ok(localDiff && localDiff.length, 'the branches have a difference on local');
    const remoteDiff = await remoteRepo.hasDiff(newBranch, 'develop');
    t.ok(remoteDiff && remoteDiff.length, 'the branches have a difference on remote');

});
