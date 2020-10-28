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
 * Unit test the updateVersion method of module src/taoInstance.js
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const manifestContent = '\'version\' => \'1.1.0\'';
const manifestPath = '/test/manifest.php';
const version = '1.1.1';

const fs = {
    readFile: sandbox.stub().callsFake((path, enc, callback) => callback(undefined, manifestContent)),
    writeFile: sandbox.stub().callsFake((path, data, enc, callback) => callback(undefined)),
};

const taoInstance = proxyquire.noCallThru().load('../../../../src/taoInstance.js', {
    'fs': fs,
})();

test('should define updateVersion method on tao instance', (t) => {
    t.plan(1);

    t.ok(typeof taoInstance.updateVersion === 'function', 'The release instance has updateVersion method');

    t.end();
});

test('should read manifest file', async (t) => {
    t.plan(2);

    fs.readFile.resetHistory();

    await taoInstance.updateVersion(manifestPath, version);

    t.equals(fs.readFile.callCount, 1, 'read manifest file');
    t.ok(fs.readFile.calledWith(manifestPath, 'utf8'), 'read manifest file');

    t.end();
});

test('should write manifest file', async (t) => {
    t.plan(2);

    fs.writeFile.resetHistory();

    await taoInstance.updateVersion(manifestPath, version);

    t.equals(fs.writeFile.callCount, 1, 'write manifest file');
    t.ok(fs.writeFile.calledWith(manifestPath, '\'version\' => \'1.1.1\'', 'utf8'), 'write manifest file');

    t.end();
});
