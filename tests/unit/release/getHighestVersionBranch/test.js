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
 * Unit test the getHighestVersionBranch method of module src/release.js
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
    origin: 'origin'
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})(releaseOptions);

test('should define getHighestVersionBranch method on release instance', (t) => {
    t.plan(1);
    t.ok(typeof release.getHighestVersionBranch === 'function', 'The release instance has getHighestVersionBranch method');
    t.end();
});

test('No version provided but no branches found', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'fetch');
    sandbox.stub(gitClientInstance, 'getLocalBranches').returns([
        'some-branch-with-weird-name',
        'remotes/origin/release-release',
        'release-0.9.0',
        'remotes/origin/release_0.9.0.5',
        'remotes/origin/release-'
    ]);
    sandbox.stub(log, 'exit');

    await release.selectReleasingBranch();

    t.equal(log.exit.callCount, 1, 'Exit message has been logged');
    t.ok(log.exit.calledWith('Cannot find any branches matching \'remotes/origin/release-\'.'), 'Exit message has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('version provided and found 1 branch', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'fetch');
    sandbox.stub(gitClientInstance, 'getLocalBranches').returns([
        'some-branch-with-weird-name',
        'remotes/origin/release-0.7.0',
        'remotes/origin/release-0.8.0',
        'remotes/origin/release-0.9.0',
        'remotes/origin/release-0.9.0-alpha',
        'remotes/origin/release-0.9.0-beta',
        'remotes/origin/release-1.9.1.0-alpha',
        'remotes/origin/releasing-0.93.1.0-alpha',
        'remotes/origin/4.93.1.0-alpha-release'
    ]);

    sandbox.stub(log, 'done');

    await release.selectReleasingBranch();

    t.equal(log.done.callCount, 1, 'Done message has been logged');
    t.ok(log.done.calledWith('Branch release-1.9.1.0-alpha is selected.'), 'Done message has been logged with apropriate message');

    sandbox.restore();
    t.end();
});