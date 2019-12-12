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
 * Unit test the selectPackage method of module src/release.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');
const fs = require('fs');

const sandbox = sinon.sandbox.create();

const config = {
    write: () => { },
};
const log = {
    exit: () => { },
    error: () => { }
};
const gitClientFactory = sandbox.stub();
const origin = 'testOrigin';
const taoRoot = 'testRoot';
const packageName = 'test-package';
const npmPackage = {
    name: packageName,
    isValidPackage: () => true,
};
const npmPackageFactory = sandbox.stub().callsFake(() => npmPackage);

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './npmPackage.js': npmPackageFactory,
})({ origin });

test('should define selectPackage method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.selectPackage === 'function', 'The release instance has selectPackage method');

    t.end();
});

test('should verify existence of package.json in current dir', async (t) => {
    t.plan(2);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);

    await release.selectPackage();

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

    await release.selectPackage();

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

    await release.selectPackage();

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

    await release.selectPackage();

    t.equal(npmPackage.isValidPackage.callCount, 1, 'isValidPackage has been called');
    t.equal(log.error.callCount, 1, 'log.error has been called');
    t.equal(log.exit.callCount, 1, 'log.exit has been called');

    sandbox.restore();
    t.end();
});

test('should create gitClient instance', async (t) => {
    t.plan(2);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(npmPackage, 'isValidPackage').returns(true);

    gitClientFactory.resetHistory();

    await release.selectPackage();

    t.equal(gitClientFactory.callCount, 1, 'gitClient instance has been created');
    t.ok(gitClientFactory.calledWith(`${taoRoot}`, origin), 'gitClient instance has been created with appropriate args');

    sandbox.restore();
    t.end();
});

test('should save selected package to config', async (t) => {
    t.plan(2);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(npmPackage, 'isValidPackage').returns(true);
    sandbox.stub(config, 'write');

    await release.selectPackage();

    t.equal(config.write.callCount, 1, 'Config has been saved');
    t.ok(config.write.calledWith({
        package: {
            path: taoRoot,
            name: packageName,
        }
    }), 'Package has been saved to config');

    sandbox.restore();
    t.end();
});
