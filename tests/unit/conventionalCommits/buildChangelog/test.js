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
 * Copyright (c) 2020 Open Assessment Technologies SA;
 */

/**
 * Unit test the buildChangelog method of module src/conventionalCommits.js
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const presetConfig = 'testConfig';

const conventionalChangelogPipe = {
    on: function (e, callback) {
        if (e === 'end') {
            callback();
        }

        return this;
    },
};
const conventionalChangelogCore = sandbox.stub().returns(conventionalChangelogPipe);
const conventionalCommitsConfig = sandbox.stub().returns(presetConfig);

const conventionalCommits = proxyquire.noCallThru().load('../../../../src/conventionalCommits.js', {
    'conventional-changelog-core': conventionalChangelogCore,
    'conventional-changelog-conventionalcommits': conventionalCommitsConfig,
});

test('should define buildChangelog method on conventionalCommits', (t) => {
    t.plan(1);

    t.ok(typeof conventionalCommits.buildChangelog === 'function', 'The conventional commits instance has buildChangelog method');

    t.end();
});

test('should get config of conventionalcommits preset', async (t) => {
    t.plan(1);

    conventionalCommitsConfig.resetHistory();

    await conventionalCommits.buildChangelog();

    t.equals(conventionalCommitsConfig.callCount, 1, 'get config of conventionalcommits preset');

    t.end();
});

test('should build change log', async (t) => {
    t.plan(2);

    const context = 'testContext';

    conventionalChangelogCore.resetHistory();

    await conventionalCommits.buildChangelog(context);

    t.equals(conventionalChangelogCore.callCount, 1, 'build change log');
    t.ok(conventionalChangelogCore.calledWith({ config: presetConfig }, context), 'build change log');

    t.end();
});
