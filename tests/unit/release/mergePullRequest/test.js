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
 * Unit test the mergePullRequest method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

const sandbox = sinon.sandbox.create();

const branchPrefix = 'release';
const taoRoot = 'testRoot';
const version = '1.1.1';
const releaseBranch = 'testReleaseBranch';
const extension = 'testExtension';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';
const repoName = 'oat-sa/extension-test';

const githubInstance = {
    createReleasePR: () => ({ state: 'open' })
};
const githubFactory = sandbox.stub().callsFake(() => githubInstance);
const gitClientInstance = {
    pull: () => { },
    mergePr: () => { },
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
    info: () => { },
};
const inquirer = {
    prompt: () => ({ extension, taoRoot, pr: true }),
};

const open = sandbox.spy();

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './github.js': githubFactory,
    './log.js': log,
    inquirer,
    open,
})({ branchPrefix, releaseBranch });

release.setData({ releasingBranch, token, extension: {} });

test('should define mergePullRequest method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.mergePullRequest === 'function', 'The release instance has mergePullRequest method');

    t.end();
});

test('should open pull request in browser', async (t) => {
    t.plan(1);

    const clock = sandbox.useFakeTimers();

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGitClient();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    open.resetHistory();

    await release.mergePullRequest();

    clock.tick(2000);

    t.equal(open.callCount, 1, 'Browser has been opened');

    clock.restore();
    sandbox.restore();
    t.end();
});

test('should prompt about merging pull request', async (t) => {
    t.plan(4);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGitClient();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confrim"');
        t.equal(name, 'pr', 'The param name should be pr');
        t.equal(message, 'Please review the release PR (you can make the last changes now). Can I merge it now ?', 'Should display appropriate message');


        return { pr: true };
    });

    await release.mergePullRequest();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should log exit if pr is not confirmed', async (t) => {
    t.plan(1);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGitClient();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(inquirer, 'prompt').returns({ pr: false });
    sandbox.stub(log, 'exit');

    await release.mergePullRequest();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');

    sandbox.restore();
    t.end();
});

test('should merge pull request', async (t) => {
    t.plan(2);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGitClient();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(gitClientInstance, 'mergePr');

    await release.mergePullRequest();

    t.equal(gitClientInstance.mergePr.callCount, 1, 'PR has been merged');
    t.ok(
        gitClientInstance.mergePr.calledWith(
            releaseBranch,
            `${branchPrefix}-${version}`
        ),
        'Appropriate PR has been merged',
    );

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(2);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGitClient();
    await release.initialiseGithubClient();
    await release.createPullRequest();

    sandbox.stub(log, 'done');

    await release.mergePullRequest();

    t.equal(log.done.callCount, 1, 'Done has been logged');
    t.ok(log.done.calledWith('PR merged'), 'Done has been logged with appropriate message');

    sandbox.restore();
    t.end();
});
