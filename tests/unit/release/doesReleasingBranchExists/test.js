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
 * Unit test the doesReleasingBranchExists method of module src/release.js
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const config = {
    write: () => { },
};
const extension = 'testExtension';
const gitClientInstance = {
    pull: () => { },
    hasBranch: () => false
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
};
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const origin = 'origin';
const branchPrefix = 'release';
const version = '1.1.1';
const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({ version }),
    getRepoName: () => ''
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer
})({ branchPrefix, origin });

test('should define doesReleasingBranchExists method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.doesReleasingBranchExists === 'function', 'The release instance has doesReleasingBranchExists method');

    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'doing');

    console.log(`Check if branch remotes/${origin}/${branchPrefix}-${version} exists`);

    await release.doesReleasingBranchExists();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith(`Check if branch remotes/${origin}/${branchPrefix}-${version} exists`), 'Doing has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should check if release branch exists', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(gitClientInstance, 'hasBranch');

    await release.doesReleasingBranchExists();

    t.equal(gitClientInstance.hasBranch.callCount, 1, 'Release has been checked');
    t.ok(gitClientInstance.hasBranch.calledWith(`remotes/${origin}/${branchPrefix}-${version}`), 'Appropriate release has been checked');

    sandbox.restore();
    t.end();
});

test('should log exit if release branch exists', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'exit');
    sandbox.stub(gitClientInstance, 'hasBranch').returns(true);

    await release.doesReleasingBranchExists();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');
    t.ok(log.exit.calledWith(`The remote branch remotes/${origin}/${branchPrefix}-${version} already exists.`), 'Exit has been logged with appropriate message');

    sandbox.restore();
    t.end();
});

test('should log done message', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();
    await release.verifyBranches();

    sandbox.stub(log, 'done');

    await release.doesReleasingBranchExists();

    t.equal(log.done.callCount, 1, 'Done has been logged');

    sandbox.restore();
    t.end();
});
