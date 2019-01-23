/**
 *
 * Unit test the initialiseGithubClient method of module src/release.js
 *
 * @copyright 2019 Open Assessment Technologies SA;
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const config = {
    write: () => { },
};
const extension = 'testExtension';
const githubFactory = sandbox.stub();
const gitClientInstance = {};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const log = {
    exit: () => { },
};
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const repositoryName = 'testRepository';
const taoInstance = {
    getExtensions: () => [],
    getRepoName: () => repositoryName,
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
};
const taoINstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './github.js': githubFactory,
    './log.js': log,
    './taoInstance.js': taoINstanceFactory,
    inquirer,
})();

test('should define initialiseGithubClient method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.initialiseGithubClient === 'function', 'The release instance has initialiseGithubClient method');

    t.end();
});

test('should get repository name', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(taoInstance, 'getRepoName').returns(repositoryName);

    await release.initialiseGithubClient();

    t.equal(taoInstance.getRepoName.callCount, 1, 'Getting of repository name');
    t.ok(taoInstance.getRepoName.calledWith(extension), 'Getting of repository name of apropriate extension');

    sandbox.restore();
    t.end();
});

test('should create github instance', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    githubFactory.resetHistory();

    await release.initialiseGithubClient();

    t.equal(githubFactory.callCount, 1, 'Github client has been initialised');
    t.ok(githubFactory.calledWith(sinon.match.any, repositoryName), 'Github client has been initialised with apropriate repository');

    sandbox.restore();
    t.end();
});

test('should log exit message if can not get repository name', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(log, 'exit');
    sandbox.stub(taoInstance, 'getRepoName').returns(null);

    await release.initialiseGithubClient();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');
    t.ok(log.exit.calledWith('Unable to find the gitbuh repository name'), 'Exit has been logged with apropriate message');

    sandbox.restore();
    t.end();
});
