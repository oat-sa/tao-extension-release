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
const test = require('tape');

const gitFactory = require('../../../src/git.js');
const simpleGit = require('simple-git/promise');

const localRepoFixturePath = path.resolve(__dirname, '../fixtures/localRepo');
const remoteRepoFixturePath = path.resolve(__dirname, '../fixtures/remoteRepo');
// const secondLocalRepoFixturePath = path.resolve(__dirname, '../fixtures/secondLocalRepo');
const workDir = path.resolve(__dirname, '../work');
const localRepoPath = path.join(workDir, 'localRepo');
const remoteRepoPath = path.join(workDir, 'remoteRepo');
// const secondLocalRepoPath = path.join(workDir, 'secondLocalRepo');

/**
 * Lifecycle
 */
const setUp = async function setUp() {

    tearDown();
    try {
        // copy fixtures/localRepo and fixtures/remoteRepo into work dir
        // the working-remote link between them is even preserved!
        fs.copySync(localRepoFixturePath, localRepoPath);
        fs.copySync(remoteRepoFixturePath, remoteRepoPath);
        console.log('fixture repos copied to workDir');

        const localGitHelper = simpleGit(localRepoPath);
        const remoteGitHelper = simpleGit(remoteRepoPath);

        // initialise remoteRepo (bare)
        process.chdir(remoteRepoPath);
        if (process.cwd() !== remoteRepoPath) {
            console.error('r', process.cwd());
            process.exit(1)
        };
        await remoteGitHelper.init(true);

        // initialise localRepo
        process.chdir(localRepoPath);
        if (process.cwd() !== localRepoPath) {
            console.error('l', process.cwd());
            process.exit(1)
        };
        await localGitHelper.init();

        // connect local to remote
        await localGitHelper.addRemote('origin', '../remoteRepo');

        // checkout develop, add all local files, initial commit, and push
        await localGitHelper.checkoutLocalBranch('develop');
        await localGitHelper.add('.');
        await localGitHelper.commit('Initial commit');
        await localGitHelper.push('origin', 'develop');

        // checkout master, add all local files, initial commit, and push
        await localGitHelper.checkoutLocalBranch('master');
        await localGitHelper.add('.');
        await localGitHelper.commit('Initial commit');
        await localGitHelper.push('origin', 'master');
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
    console.log('emptying workDir...');
    try {
        fs.emptyDirSync(workDir);
    }
    catch (err) {
        throw new Error('Error removing test repos');
    }
};

const getCurrentBranch = async function getCurrentBranch() {
    const currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    return currentBranch.trim();
}

//test.onFinish( tearDown );
// test.onFailure( tearDown );

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

test('hasSignKey (false)', async t => {
    await setUp();
    t.plan(2);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    t.notOk(await localRepo.hasSignKey(), 'no signing key is set up');
    await gitHelper.raw(['config', '--local', 'user.signingkey', 'foobar']);
    t.ok(await localRepo.hasSignKey(), 'signing key is set up');
    await gitHelper.raw(['config', '--local', '--unset', 'user.signingkey']);
});
