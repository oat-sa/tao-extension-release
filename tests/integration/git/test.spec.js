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

import path from 'path';
import fs from 'fs-extra';
import replace from 'replace-in-file';

import gitFactory from '../../../src/git.js';
import simpleGit from 'simple-git';

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
        fs.copySync(localRepoFixturePath, secondLocalRepoPath);

        const localGitHelper = simpleGit(localRepoPath);
        const remoteGitHelper = simpleGit(remoteRepoPath);
        const secondLocalGitHelper = simpleGit(secondLocalRepoPath);

        // initialise remoteRepo (bare)
        await remoteGitHelper.init(true);
        await verifyRemote(remoteGitHelper);

        // initialise localRepo
        await localGitHelper.init();
        await verifyLocal(localGitHelper);

        // initialise localRepo
        await secondLocalGitHelper.init();
        await verifyLocal(secondLocalGitHelper);

        // connect local to remote
        await localGitHelper.addRemote('origin', remoteRepoPath.trim());

        // connect local to remote
        await secondLocalGitHelper.addRemote('origin', remoteRepoPath.trim());

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

        // make a branch unknown to localRepo
        await secondLocalGitHelper.fetch();
        await secondLocalGitHelper.checkoutLocalBranch('remote-only');
        await secondLocalGitHelper.add('.');
        await secondLocalGitHelper.commit('Initial commit');
        await secondLocalGitHelper.push('origin', 'remote-only');

        // make a remote branch with different content
        await secondLocalGitHelper.checkoutLocalBranch('remote-is-ahead');
        await secondLocalGitHelper.pull('origin', 'remote-is-ahead', ['--no-rebase','--allow-unrelated-histories']);
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
    }
    catch (err) {
        throw new Error('Error removing test repos');
    }
};

const getCurrentBranch = async function getCurrentBranch(gitHelper) {
    const currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    return currentBranch.trim();
};

afterEach(() => {
    tearDown();
});

/**
 * Tests
 */
test('presence of original branches', async () => {
    await setUp();
    expect.assertions(7);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    expect(await localRepo.hasBranch('master')).toBe(true);
    expect(await localRepo.hasBranch('develop')).toBe(true);
    expect(await localRepo.hasBranch('shoobidoo')).toBe(false);

    const branches = await localRepo.getLocalBranches();
    expect(branches.includes('develop')).toBe(true);
    expect(branches.includes('master')).toBe(true);
    expect(branches.includes('remotes/origin/develop')).toBe(true);
    expect(branches.includes('remotes/origin/master')).toBe(true);
});

test('creating/deleting branch', async () => {
    await setUp();
    expect.assertions(4);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    const testBranch = 'test1';
    expect(await localRepo.hasBranch(testBranch)).toBe(false);

    // create branch & switch to it
    await localRepo.localBranch(testBranch);
    expect(await localRepo.hasBranch(testBranch)).toBe(true);

    const currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    expect(currentBranch.trim()).toBe(testBranch);

    // push branch to remote
    await gitHelper.push('origin', testBranch);

    // clean up
    await localRepo.checkout('master');
    const deleted = await localRepo.deleteBranch(testBranch);
    expect(deleted.branch).toBe(testBranch);
});

test('creating/deleting tag', async () => {
    await setUp();
    expect.assertions(8);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const remoteRepo = gitFactory(remoteRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    const remoteGitHelper = simpleGit(remoteRepoPath); // helper lib
    await verifyLocal(gitHelper);
    await verifyRemote(remoteGitHelper);

    expect(await localRepo.hasTag('tag1')).toBe(false);
    expect(await remoteRepo.hasTag('tag1')).toBe(false);

    // create tag & push it
    await localRepo.tag('master', 'tag1', 'testing tag1 comment');

    // check tags
    expect(await localRepo.hasTag('tag1')).toBe(true);
    expect(await remoteRepo.hasTag('tag1')).toBe(true);

    const localTags = await gitHelper.tags();
    expect(localTags.all.includes('tag1')).toBe(true);
    const remoteTags = await remoteGitHelper.tags();
    expect(remoteTags.all.includes('tag1')).toBe(true);

    // delete remote & local
    await gitHelper.raw(['push', '--delete', 'origin', 'tag1']);
    await gitHelper.raw(['tag', '-d', 'tag1']);
    expect(await localRepo.hasTag('tag1')).toBe(false);
    expect(await remoteRepo.hasTag('tag1')).toBe(false);
});

test('pull from remote', async () => {
    await setUp();
    expect.assertions(10);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    // pull equal branch
    const branch1 = 'master';
    const pull1 = await localRepo.pull(branch1);
    expect(await getCurrentBranch(gitHelper)).toBe(branch1);
    expect(pull1.files.length).toBe(0);
    expect(pull1.summary.insertions).toBe(0);
    expect(pull1.summary.deletions).toBe(0);

    // pull locally unknown remote branch
    const branch2 = 'remote-only';
    expect(await localRepo.hasBranch(branch2)).toBe(false);
    await localRepo.pull(branch2);
    expect(await getCurrentBranch(gitHelper)).toBe(branch2);

    // pull known remote branch with changes
    const branch3 = 'remote-is-ahead';
    const pull3 = await localRepo.pull(branch3);
    expect(await getCurrentBranch(gitHelper)).toBe(branch3);

    expect(pull3.files.length).toBe(1);
    expect(pull3.summary.insertions).toBe(1);
    expect(pull3.summary.deletions).toBe(1);
});

test('branch, edit, commit, diff, push', async () => {
    await setUp();
    expect.assertions(10);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const remoteRepo = gitFactory(remoteRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    const remoteGitHelper = simpleGit(remoteRepoPath); // helper lib
    await verifyLocal(gitHelper);
    await verifyRemote(remoteGitHelper);

    // start on develop
    await gitHelper.checkout('develop');
    let currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    expect(currentBranch.trim()).toBe('develop');

    // create branch & switch to it
    const newBranch = 'testing/TAO-xyz/my-feature';
    await localRepo.localBranch(newBranch);
    expect(await localRepo.hasBranch(newBranch)).toBe(true);
    currentBranch = await gitHelper.raw(['symbolic-ref', '--short', 'HEAD']);
    expect(currentBranch.trim()).toBe(newBranch);

    // edit file
    const manifest = path.join(localRepoPath, 'manifest.php');
    const replacings = await replace({
        files: manifest,
        from: '1.2.3',
        to: '1.3.0',
    });
    expect(replacings.length).toBe(1);
    expect(replacings[0].file).toBe(manifest);
    expect(replacings[0].hasChanged).toBe(true);

    // diff
    expect(await localRepo.hasLocalChanges()).toBe(true);

    // commit and push
    await localRepo.commitAndPush(newBranch, 'version bump 1.3.0');
    expect(await remoteRepo.hasBranch(newBranch)).toBe(true);

    // branch comparisons
    const localDiff = await localRepo.hasDiff(newBranch, 'develop');
    expect(localDiff && localDiff.length).toBeTruthy();
    const remoteDiff = await remoteRepo.hasDiff(newBranch, 'develop');
    expect(remoteDiff && remoteDiff.length).toBeTruthy();

});

test('mergeBack from master to develop', async () => {
    await setUp();
    expect.assertions(2);
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
    expect(diff1.trim().length > 0).toBeTruthy();

    await localRepo.mergeBack('develop', 'master');
    const diff2 = await gitHelper.diff(['develop', 'master']);
    expect(diff2.trim().length).toBe(0)
});

test('get remote repository name', async () => {
    await setUp();
    expect.assertions(1);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);
    const localPathRemoteName = await localRepo.getRepositoryName();
    //remote is linked on the local system
    expect(localPathRemoteName.trim()).toBe(remoteRepoPath.trim());
});

test('get ssh remote repository name', async () => {
    await setUp();
    expect.assertions(1);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    //set an ssh-like url to the origin
    await gitHelper.remote(['set-url', 'origin', 'bar@foo.com:oat-sa/tao-extension-a.git']);
    const sshRepoName = await localRepo.getRepositoryName();
    expect(sshRepoName).toBe('oat-sa/tao-extension-a');
});

test('get https remote repository name', async () => {
    await setUp();
    expect.assertions(1);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    //set a https url to the origin
    await gitHelper.remote(['set-url', 'origin', 'https://foo.com/oat-sa/tao-extension-b.git']);
    const httpsRepoName = await localRepo.getRepositoryName();
    expect(httpsRepoName).toBe('oat-sa/tao-extension-b');
});

test('get smartgit remote repository name', async () => {
    await setUp();
    expect.assertions(1);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    //set a smartgit url to the origin
    await gitHelper.remote(['set-url', 'origin', 'https://foo.com/oat-sa/tao-extension-c']);
    const smartgitRepoName = await localRepo.getRepositoryName();
    expect(smartgitRepoName).toBe('oat-sa/tao-extension-c');
});


test('get remote repository name without a remote', async () => {
    await setUp();
    expect.assertions(1);
    const localRepo = gitFactory(localRepoPath); // module we're testing
    const gitHelper = simpleGit(localRepoPath); // helper lib
    await verifyLocal(gitHelper);

    //set a smartgit url to the origin
    await gitHelper.remote(['rm', 'origin']);
    try {
        await localRepo.getRepositoryName();
    } catch(e) {
        expect(e).toBeTruthy();
    } 
});
