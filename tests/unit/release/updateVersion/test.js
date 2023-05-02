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
 * Unit test the verifyBranches method of module src/release.js
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
const repoName = 'oat-sa/extension-test';

const gitClientInstance = {
    commitAndPush: () => { },
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const log = {
    doing: () => { },
    exit: () => { },
};
const inquirer = {
    prompt: () => ({ extension, pull: true, taoRoot }),
};

const extensionApiInstance = {
    updateVersion: () => { },
};
const extensionApi = sandbox.stub().callsFake(() => extensionApiInstance);

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './log.js': log,
    './release/extensionApi.js': extensionApi,
    inquirer
})({ branchPrefix, baseBranch, releaseBranch });

release.setData({ releasingBranch, token, extension: {} });

test('should define updateVersion method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.updateVersion === 'function', 'The release instance has updateVersion method');

    t.end();
});

test('should call updateVersion method of api provider', async (t) => {
    t.plan(1);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGitClient();

    sandbox.stub(extensionApiInstance, 'updateVersion');

    await release.updateVersion();

    t.equal(extensionApiInstance.updateVersion.callCount, 1, 'updateVersion has been called');

    sandbox.restore();
    t.end();
});

test('should commit and push version changes', async (t) => {
    t.plan(2);

    sandbox.stub(release, 'getMetadata').returns({ repoName });

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'commitAndPush');

    await release.updateVersion();

    t.equal(gitClientInstance.commitAndPush.callCount, 1, 'commitAndPush has been called');
    t.ok(
        gitClientInstance.commitAndPush.calledWith(releasingBranch, 'chore: bump version'),
        'updateVersion has been called'
    );

    sandbox.restore();
    t.end();
});
