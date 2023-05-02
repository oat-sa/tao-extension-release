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
 * Unit test the createGithubRelease method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

const sandbox = sinon.sandbox.create();

const branchPrefix = 'release';
const extension = 'testExtension';
const repoName = 'extension-test';
const version = '1.1.1';
const tag = 'v1.1.1';
const releaseBranch = 'testReleaseBranch';
const pr = { notes: 'some pr note' };
const token = 'abc123';
const taoRoot = 'testRoot';
const releaseComment = 'testComment';

const githubInstance = {
    createReleasePR: () => ({ state: 'open' }),
    release: () => { },
};
const githubFactory = sandbox.stub().callsFake(() => githubInstance);
const gitClientInstance = {
    pull: () => { }
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
    info: () => { },
};
const inquirer = {
    prompt: () => ({ extension, taoRoot, comment: releaseComment }),
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './github.js': githubFactory,
    './log.js': log,
    inquirer,
})({ branchPrefix, releaseBranch });

release.setData({ version, tag, pr, token, extension: {} });

test('should define createGithubRelease method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.createGithubRelease === 'function', 'The release instance has createGithubRelease method');

    t.end();
});

test('should prompt about release comment', async (t) => {
    t.plan(4);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'input', 'The type should be "input"');
        t.equal(name, 'comment', 'The param name should be comment');
        t.equal(message, 'Any comment on the release ?', 'Should display appropriate message');

        return { comment: releaseComment };
    });

    await release.createGithubRelease();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should create release', async (t) => {
    t.plan(2);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(githubInstance, 'release');

    await release.createGithubRelease();

    t.equal(githubInstance.release.callCount, 1, 'Github release has been created');
    t.ok(githubInstance.release.calledWith(`v${version}`), 'Github release has been created from appropriate tag');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGithubClient();

    sandbox.stub(log, 'done');

    await release.createGithubRelease();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});

const releaseWithCliOption = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './github.js': githubFactory,
    './log.js': log,
    inquirer,
})({ branchPrefix, releaseBranch, releaseComment: 'my first release' });

releaseWithCliOption.setData({ version, tag, pr, token, extension: {} });

test('should use CLI release comment instead of prompting', async (t) => {
    t.plan(4);

    sandbox.stub(releaseWithCliOption, 'getMetadata').returns({ repoName });

    await releaseWithCliOption.initialiseGithubClient();

    sandbox.stub(inquirer, 'prompt');
    {
        await releaseWithCliOption.createGithubRelease();

        t.ok(inquirer.prompt.notCalled, 'No prompt shown');
    }
    sandbox.restore();

    sandbox.stub(githubInstance, 'release');
    {
        await releaseWithCliOption.createGithubRelease();

        t.ok(githubInstance.release.calledOnce, 'Github release has been created');
        t.ok(githubInstance.release.calledWith(`v${version}`), 'Github release has been created from appropriate tag');
        t.ok(githubInstance.release.calledWith(`v${version}`, sinon.match(/^my first release/)), 'Github release has been created with CLI comment');
    }
    sandbox.restore();

    t.end();
});
