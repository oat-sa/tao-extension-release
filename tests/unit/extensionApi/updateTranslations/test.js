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
 * Unit test the updateTranslations method of module src/release/extensionApi.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

const sandbox = sinon.sandbox.create();

const branchPrefix = 'release';
const extension = 'testExtension';
const taoRoot = 'testRoot';
const version = '1.1.1';
const releasingBranch = 'release-1.1.1';

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
    warn: () => { },
};
const inquirer = {
    prompt: () => ({ extension, taoRoot, runTranslations: true }),
};

const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    updateTranslations: () => { },
    getRepoName: () => ''
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);

const extensionApiFactory = proxyquire.noCallThru().load('../../../../src/release/extensionApi.js', {
    '../log.js': log,
    '../taoInstance.js': taoInstanceFactory,
    inquirer
});

const data = {  extension: {name : extension } };

test('should define updateTranslations method on extensionApi instance', (t) => {
    t.plan(1);

    const extensionApi = extensionApiFactory();
    t.ok(typeof extensionApi.updateTranslations === 'function', 'The extensionApi instance has updateTranslations method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);

    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(log, 'doing');

    await extensionApi.updateTranslations(releasingBranch);

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith('Translations'), 'Doing has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should log warn message', async (t) => {
    t.plan(2);

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);
    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(log, 'warn');

    await extensionApi.updateTranslations(releasingBranch);

    t.equal(log.warn.callCount, 1, 'Warn has been logged');
    t.ok(log.warn.calledWith('Update translations during a release only if you know what you are doing'), 'Warn has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should prompt to update translations', async (t) => {
    t.plan(5);

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);
    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message, default: defaultValue }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'runTranslations', 'The param name should be translation');
        t.equal(message, `${extension} needs updated translations ? `, 'Should display appropriate message');
        t.equal(defaultValue, false, 'Default value should be false');

        return { runTranslations : false };
    });

    await extensionApi.updateTranslations(releasingBranch);

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should update translations', async (t) => {
    t.plan(2);

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);
    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(taoInstance, 'updateTranslations');

    await extensionApi.updateTranslations(releasingBranch);

    t.equal(taoInstance.updateTranslations.callCount, 1, 'Translations has been updated');
    t.ok(taoInstance.updateTranslations.calledWith(extension), 'Translations of appropriate extension has been updated');

    sandbox.restore();
    t.end();
});

test('should publish translations', async (t) => {
    t.plan(3);

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);
    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(gitClientInstance, 'commitAndPush');

    await extensionApi.updateTranslations(releasingBranch);

    t.equal(gitClientInstance.commitAndPush.callCount, 1, 'Translations has been published');
    t.equal(gitClientInstance.commitAndPush.getCall(0).args[0], `${branchPrefix}-${version}`, 'Branch name is correct');
    t.equal(gitClientInstance.commitAndPush.getCall(0).args[1], 'chore: update translations', 'Commit message is present and correct');

    sandbox.restore();
    t.end();
});

test('should log error message if update failed', async (t) => {
    t.plan(2);

    const errorMessage = 'testError';

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);
    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(log, 'error');
    sandbox.stub(taoInstance, 'updateTranslations').throws(new Error(errorMessage));

    await extensionApi.updateTranslations(releasingBranch);

    t.equal(log.error.callCount, 1, 'Error has been logged');
    t.ok(log.error.calledWith(`Unable to update translations. ${errorMessage}. Continue.`), 'Error has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should log info message after update of translations', async (t) => {
    t.plan(4);

    const changes = ['change1', 'change2'];

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);
    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(log, 'info');
    sandbox.stub(gitClientInstance, 'commitAndPush').returns(changes);

    await extensionApi.updateTranslations(releasingBranch);

    t.equal(log.info.callCount, 3, 'Info has been logged');
    t.ok(log.info.calledWith(`Commit : [update translations - ${changes.length} files]`), 'Info has been logged with appropriate message');
    changes.forEach(change =>
        t.ok(log.info.calledWith(`  - ${change}`), 'Info has been logged with appropriate message')
    );

    sandbox.restore();
    t.end();
});

test('should skip translations if "no" answered', async (t) => {
    t.plan(3);

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);
    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(inquirer, 'prompt').returns({ runTranslations: false });
    sandbox.stub(taoInstance, 'updateTranslations');
    sandbox.stub(log, 'done');

    await extensionApi.updateTranslations(releasingBranch);

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');
    t.equal(taoInstance.updateTranslations.callCount, 0, 'Translations not updated');
    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);
    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(log, 'done');

    await extensionApi.updateTranslations(releasingBranch);

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});

test('should skip prompt if updateTranslations is set', async (t) => {
    t.plan(2);

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: true }, data);

    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(inquirer, 'prompt');
    sandbox.stub(taoInstance, 'updateTranslations');

    await extensionApi.updateTranslations(releasingBranch);

    t.ok(taoInstance.updateTranslations.callCount, 1, 'Update translation is called');
    t.ok(inquirer.prompt.notCalled, 'No prompt called');

    sandbox.restore();
    t.end();
});

test('should not update translations in non interaction mode', async (t) => {
    t.plan(2);

    const extensionApi = extensionApiFactory({ branchPrefix, interactive: false, updateTranslations: true });
    await extensionApi.selectTaoInstance();
    extensionApi.gitClient = gitClientInstance;

    sandbox.stub(inquirer, 'prompt');
    sandbox.stub(taoInstance, 'updateTranslations');

    await extensionApi.updateTranslations(releasingBranch);

    t.ok(taoInstance.updateTranslations.notCalled, 'Translations are not updated in non interactive mode');
    t.ok(inquirer.prompt.notCalled, 'No prompt called');

    sandbox.restore();
    t.end();
});
