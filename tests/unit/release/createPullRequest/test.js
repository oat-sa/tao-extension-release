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
 * Unit test the createPullRequest method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const branchPrefix = 'release';
const extension = 'testExtension';
const taoRoot = 'testRoot';
const version = '1.1.1';
const tag = 'v1.1.1';
const token = 'abc123';
const lastVersion = '1.1.0';
const releaseBranch = 'testReleaseBranch';
const releasingBranch = 'release-1.1.1';
const repoName = 'extension-test';

const githubInstance = {
    createReleasePR: () => { },
};
const githubFactory = sandbox.stub().callsFake(() => githubInstance);

const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
    info: () => { },
};
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './github.js': githubFactory,
    './log.js': log,
    inquirer,
})({ branchPrefix, releaseBranch });

release.setData({ releasingBranch, version, lastVersion, tag, token, pr: null, extension: {} });

test('should define createPullRequest method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.createPullRequest === 'function', 'The release instance has createPullRequest method');

    t.end();
});

test('should create pull request', async (t) => {
    t.plan(2);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'createReleasePR');

    await release.createPullRequest();

    t.equal(githubInstance.createReleasePR.callCount, 1, 'Release pull request has been created');
    t.deepEqual(
        githubInstance.createReleasePR.getCall(0).args,
        [
            `${branchPrefix}-${version}`,
            releaseBranch,
            version,
            lastVersion
        ],
        'Release pull request has been created from releasing branch',
    );

    sandbox.restore();
    t.end();
});

test('should log info message', async (t) => {
    t.plan(2);

    const url = 'testUrl';

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'createReleasePR').returns({
        state: 'open',
        html_url: url,
    });
    sandbox.stub(log, 'info');

    await release.createPullRequest();

    t.equal(log.info.callCount, 1, 'Info has been logged');
    t.ok(log.info.calledWith(`${url} created`), 'Info has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should set data.pr', async (t) => {
    t.plan(1);

    const html_url = 'testUrl';
    const apiUrl = 'apiUrl';
    const number = 42;
    const id = 'pr_id';
    const expectedPR = {
        url: html_url,
        apiUrl,
        number,
        id
    };

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'createReleasePR').returns({
        state: 'open',
        html_url,
        url: apiUrl,
        number,
        id
    });
    sandbox.stub(log, 'info');

    await release.createPullRequest();

    t.deepEqual(release.getData().pr, expectedPR, 'The PR data has been saved');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'createReleasePR').returns({
        state: 'open',
    });
    sandbox.stub(log, 'done');

    await release.createPullRequest();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});

test('should log exit message if pull request is not created', async (t) => {
    t.plan(2);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(log, 'exit');

    await release.createPullRequest();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');
    t.ok(log.exit.calledWith('Unable to create the release pull request'), 'Exit has been logged with appropriate message');

    sandbox.restore();
    t.end();
});
