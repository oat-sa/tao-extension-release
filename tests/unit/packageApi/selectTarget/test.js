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
 * Unit test the selectTarget method of module src/release/packageApi.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');
const fs = require('fs');

const sandbox = sinon.sandbox.create();

const log = {
    exit: () => { },
    error: () => { }
};
const taoRoot = 'taoRoot';
const packageName = 'tao-fake-package';
const npmPackage = {
    name: packageName,
    isValidPackage: () => true,
};
const npmPackageFactory = sandbox.stub().callsFake(() => npmPackage);

const packageApi = proxyquire.noCallThru().load('../../../../src/release/packageApi.js', {
    '../log.js': log,
    '../npmPackage.js': npmPackageFactory,
})({ interactive: true });

test('should define selectTarget method on packageApi instance', (t) => {
    t.plan(1);

    t.ok(typeof packageApi.selectTarget === 'function', 'The packageApi instance has selectTarget method');

    t.end();
});

test('should verify existence of package.json in current dir', async (t) => {
    t.plan(2);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);

    await packageApi.selectTarget();

    t.equal(fs.existsSync.callCount, 1, 'fs.existsSync has been called');
    t.ok(fs.existsSync.calledWith(taoRoot + '/package.json'), 'Correct package.json has been accessed');

    sandbox.restore();
    t.end();
});

test('should log error if no package.json in current dir', async (t) => {
    t.plan(3);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(false);
    sandbox.stub(log, 'error').returns({
        exit: sandbox.stub(log, 'exit')
    });

    log.error.resetHistory();
    log.exit.resetHistory();

    await packageApi.selectTarget();

    t.equal(fs.existsSync.callCount, 1, 'fs.existsSync has been called');
    t.equal(log.error.callCount, 1, 'log.error has been called');
    t.equal(log.exit.callCount, 1, 'log.exit has been called');

    sandbox.restore();
    t.end();
});

test('should verify validity of package.json in current dir', async (t) => {
    t.plan(1);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(npmPackage, 'isValidPackage').returns(true);

    await packageApi.selectTarget();

    t.equal(npmPackage.isValidPackage.callCount, 1, 'isValidPackage has been called');

    sandbox.restore();
    t.end();
});

test('should log error if package.json is invalid', async (t) => {
    t.plan(3);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(npmPackage, 'isValidPackage').returns(false);
    sandbox.stub(log, 'error').returns({
        exit: sandbox.stub(log, 'exit')
    });

    log.error.resetHistory();
    log.exit.resetHistory();

    await packageApi.selectTarget();

    t.equal(npmPackage.isValidPackage.callCount, 1, 'isValidPackage has been called');
    t.equal(log.error.callCount, 1, 'log.error has been called');
    t.equal(log.exit.callCount, 1, 'log.exit has been called');

    sandbox.restore();
    t.end();
});

test('should return selected package data', async (t) => {
    t.plan(1);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(npmPackage, 'isValidPackage').returns(true);

    const res = await packageApi.selectTarget();

    t.deepEqual(res, {
        package: {
            path: taoRoot,
            name: packageName
        },
    }, 'Return value is correct');

    sandbox.restore();
    t.end();
});
