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
 * Unit test the removeReleasingBranch method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const branchPrefix = 'release';
const extension = 'testExtension';
const taoRoot = 'testRoot';
const version = '1.1.1';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';

const gitClientInstance = {
    pull: () => { },
    deleteBranch: () => { },
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
};
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
    './log.js': log,
    inquirer,
})({ branchPrefix });

release.setData({ releasingBranch, token });

test('should define removeReleasingBranch method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.removeReleasingBranch === 'function', 'The release instance has removeReleasingBranch method');

    t.end();
});

test('should delete releasing branch', async (t) => {
    t.plan(2);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'deleteBranch');

    await release.removeReleasingBranch();

    t.equal(gitClientInstance.deleteBranch.callCount, 1, 'Branch has been deleted');
    t.ok(gitClientInstance.deleteBranch.calledWith(`${branchPrefix}-${version}`), 'Releasing branch has been deleted');

    sandbox.restore();
    t.end();
});
