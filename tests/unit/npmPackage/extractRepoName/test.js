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
 *
 * Unit test the module src/npm.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const test = require('tape');
const sinon = require('sinon');
const npmPackageFactory = require('../../../../src/npmPackage.js');

const sandbox = sinon.sandbox.create();

test('the module api', t => {
    t.plan(2);

    t.ok(typeof npmPackageFactory === 'function', 'The module exports a function');
    t.ok(typeof npmPackageFactory() === 'object', 'The module function creates an object');

    t.end();
});

const goodUrls = [
    'git+https://github.com/owner/my-cool-repo.git',
    'github.com/owner/my-cool-repo.git'
];

test('the repoName can be extracted', (t) => {
    t.plan(goodUrls.length);

    const npmPackage = npmPackageFactory();

    for (let url of goodUrls) {
        sandbox.stub(npmPackage, 'repository').get(() => ({ url }));

        const result = npmPackage.extractRepoName();

        t.equal(result, 'owner/my-cool-repo', 'The correct repoName was extracted');
    }

    sandbox.restore();
    t.end();
});

const badUrls = [
    'git+https://github.com/owner/my-cool-repo',
    'https://svn.com/owner/my-cool-repo.svn',
];

test('the repoName cannot be extracted', (t) => {
    t.plan(badUrls.length);

    const npmPackage = npmPackageFactory();

    for (let url of badUrls) {
        sandbox.stub(npmPackage, 'repository').get(() => ({ url }));

        const result = npmPackage.extractRepoName();

        t.equal(result, null, 'Returned null for no match');
    }

    sandbox.restore();
    t.end();
});
