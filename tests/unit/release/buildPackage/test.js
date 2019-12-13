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
 * Unit test the buildPackage method of module src/release.js
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
    doing: () => { },
    done: () => { },
    info: () => { },
    exit: () => { },
    error: () => { }
};
const origin = 'testOrigin';
const taoRoot = 'testRoot';
const packageName = 'test-package';
const npmPackage = {
    name: packageName,
    isValidPackage: () => true,
    build: () => { }
};
const gitClient = {
    commitAndPush: () => []
};
const npmPackageFactory = sandbox.stub().callsFake(() => npmPackage);
const gitClientFactory = sandbox.stub().callsFake(() => gitClient);

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './npmPackage.js': npmPackageFactory,
})({ origin });

test('should define buildPackage method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.buildPackage === 'function', 'The release instance has buildPackage method');

    t.end();
});

test('should call package build command', async (t) => {
    t.plan(1);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(npmPackage, 'build').returns(Promise.resolve());

    await release.selectPackage();
    await release.buildPackage();

    t.equal(npmPackage.build.callCount, 1, 'npmPackage.build has been called');

    sandbox.restore();
    t.end();
});

test('should commit and push changed files', async (t) => {
    t.plan(2);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(npmPackage, 'isValidPackage').returns(true);
    sandbox.stub(npmPackage, 'build').returns(Promise.resolve());
    sandbox.stub(gitClient, 'commitAndPush').returns(['changed1', 'changed2']);
    sandbox.stub(log, 'info');

    await release.selectPackage();
    await release.buildPackage();

    t.equal(gitClient.commitAndPush.callCount, 1, 'commitAndPush has been called');
    t.equal(log.info.callCount, 3, 'all changed files were logged');

    sandbox.restore();
    t.end();
});

test('should log error if build throws error', async (t) => {
    t.plan(4);

    sandbox.stub(process, 'cwd').returns(taoRoot);
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(npmPackage, 'isValidPackage').returns(true);
    sandbox.stub(npmPackage, 'build').throws(new Error('Build error'));
    sandbox.stub(gitClient, 'commitAndPush').returns(['changed1', 'changed2']);
    sandbox.stub(log, 'error').returns({
        exit: sandbox.stub(log, 'exit')
    });

    await release.selectPackage();
    await release.buildPackage();

    t.equal(gitClient.commitAndPush.callCount, 0, 'commitAndPush has not been called');
    t.equal(log.error.callCount, 1, 'log.error has been called');
    t.ok(log.error.calledWith('Unable to build package. Build error. Continue.'), 'log.error has been called with correct message');
    t.equal(log.exit.callCount, 0, 'log.exit has not been called');

    sandbox.restore();
    t.end();
});


