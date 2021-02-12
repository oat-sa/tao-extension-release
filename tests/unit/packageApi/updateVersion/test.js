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
 * Unit test the updateVersion method of module src/release/packageApi.js
 */
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const version = '1.1.1';

const npmPackage = {
    updateVersion: () => true,
};
const npmPackageFactory = sandbox.stub().callsFake(() => npmPackage);

const packageApi = proxyquire.noCallThru().load('../../../../src/release/packageApi.js', {
    '../npmPackage.js': npmPackageFactory,
})({}, { version });

test('should define updateVersion method on packageApi instance', (t) => {
    t.plan(1);

    t.ok(typeof packageApi.updateVersion === 'function', 'The packageApi instance has selectTarget method');

    t.end();
});

test('should call updateVersion method of npmPackage', async (t) => {
    t.plan(2);

    sandbox.stub(npmPackage, 'updateVersion');

    packageApi.npmPackage = npmPackage;

    await packageApi.updateVersion();

    t.equal(npmPackage.updateVersion.callCount, 1, 'updateVersion has been called');
    t.ok(npmPackage.updateVersion.calledWith(undefined, version), 'updateVersion has been called');

    sandbox.restore();
    t.end();
});

