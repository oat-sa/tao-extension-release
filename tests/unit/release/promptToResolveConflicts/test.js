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
 * Unit test the promptToResolveConflicts method of module src/release.js
 *
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const origin = 'origin';
const extension = 'testExtension';
const taoRoot = 'testRoot';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';

const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    inquirer,
})({ origin });

release.setData({ releasingBranch, token });

test('should define promptToResolveConflicts method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.promptToResolveConflicts === 'function', 'The release instance has promptToResolveConflicts method');

    t.end();
});

test('should prompt to confirm resolution', async (t) => {
    t.plan(5);

    await release.initialiseGitClient();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message, default: defaultValue }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'isMergeDone', 'The param name should be isMergeDone');
        t.equal(message, 'Has the merge been completed manually? I need to push the branch to origin.', 'Should display appropriate message');
        t.equal(defaultValue, false, 'The default response should be false');

        return { mergeDone: false };
    });

    await release.promptToResolveConflicts();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});
