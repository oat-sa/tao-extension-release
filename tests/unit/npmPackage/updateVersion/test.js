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
 * Unit test the method updateVersion of module src/npmPackage.js
 */

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

const folderName = 'folderName';
const version = '1.1.1';

const sandbox = sinon.sandbox.create();

const readPkg = sinon.stub().returns({});
const writePkg = sinon.stub();

const crossSpawn = () => ({
    on: (e, callback) => callback(0),
});


const npmPackage = proxyquire.noCallThru().load('../../../../src/npmPackage.js', {
    'cross-spawn': crossSpawn,
    'read-pkg': readPkg,
    'write-pkg': writePkg,
})();

test('should define updateVersion method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof npmPackage.updateVersion === 'function', 'The release instance has updateVersion method');

    t.end();
});

test('should read package.sjon', async (t) => {
    t.plan(2);

    readPkg.reset();
    readPkg.returns({});

    await npmPackage.updateVersion(folderName);

    t.equal(readPkg.callCount, 1, 'read package.json');
    t.ok(readPkg.calledWith({ cwd: folderName }), 'read package.json');

    sandbox.restore();
    t.end();
});

test('should write package.sjon', async (t) => {
    t.plan(2);

    writePkg.reset();

    await npmPackage.updateVersion(folderName, version);

    t.equal(writePkg.callCount, 1, 'write package.json');
    t.ok(writePkg.calledWith(folderName, { version }), 'write package.json');

    sandbox.restore();
    t.end();
});
