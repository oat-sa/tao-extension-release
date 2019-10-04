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
 * Unit test the verifyReleasingBranch method of module src/release.js
 *
 * @author Ricardo Proença <ricardo@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const config = {
    write: () => { },
};

const gitClientInstance = {
    getLocalBranches: () => {},
    fetch: () => { },
    checkout: () => { }
};

const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const log = {
    doing: () => { },
    exit: () => { },
    error: () => { },
    done: () => { }
};

const taoRoot = 'testRoot';
const extension = 'testExtension';

const inquirer = {
    prompt: () => ({ extension, pull: true, taoRoot }),
};

const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({}),
};

const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);

const releaseOptions = {
    branchPrefix: 'release',
    origin: 'origin',
    versionToRelease: '0.9.0',
    releaseBranch: 'master'
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})(releaseOptions);

const releasingBranch = 'remotes/origin/release-0.9.0';
const localReleasingBranch = 'release-0.9.0';
const releaseBranch = 'master';

test('should define verifyReleasingBranch method on release instance', (t) => {
    t.plan(1);
    t.ok(typeof release.verifyReleasingBranch === 'function', 'The release instance has verifyReleasingBranch method');
    t.end();
});

test('Releasing branch has different version than manifest', async (t) => {
    t.plan(2);

    sandbox.stub(gitClientInstance, 'fetch');
    sandbox.stub(gitClientInstance, 'getLocalBranches').returns([releasingBranch]);
    sandbox.stub(log, 'exit');

    const callback = sandbox.stub(taoInstance, 'parseManifest');
    callback.onCall(0).returns({ version: '0.7.0'});
    callback.onCall(1).returns({ version: '0.7.0'});

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.selectReleasingBranch();
    await release.verifyReleasingBranch();

    t.equal(log.exit.callCount, 2, 'Exit message has been logged');
    t.ok(log.exit.calledWith(`Branch '${localReleasingBranch}' cannot be released because it's branch name does not match its own manifest version (0.7.0).`), 'Exit message has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('Releasing branch is valid and is greather than release branch version', async (t) => {
    t.plan(4);

    sandbox.stub(gitClientInstance, 'fetch');
    sandbox.stub(gitClientInstance, 'getLocalBranches').returns(['remotes/origin/release-0.9.0']);
    sandbox.stub(log, 'doing');
    sandbox.stub(log, 'done');

    const callback = sandbox.stub(taoInstance, 'parseManifest');
    callback.onCall(0).returns({ version: '0.9.0'});
    callback.onCall(1).returns({ version: '0.8.0'});

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.selectReleasingBranch();
    await release.verifyReleasingBranch();

    t.equal(log.doing.callCount, 2, 'Doing message has been logged');
    t.ok(log.doing.calledWith(`Branch ${localReleasingBranch} has valid manifest.`), 'Doing message has been logged with apropriate message');

    t.equal(log.done.callCount, 2, 'Done message has been logged');
    t.ok(log.done.calledWith(`Branch ${localReleasingBranch} is valid.`), 'Done message has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('Releasing branch is valid but is less than release branch version', async (t) => {
    t.plan(4);

    sandbox.stub(gitClientInstance, 'fetch');
    sandbox.stub(gitClientInstance, 'getLocalBranches').returns([releasingBranch]);
    sandbox.stub(log, 'doing');
    sandbox.stub(log, 'exit');

    const callback = sandbox.stub(taoInstance, 'parseManifest');
    callback.onCall(0).returns({ version: '0.9.0'});
    callback.onCall(1).returns({ version: '0.10.0'});

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.selectReleasingBranch();
    await release.verifyReleasingBranch();

    t.equal(log.doing.callCount, 2, 'Doing message has been logged');
    t.ok(log.doing.calledWith(`Branch ${localReleasingBranch} has valid manifest.`), 'Doing message has been logged with apropriate message');

    t.equal(log.exit.callCount, 1, 'Exit message has been logged');
    t.ok(log.exit.calledWith(`Branch '${localReleasingBranch}' cannot be released because its manifest version (0.9.0) is not greater than the manifest version of '${releaseBranch}' (0.10.0).`), 'Exit message has been logged with apropriate message');
    sandbox.restore();
    t.end();
});