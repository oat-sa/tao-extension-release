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
 * Unit test the method isValidPackage of module src/npmPackage.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const proxyquire = require('proxyquire');
const test = require('tape');
const sinon = require('sinon');

const sandbox = sinon.sandbox.create();

const log = {
    doing: () => { },
    done: () => { },
    info: () => { },
    exit: () => { },
    error: () => { }
};
const npmPackage = proxyquire.noCallThru().load('../../../../src/npmPackage.js', {
    './log.js': log,
})();

test('should define isValidPackage method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof npmPackage.isValidPackage === 'function', 'The release instance has isValidPackage method');

    t.end();
});

const validPackageData = {
    name: 'my-package',
    version: '1.2.3',
    repository: {
        url: 'https://example.com/owner/my-package.git'
    }
};

test('read a valid package', async (t) => {
    t.plan(1);

    sandbox.stub(npmPackage, 'parsePackageJson').returns(Promise.resolve(validPackageData));

    const result = await npmPackage.isValidPackage();

    t.equal(result, true, 'The valid package was validated');

    sandbox.restore();
    t.end();
});

const invalidPackageData = {
    name: 'my-package',
    version: '1.2.3'
};

test('read an invalid package', async (t) => {
    t.plan(1);

    sandbox.stub(npmPackage, 'parsePackageJson').returns(Promise.resolve(invalidPackageData));

    const result = await npmPackage.isValidPackage();

    t.equal(result, false, 'The invalid package was not validated');

    sandbox.restore();
    t.end();
});