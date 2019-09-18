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
 * Unit test the selectReleasingBranch method of module src/release.js
 *
 * @author Ricardo Proença <ricardo@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const baseBranch = 'testBaseBranch';
const config = {
    write: () => { },
};
const extension = 'testExtension';
const gitClientInstance = {
    getLocalBranches: () => { },
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const log = {
    doing: () => { },
    exit: () => { },
};
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, pull: true, taoRoot }),
};
const releaseBranch = 'testReleaseBranch';
const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({}),
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})(baseBranch, null, null, releaseBranch);

test('should define selectReleasingBranch method on release instance', (t) => {
    t.plan(1);
    t.ok(typeof release.selectReleasingBranch === 'function', 'The release instance has selectReleasingBranch method');
    t.end();
});
