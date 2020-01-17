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

/*eslint no-console: "off"*/

/**
 * This module tests the src/git.js module against the repos provided in fixtures
 *
 * When running each test:
 * - folders and files from `tests/integration/fixtures` will be copied into `tests/integration/work`
 * - a git client will be used to set up 3 temporary git repos:
 *   - remoteRepo (a bare repo)
 *   - localRepo (1st working copy of remoteRepo)
 *   - secondLocalRepo (2nd working copy of remoteRepo)
 * - after the tests, the `work` folder will be cleared, destroying the temporary repos
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const path = require('path');
const fs = require('fs-extra');
const replace = require('replace-in-file');
const test = require('tape');

const gitFactory = require('../../../src/git.js');
const simpleGit = require('simple-git/promise');

const localRepoFixturePath = path.resolve(__dirname, '../fixtures/localRepo');
const workDir = path.resolve(__dirname, '../work');
const localRepoPath = path.join(workDir, 'localRepo');
const remoteRepoPath = path.join(workDir, 'remoteRepo');
const secondLocalRepoPath = path.join(workDir, 'secondLocalRepo');

/**
 * Lifecycle functions
 */
const setUp = async function setUp() {

    tearDown();
    try {
        // copy 1 folder from `fixtures` into work dir, and make 2 empty folders
        fs.copySync(localRepoFixturePath, localRepoPath);
        fs.emptyDirSync(remoteRepoPath);
        fs.emptyDirSync(secondLocalRepoPath);
        console.log('fixture repos created in workDir');

        const localGitHelper = simpleGit(localRepoPath);
        const remoteGitHelper = simpleGit(remoteRepoPath);

        // initialise remoteRepo (bare)
        await remoteGitHelper.init(true);
        await verifyRemote(remoteGitHelper);

        // initialise localRepo
        await localGitHelper.init();
        await verifyLocal(localGitHelper);

        // connect local to remote
        await localGitHelper.addRemote('origin', remoteRepoPath);

        // checkout master, add all local files, initial commit, and push
        await localGitHelper.checkoutLocalBranch('master');
        await localGitHelper.add('.');
        await localGitHelper.commit('Initial commit');
        await localGitHelper.push('origin', 'master');

        // checkout develop, add all local files, initial commit, and push
        await localGitHelper.checkoutLocalBranch('develop');
        await localGitHelper.add('.');
        await localGitHelper.commit('Initial commit');
        await localGitHelper.push('origin', 'develop');

        // prepare remote-is-ahead branch
        await localGitHelper.checkoutLocalBranch('remote-is-ahead');
        await localGitHelper.push('origin', 'remote-is-ahead');

        // clone remoteRepo to secondLocalRepo
        await simpleGit().clone(remoteRepoPath, secondLocalRepoPath);
        const secondLocalGitHelper = simpleGit(secondLocalRepoPath);
        await verifyLocal(secondLocalGitHelper);

        // make a branch unknown to localRepo
        await secondLocalGitHelper.checkoutLocalBranch('remote-only');
        await secondLocalGitHelper.push('origin', 'remote-only');

        // make a remote branch with different content
        await secondLocalGitHelper.checkoutLocalBranch('remote-is-ahead');
        fs.writeFileSync(path.join(secondLocalRepoPath, 'data.txt'), 'new content');
        await secondLocalGitHelper.add('data.txt');
        await secondLocalGitHelper.commit('Update data.txt');
        await secondLocalGitHelper.push('origin', 'remote-is-ahead');

    }
    catch (err) {
        console.error(err);
        throw new Error('Error setting up test repos');
    }
};

const verifyLocal = async function verifyLocal(gitHelper) {
    const isBare = await gitHelper.raw(['rev-parse', '--is-bare-repository']);
    if (isBare.trim() === 'true') {
        throw new Error('The localRepo appears to be bare');
    }
    // make sure repo is not the wrong one!
    const remotes = await gitHelper.getRemotes(true);
    if (remotes.some(r => r.refs.push.includes('github.com'))) {
        console.log('remotes', remotes);
        throw new Error('I won\'t test against a github-connected repo!');
    }
};

const verifyRemote = async function verifyRemote(gitHelper) {
    const isBare = await gitHelper.raw(['rev-parse', '--is-bare-repository']);
    if (isBare.trim() !== 'true') {
        throw new Error('The remoteRepo does not appear to be bare');
    }
    // make sure repo is not the wrong one!
    const remotes = await gitHelper.getRemotes(true);
    if (remotes.filter(r => r.name).length) {
        throw new Error(`The remoteRepo should have 0 remotes, ${remotes.length} found`);
    }
};

const tearDown = function tearDown() {
    // empty temp dir
    try {
        fs.emptyDirSync(workDir);
        console.log('emptied workDir');
    }
    catch (err) {
        throw new Error('Error removing test repos');
    }
};

const getCurrentBranch = async function getCurrentBranch(gitHelper) {
    const currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    return currentBranch.trim();
};

test.onFinish( tearDown );
test.onFailure( tearDown );

/**
 * Tests
 */
test('presence of original branches', async t => {
    await setUp();
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
    await setUp();
    t.plan(4);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    const testBranch = 'test1';
    t.notOk(await localRepo.hasBranch(testBranch), `localRepo does not hasBranch ${testBranch}`);

    // create branch & switch to it
    await localRepo.localBranch(testBranch);
    t.ok(await localRepo.hasBranch(testBranch), `localRepo hasBranch ${testBranch}`);

    const currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    t.equal(currentBranch.trim(), testBranch, `on correct branch ${testBranch}`);

    // push branch to remote
    await gitHelper.push('origin', testBranch);

    // clean up
    await localRepo.checkout('master');
    const deleted = await localRepo.deleteBranch(testBranch);
    t.equal(deleted.branch, testBranch, `deleted branch ${testBranch}`);
});

test('creating/deleting tag', async t => {
    await setUp();
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

test('pull from remote', async t => {
    await setUp();
    t.plan(10);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    // pull equal branch
    const branch1 = 'master';
    const pull1 = await localRepo.pull(branch1);
    t.equal(await getCurrentBranch(gitHelper), branch1, `on ${branch1} branch`);
    t.equal(pull1.files.length, 0, '0 files changed');
    t.equal(pull1.summary.insertions, 0, '0 insertions');
    t.equal(pull1.summary.deletions, 0, '0 deletions');

    // pull locally unknown remote branch
    const branch2 = 'remote-only';
    t.notOk(await localRepo.hasBranch(branch2), `branch ${branch2} unknown to local`);
    await localRepo.pull(branch2);
    t.equal(await getCurrentBranch(gitHelper), branch2, `on ${branch2} branch`);

    // pull known remote branch with changes
    const branch3 = 'remote-is-ahead';
    const pull3 = await localRepo.pull(branch3);
    t.equal(await getCurrentBranch(gitHelper), branch3, `on ${branch3} branch`);

    t.equal(pull3.files.length, 1, '1 file changed');
    t.equal(pull3.summary.insertions, 1, '1 insertions');
    t.equal(pull3.summary.deletions, 1, '1 deletions');
});

test('branch, edit, commit, diff, push', async t => {
    await setUp();
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
    const newBranch = 'testing/TAO-xyz/my-feature';
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

test('mergeBack from master to develop', async t => {
    await setUp();
    t.plan(2);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    await localRepo.checkout('master');
    const manifest = path.join(localRepoPath, 'manifest.php');
    await replace({
        files: manifest,
        from: '1.2.3',
        to: '1.3.0',
    });
    await gitHelper.add(manifest);
    await gitHelper.commit('To v1.3.0');
    const diff1 = await gitHelper.diff(['develop', 'master']);
    t.ok(diff1.trim().length > 0, 'develop not equal with master');

    await localRepo.mergeBack('develop', 'master');
    const diff2 = await gitHelper.diff(['develop', 'master']);
    t.equal(diff2.trim().length, 0, 'develop equal with master');
});
