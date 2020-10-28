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
 * Unit test the verifyBranches method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const extension = 'testExtension';
const taoRoot = 'testRoot';
const baseBranch = 'testBaseBranch';
const releaseBranch = 'testReleaseBranch';
const token = 'abc123';
const branchPrefix = 'releaser';
const releasingBranch = 'releaser-1.1.1';
const repoName = 'oat-sa/extension-test';

const gitClientInstance = {
    pull: () => { },
    getLastTag: () => {},
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const conventionalCommits = {
    getNextVersion: () => ({ recommendation: {} }),
};
const conventionalCommitsFactory = sandbox.stub().callsFake(() => conventionalCommits);

const log = {
    doing: () => { },
    exit: () => { },
};
const inquirer = {
    prompt: () => ({ extension, pull: true, taoRoot }),
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './conventionalCommits.js': conventionalCommitsFactory,
    './git.js': gitClientFactory,
    './log.js': log,
    inquirer,
})({ branchPrefix, baseBranch, releaseBranch });

release.setData({ releasingBranch, token, extension: {} });

test('should define verifyBranches method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.verifyBranches === 'function', 'The release instance has verifyBranches method');

    t.end();
});

test('should prompt to pull branches', async (t) => {
    t.plan(4);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGitClient();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'pull', 'The param name should be pull');
        t.equal(message, `Can I checkout and pull ${baseBranch} and ${releaseBranch}  ?`, 'Should display appropriate message');

        return { pull: true };
    });

    await release.verifyBranches();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should log exit if pull not confirmed', async (t) => {
    t.plan(1);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGitClient();

    sandbox.stub(inquirer, 'prompt').returns({ pull: false });
    sandbox.stub(log, 'exit');

    await release.verifyBranches();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');

    sandbox.restore();
    t.end();
});

test('should pull release branch', async (t) => {
    t.plan(4);

    sandbox.stub(conventionalCommits, 'getNextVersion')
        .onCall(0).returns({ lastVersion: '1.2.3', version: '4.5.6', recommendation: {} });

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'pull');

    await release.verifyBranches();

    t.equal(gitClientInstance.pull.callCount, 2, 'Branches have been pulled');
    t.ok(gitClientInstance.pull.calledWith(releaseBranch), 'Release branch have been pulled');

    const data = release.getData();
    t.equal(data.lastVersion, '1.2.3');
    t.equal(data.lastTag, 'v1.2.3');

    sandbox.restore();
    t.end();
});

test('should pull base branch', async (t) => {
    t.plan(5);

    sandbox.stub(conventionalCommits, 'getNextVersion')
        .onCall(0).returns({ lastVersion: '1.2.3', version: '4.5.6', recommendation: {} });

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'pull');

    await release.verifyBranches();

    t.equal(gitClientInstance.pull.callCount, 2, 'Branches have been pulled');
    t.ok(gitClientInstance.pull.calledWith(releaseBranch), 'Base branch have been pulled');

    const data = release.getData();
    t.equal(data.version, '4.5.6');
    t.equal(data.tag, 'v4.5.6');
    t.equal(data.releasingBranch, 'releaser-4.5.6');

    sandbox.restore();
    t.end();
});
