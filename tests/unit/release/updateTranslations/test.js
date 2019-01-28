/**
 *
 * Unit test the updateTranslations method of module src/release.js
 *
 * @copyright 2019 Open Assessment Technologies SA;
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const branchPrefix = 'release';
const config = {
    write: () => { },
};
const extension = 'testExtension';
const gitClientInstance = {
    commitAndPush: () => { },
    pull: () => { }
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
    error: () => { },
    info: () => { },
    warn: () => { },
};
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, taoRoot, translation: true }),
};
const version = '1.1.1';
const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({ version, name: extension }),
    updateTranslations: () => { },
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})(null, branchPrefix);

test('should define updateTranslations method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.updateTranslations === 'function', 'The release instance has updateTranslations method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'doing');

    await release.updateTranslations();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith('Translations'), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should log warn message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'warn');

    await release.updateTranslations();

    t.equal(log.warn.callCount, 1, 'Warn has been logged');
    t.ok(log.warn.calledWith('Update translations during a release only if you know what you are doing'), 'Warn has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should prompt to update translations', async (t) => {
    t.plan(5);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message, default: defaultValue }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'translation', 'The param name should be translation');
        t.equal(message, `${extension} needs updated translations ? `, 'Should disaplay appropriate message');
        t.equal(defaultValue, false, 'Default value should be false');

        return { translation: false };
    });

    await release.updateTranslations();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should update translitions', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(taoInstance, 'updateTranslations');

    await release.updateTranslations();

    t.equal(taoInstance.updateTranslations.callCount, 1, 'Translations has been updated');
    t.ok(taoInstance.updateTranslations.calledWith(extension), 'Translations of apropriate extension has been updated');

    sandbox.restore();
    t.end();
});

test('should publish translations', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(gitClientInstance, 'commitAndPush');

    await release.updateTranslations();

    t.equal(gitClientInstance.commitAndPush.callCount, 1, 'Translations has been published');
    t.ok(gitClientInstance.commitAndPush.calledWith(`${branchPrefix}-${version}`, 'update translations'), 'Translations of apropriate extension has been published');

    sandbox.restore();
    t.end();
});

test('should log error message if update failed', async (t) => {
    t.plan(2);

    const errorMessage = 'testError';

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'error');
    sandbox.stub(taoInstance, 'updateTranslations').throws(new Error(errorMessage));

    await release.updateTranslations();

    t.equal(log.error.callCount, 1, 'Error has been logged');
    t.ok(log.error.calledWith(`Unable to update translations. ${errorMessage}. Continue.`), 'Error has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should log info message after update of translations', async (t) => {
    t.plan(4);

    const changes = ['change1', 'change2'];

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'info');
    sandbox.stub(gitClientInstance, 'commitAndPush').returns(changes);

    await release.updateTranslations();

    t.equal(log.info.callCount, 3, 'Info has been logged');
    t.ok(log.info.calledWith(`Commit : [update translations - ${changes.length} files]`), 'Info has been logged with apropriate message');
    changes.forEach(change =>
        t.ok(log.info.calledWith(`  - ${change}`), 'Info has been logged with apropriate message')
    );

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'done');

    await release.updateTranslations();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
