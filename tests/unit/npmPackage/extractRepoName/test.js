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
 *
 * Unit test the extractRepoName method of module src/npmPackage.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

import sinon from 'sinon';
import test from 'tape';
import npmPackageFactory from '../../../../src/npmPackage.js';
const npmPackage = npmPackageFactory();

const sandbox = sinon.sandbox.create();

test('should define extractRepoName method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof npmPackage.extractRepoName === 'function', 'The release instance has extractRepoName method');

    t.end();
});

const goodUrls = [
    'git+https://github.com/owner/my-cool-repo.git',
    'github.com/owner/my-cool-repo.git'
];

test('the repoName can be extracted', (t) => {
    t.plan(goodUrls.length);

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

    for (let url of badUrls) {
        sandbox.stub(npmPackage, 'repository').get(() => ({ url }));

        const result = npmPackage.extractRepoName();

        t.equal(result, null, 'Returned null for no match');
    }

    sandbox.restore();
    t.end();
});
