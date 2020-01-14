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
 * Unit test the extractReleaseNotes method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const branchPrefix = 'release';
const extension = 'testExtension';
const prNumber = '123';
const version = '1.1.1';
const taoRoot = 'testRoot';
const releaseBranch = 'testReleaseBranch';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';
const repoName = 'extension-test';
const pr = { notes: 'some pr note', number: prNumber };

const githubInstance = {
    extractReleaseNotesFromReleasePR: () => { },
    createReleasePR: () => ({ state: 'open', number: prNumber }),
};
const githubFactory = sandbox.stub().callsFake(() => githubInstance);
const gitClientInstance = {
    pull: () => { }
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const log = {
    exit: () => { },
    error: () => { },
    doing: () => { },
    done: () => { },
    info: () => { },
};
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './github.js': githubFactory,
    './log.js': log,
    inquirer,
})({ branchPrefix, releaseBranch });

release.setData({ releasingBranch, version, token, pr });

test('should define extractReleaseNotes method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.extractReleaseNotes === 'function', 'The release instance has extractReleaseNotes method');

    t.end();
});

test('should extract release notes', async (t) => {
    t.plan(3);

    const releaseNote = 'The release note of a PR';

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'extractReleaseNotesFromReleasePR').returns(releaseNote);

    await release.extractReleaseNotes();

    t.equal(githubInstance.extractReleaseNotesFromReleasePR.callCount, 1, 'Release notes has been extracted');
    t.ok(githubInstance.extractReleaseNotesFromReleasePR.calledWith(prNumber), 'Release notes has been extracted from appropriate pull request');

    const data = release.getData();
    t.equal(data.pr.notes, releaseNote, 'PR notes are correct');

    sandbox.restore();
    t.end();
});

test('should log info message', async (t) => {
    t.plan(2);

    const releaseNotes = 'testRleaseNotes';

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'extractReleaseNotesFromReleasePR').returns(releaseNotes);
    sandbox.stub(log, 'info');

    await release.extractReleaseNotes();

    t.equal(log.info.callCount, 1, 'Info has been logged');
    t.ok(log.info.calledWith(releaseNotes), 'Info has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    const releaseNotes = 'testRleaseNotes';

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'extractReleaseNotesFromReleasePR').returns(releaseNotes);
    sandbox.stub(log, 'done');

    await release.extractReleaseNotes();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});

test('should log error message if can not extract release notes', async (t) => {
    t.plan(3);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(log, 'error');

    await release.extractReleaseNotes();

    t.equal(log.error.callCount, 1, 'Error has been logged');
    t.ok(log.error.calledWith('Unable to create the release notes. Continue.'), 'Error has been logged with appropriate message');

    const data = release.getData();
    t.equal(data.pr.notes, '', 'PR notes are empty');

    sandbox.restore();
    t.end();
});
