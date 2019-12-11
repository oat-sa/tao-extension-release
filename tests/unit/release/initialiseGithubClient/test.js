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
 * Copyright (c) 2019 Open Assessment Technologies SA;
 */

/**
 *
 * Unit test the initialiseGithubClient method of module src/release.js
 *
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
const version = '1.1.1';
const taoInstance = {
    getExtensions: () => [],
    getRepoName: () => repositoryName,
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({ version, name: extension })
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './github.js': githubFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})();

test('should define initialiseGithubClient method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.initialiseGithubClient === 'function', 'The release instance has initialiseGithubClient method');

    t.end();
});

test.skip('should get repository name', async (t) => {
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
    t.ok(log.exit.calledWith('Unable to find the github repository name'), 'Exit has been logged with apropriate message');

    sandbox.restore();
    t.end();
});
