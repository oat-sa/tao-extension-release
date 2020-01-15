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
 * Unit test the signTags method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const token = 'abc123';
const releasingBranch = 'release-1.1.1';

const gitClientInstance = {
    hasSignKey: () => { },
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': gitClientFactory,
})();

release.setData({ releasingBranch, token, extension: {} });

test('should define signTags method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.signTags === 'function', 'The release instance has signTags method');

    t.end();
});

test('should check if there is any sign tags', async (t) => {
    t.plan(1);

    await release.initialiseGitClient();

    sandbox.stub(gitClientInstance, 'hasSignKey');

    await release.signTags();

    t.equal(gitClientInstance.hasSignKey.callCount, 1, 'Sign tags has been checked');

    sandbox.restore();
    t.end();
});
