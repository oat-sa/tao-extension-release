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
 * Unit test the getNextVersion method of module src/conventionalCommits.js
 */

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

const sandbox = sinon.sandbox.create();

const recommendation = {
    releaseType: 'minor'
};

const conventionalRecommendedBump = sandbox.stub().callsFake((preset, config, callback) => callback(undefined, recommendation));
const conventionalCommits = proxyquire.noCallThru().load('../../../../src/conventionalCommits.js', {
    'conventional-recommended-bump': conventionalRecommendedBump
});

test('should define getNextVersion method on conventionalCommits', (t) => {
    t.plan(1);

    t.ok(typeof conventionalCommits.getNextVersion === 'function', 'The conventional commits instance has getNextVersion method');

    t.end();
});

test('should parse last tag and increment', async (t) => {
    t.plan(2);

    const lastTag = '1.2.3';

    const results = await conventionalCommits.getNextVersion(lastTag);

    t.equals(results.version, '1.3.0');
    t.equals(results.lastVersion, '1.2.3');

    t.end();
});

test('should coerce and increment a bad tag', async (t) => {
    t.plan(2);

    const lastTag = '3.2.5.8';

    const results = await conventionalCommits.getNextVersion(lastTag);

    t.equals(results.version, '3.3.0');
    t.equals(results.lastVersion, '3.2.5');

    t.end();
});

test('should coerce version with a pre-release', async (t) => {
    t.plan(2);

    const lastTag = '4.12.13-8';

    const results = await conventionalCommits.getNextVersion(lastTag);

    t.equals(results.version, '4.13.0');
    t.equals(results.lastVersion, '4.12.13');

    t.end();
});

test('fails when the last cannot be parsed', t => {
    t.plan(1);

    conventionalCommits.getNextVersion('foo').catch(err => {
        t.equals(err.message, 'Unable to retrieve last version from tags or the last tag is not semver compliant');
        t.end();
    });
});

