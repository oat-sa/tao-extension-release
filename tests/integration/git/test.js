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
 * This module tests the src/git.js module against the repos in fixtures
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const path = require('path');
const fsExtra = require('fs-extra');

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
        fsExtra.copySync(localRepoFixturePath, localRepoPath);
        fsExtra.copySync(remoteRepoFixturePath, remoteRepoPath);
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
        fsExtra.emptyDirSync(tempDir);
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

    t.notOk(await localRepo.hasBranch('test1'), 'localRepo does not hasBranch test1');

    // create branch & switch to it
    await localRepo.localBranch('test1');
    t.ok(await localRepo.hasBranch('test1'), 'localRepo hasBranch test1');

    const currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    t.equal(currentBranch.trim(), 'test1', 'on correct branch test1');

    // push branch to remote
    await gitHelper.push('origin', 'test1');

    // clean up
    await gitHelper.checkout('master');
    const deleted = await localRepo.deleteBranch('test1');;
    t.equal(deleted.branch, 'test1', 'deleted branch test1');
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
