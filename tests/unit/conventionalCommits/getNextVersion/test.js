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

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const recommendation = {
    releaseType: 'path',
};
const version = '1.1.1';
const lastVersionObject = {
    version,
};

const conventionalRecommendedBump = sandbox.stub().callsFake((preset, config, callback) => callback(undefined, recommendation));
const semverParse = sandbox.stub().returns(lastVersionObject);
const semverInc = sandbox.stub().returns(version);


const conventionalCommits = proxyquire.noCallThru().load('../../../../src/conventionalCommits.js', {
    'conventional-recommended-bump': conventionalRecommendedBump,
    'semver/functions/parse': semverParse,
    'semver/functions/inc': semverInc,
})();

test('should define getNextVersion method on conventionalCommits', (t) => {
    t.plan(1);

    t.ok(typeof conventionalCommits.getNextVersion === 'function', 'The conventional commits instance has getNextVersion method');

    t.end();
});

test('should parse last tag', async (t) => {
    t.plan(2);

    const lastTag = 'testTag';

    semverParse.resetHistory();

    await conventionalCommits.getNextVersion(lastTag);

    t.equals(semverParse.callCount, 1, 'parse lat version');
    t.ok(semverParse.calledWith(lastTag), 'parse lat version');

    t.end();
});

test('should get version bump', async (t) => {
    t.plan(1);

    const lastTag = 'testTag';

    conventionalRecommendedBump.resetHistory();

    await conventionalCommits.getNextVersion(lastTag);

    t.equals(conventionalRecommendedBump.callCount, 1, 'get version bump');

    t.end();
});

test('should get version increment', async (t) => {
    t.plan(2);

    const lastTag = 'testTag';

    semverInc.resetHistory();

    await conventionalCommits.getNextVersion(lastTag);

    t.equals(semverInc.callCount, 1, 'get version increment');
    t.ok(semverInc.calledWith(lastVersionObject, recommendation.releaseType), 'get version increment');

    t.end();
});
