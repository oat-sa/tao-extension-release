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
 * Copyright (c) 2019-2021 Open Assessment Technologies SA;
 */

/**
 *
 * Unit test the compileAssets method of module src/release/extensionApi.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const branchPrefix = 'release';
const extension = 'testExtension';
const gitClientInstance = {
    commitAndPush: () => { },
    pull: () => { }
};
const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
    error: () => { },
    info: () => { },
};
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const version = '1.1.1';
const releasingBranch = 'release-1.1.1';
const taoInstance = {
    buildAssets: () => { },
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    getRepoName: () => ''
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const extensionApi = proxyquire.noCallThru().load('../../../../src/release/extensionApi.js', {
    '../log.js': log,
    '../taoInstance.js': taoInstanceFactory,
    inquirer,
})({ branchPrefix, interactive: true });
extensionApi.gitClient = gitClientInstance;

test('should define compileAssets method on extensionApi instance', (t) => {
    t.plan(1);

    t.ok(typeof extensionApi.compileAssets === 'function', 'The extensionApi instance has compileAssets method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await extensionApi.selectTaoInstance();
    await extensionApi.selectExtension();

    sandbox.stub(log, 'doing');

    await extensionApi.compileAssets(releasingBranch);

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith('Bundling'), 'Doing has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should log info message', async (t) => {
    t.plan(2);

    await extensionApi.selectTaoInstance();
    await extensionApi.selectExtension();

    sandbox.stub(log, 'info');

    await extensionApi.compileAssets(releasingBranch);

    t.equal(log.info.callCount, 1, 'Info has been logged');
    t.ok(log.info.calledWith('Asset build started, this may take a while'), 'Info has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should build assets', async (t) => {
    t.plan(2);

    await extensionApi.selectTaoInstance();
    await extensionApi.selectExtension();

    sandbox.stub(taoInstance, 'buildAssets');

    await extensionApi.compileAssets(releasingBranch);

    t.equal(taoInstance.buildAssets.callCount, 1, 'Assets has been built');
    t.ok(taoInstance.buildAssets.calledWith(extension, false), 'Assets of appropriate extension has been builded');

    sandbox.restore();
    t.end();
});

test('should publish assets', async (t) => {
    t.plan(2);

    await extensionApi.selectTaoInstance();
    await extensionApi.selectExtension();

    sandbox.stub(gitClientInstance, 'commitAndPush');

    await extensionApi.compileAssets(releasingBranch);

    t.equal(gitClientInstance.commitAndPush.callCount, 1, 'Assets has been published');
    t.ok(gitClientInstance.commitAndPush.calledWith(`${branchPrefix}-${version}`, 'chore: bundle assets'), 'Assets of appropriate extension has been published');

    sandbox.restore();
    t.end();
});

test('should log error message if compilation failed', async (t) => {
    t.plan(2);

    const errorMessage = 'testError';

    await extensionApi.selectTaoInstance();
    await extensionApi.selectExtension();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(log, 'error');
    sandbox.stub(taoInstance, 'buildAssets').throws(new Error(errorMessage));

    await extensionApi.compileAssets(releasingBranch);

    t.equal(log.error.callCount, 1, 'Error has been logged');
    t.ok(log.error.calledWith(`Unable to bundle assets. ${errorMessage}. Continue.`), 'Error has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should log info message after compilation of assets', async (t) => {
    t.plan(4);

    const changes = ['change1', 'change2'];

    await extensionApi.selectTaoInstance();
    await extensionApi.selectExtension();

    sandbox.stub(log, 'info');
    sandbox.stub(gitClientInstance, 'commitAndPush').returns(changes);

    await extensionApi.compileAssets(releasingBranch);

    t.equal(log.info.callCount, 4, 'Info has been logged');
    t.ok(log.info.calledWith(`Commit : [bundle assets - ${changes.length} files]`), 'Info has been logged with appropriate message');
    changes.forEach(change =>
        t.ok(log.info.calledWith(`  - ${change}`), 'Info has been logged with appropriate message')
    );

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await extensionApi.selectTaoInstance();
    await extensionApi.selectExtension();

    sandbox.stub(log, 'done');

    await extensionApi.compileAssets(releasingBranch);

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
