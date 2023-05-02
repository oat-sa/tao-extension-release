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

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

const sandbox = sinon.sandbox.create();

const extension = 'testExtension';
const taoRoot = 'testRoot';
const baseBranch = 'testBaseBranch';
const releaseBranch = 'testReleaseBranch';
const token = 'abc123';
const branchPrefix = 'releaser';
const releasingBranch = 'releaser-1.1.1';

const gitClientInstance = {
    pull: () => { },
    getLastTag: () => {},
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const conventionalCommits = {
    getNextVersion: () => ({ }),
};

const log = {
    doing: () => { },
    exit: () => { },
    info: () => { },
};
const inquirer = {
    prompt: () => ({ extension, pull: true, taoRoot }),
};

const releaseFactory = proxyquire.noCallThru().load('../../../../src/release.js', {
    './conventionalCommits.js': conventionalCommits,
    './git.js': gitClientFactory,
    './log.js': log,
    inquirer,
});


test('should define extractVersion method on release instance', (t) => {
    t.plan(1);
    const release = releaseFactory();
    t.ok(typeof release.extractVersion === 'function', 'The release instance has a extractVersion method');

    t.end();
});


test('should extract version from conventional commits', async (t) => {
    t.plan(5);

    const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
    release.setData({ releasingBranch, token, extension: {} });

    sandbox.stub(conventionalCommits, 'getNextVersion').onCall(0).returns({
        lastVersion: '1.2.3',
        version: '1.3.0',
        recommendation: {
            stats : {
                unset : 0,
                commits: 2,
                features: 1,
                fix: 0,
                breakings: 0
            }
        }
    });

    await release.initialiseGitClient();

    await release.extractVersion();

    const data = release.getData();
    t.equal(data.lastVersion, '1.2.3');
    t.equal(data.lastTag, 'v1.2.3');
    t.equal(data.version, '1.3.0');
    t.equal(data.tag, 'v1.3.0');
    t.equal(data.releasingBranch, 'releaser-1.3.0');

    sandbox.restore();
    t.end();
});

test('should extract version from given value', async (t) => {
    t.plan(5);

    const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch, releaseVersion : '2.0.1' });
    release.setData({ releasingBranch, token, extension: {} });
    sandbox.stub(conventionalCommits, 'getNextVersion').onCall(0).returns({
        lastVersion: '1.2.3',
        version: '1.3.0',
        recommendation: {
            stats : {
                unset : 0,
                commits: 2,
                features: 1,
                fix: 0,
                breakings: 0
            }
        }
    });

    await release.initialiseGitClient();

    await release.extractVersion();

    const data = release.getData();
    t.equal(data.lastVersion, '1.2.3');
    t.equal(data.lastTag, 'v1.2.3');
    t.equal(data.version, '2.0.1');
    t.equal(data.tag, 'v2.0.1');
    t.equal(data.releasingBranch, 'releaser-2.0.1');

    sandbox.restore();
    t.end();
});

test('exit when trying to release from a version lower than the last version', async (t) => {
    t.plan(2);

    const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch, releaseVersion : '1.0.0' });
    release.setData({ releasingBranch, token, extension: {} });
    sandbox.stub(conventionalCommits, 'getNextVersion').onCall(0).returns({
        lastVersion: '1.2.3',
        version: '1.3.0',
        recommendation: {
            stats : {
                unset : 0,
                commits: 2,
                features: 1,
                fix: 0,
                breakings: 0
            }
        }
    });
    sandbox.stub(log, 'exit');

    await release.initialiseGitClient();

    await release.extractVersion();

    t.equal(log.exit.callCount, 1, 'Exit has been called');
    t.equal(log.exit.getCall(0).args[0], 'The provided version is lesser than the latest version 1.2.3.');

    sandbox.restore();
    t.end();
});

test('warn when no conventional commits are found', async (t) => {
    t.plan(4);

    const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
    release.setData({ releasingBranch, token, extension: {} });
    sandbox.stub(conventionalCommits, 'getNextVersion').onCall(0).returns({
        lastVersion: '1.2.3',
        version: '1.2.4',
        recommendation: {
            stats : {
                unset : 7,
                commits: 8,
                features: 0,
                fix: 0,
                breakings: 0
            }
        }
    });

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm');
        t.equal(name, 'acceptDefaultVersion', 'The prompt name is correct');
        t.equal(message, 'There are some non conventional commits. Are you sure you want to continue?');

        return { acceptDefaultVersion: true };
    });

    await release.initialiseGitClient();

    await release.extractVersion();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('warn when no new commits are found', async (t) => {
    t.plan(5);

    const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
    release.setData({ releasingBranch, token, extension: {} });
    sandbox.stub(conventionalCommits, 'getNextVersion').onCall(0).returns({
        lastVersion: '1.2.3',
        version: '1.2.4',
        recommendation: {
            stats : {
                unset : 0,
                commits: 0,
                features: 0,
                fix: 0,
                breakings: 0
            }
        }
    });

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm');
        t.equal(name, 'releaseAgain', 'The prompt name is correct');
        t.equal(message, 'There\'s no new commits, do you really want to release a new version?');

        return { releaseAgain: false };
    });
    sandbox.stub(log, 'exit');

    await release.initialiseGitClient();

    await release.extractVersion();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been called');
    t.equal(log.exit.callCount, 1, 'the command exists');

    sandbox.restore();
    t.end();
});

