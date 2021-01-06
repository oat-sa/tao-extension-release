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
 * Unit test the updateVersion method of module src/release/extensionApi.js
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const taoRoot = 'taoRoot';
const extension = 'taoFakeExtension';
const version = '1.1.1';
const data = {
    taoRoot,
    extension: {
        name: extension,
        path: `${taoRoot}/${extension}`
    },
    version,
};

const log = {
    exit: () => { },
};

const taoInstance = {
    updateVersion: () => [],
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);

const extensionApi = proxyquire.noCallThru().load('../../../../src/release/extensionApi.js', {
    '../log.js': log,
    '../taoInstance.js': taoInstanceFactory,
})({}, data);

test('should define updateVersion method on extensionApi instance', (t) => {
    t.plan(1);

    t.ok(typeof extensionApi.updateVersion === 'function', 'The extensionApi instance has updateVersion method');

    t.end();
});

test('should call updateVersion method of npmPackage', async (t) => {
    t.plan(2);

    sandbox.stub(taoInstance, 'updateVersion');

    extensionApi.taoInstance = taoInstance;

    await extensionApi.updateVersion();

    t.equal(taoInstance.updateVersion.callCount, 1, 'updateVersion has been called');
    t.ok(taoInstance.updateVersion.calledWith(`${data.extension.path}/manifest.php`, version), 'updateVersion has been called');

    sandbox.restore();
    t.end();
});
