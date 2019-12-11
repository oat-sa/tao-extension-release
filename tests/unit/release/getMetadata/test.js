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
 * Unit test the getMetadata method of module src/release.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');
const path = require('path');

const sandbox = sinon.sandbox.create();

const config = {
    write: () => { },
};
const extension = 'testExtension';
const githubFactory = sandbox.stub();
const gitClientInstance = {};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const log = {
    exit: () => { },
};
const taoRoot = 'testRoot';
const manifestPath = path.join(taoRoot, extension, 'manifest.php'); //

const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};
const repositoryName = 'testRepository';
const version = '1.1.1';

const taoInstance = {
    getExtensions: () => [],
    getRepoName: () => repositoryName,
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({ version, name: extension })
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);

const npmPackage = {
    isValidPackage: () => true,
    parsePackageJson: () => ({ version }),
    extractRepoName: () => repositoryName
};
const npmPackageFactory = sandbox.stub().callsFake(() => npmPackage);

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './github.js': githubFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    './npmPackage.js': npmPackageFactory,
    inquirer,
})();

test('should define getMetadata method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.getMetadata === 'function', 'The release instance has getMetadata method');

    t.end();
});

test('should get extension metadata', async (t) => {
    t.plan(4);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(taoInstance, 'parseManifest').returns({ version, name: extension });
    sandbox.stub(taoInstance, 'getRepoName').returns(repositoryName);

    await release.getMetadata();

    t.equal(taoInstance.parseManifest.callCount, 1, 'Parsing of manifest');
    t.ok(taoInstance.parseManifest.calledWith(manifestPath), 'Parsing of manifest of apropriate extension');

    t.equal(taoInstance.getRepoName.callCount, 1, 'Getting of repository name');
    t.ok(taoInstance.getRepoName.calledWith(extension), 'Getting of repository name of apropriate extension');

    sandbox.restore();
    t.end();
});

test('should get package metadata', async (t) => {
    t.plan(1);

    await release.selectPackage();

    sandbox.stub(npmPackage, 'parsePackageJson').returns({ version });

    await release.getMetadata('package');

    t.equal(npmPackage.parsePackageJson.callCount, 1, 'Parsing of package.json');

    sandbox.restore();
    t.end();
});

test('should return metadata object', async (t) => {
    t.plan(4);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(taoInstance, 'parseManifest').returns({ version, name: extension });
    sandbox.stub(taoInstance, 'getRepoName').returns(repositoryName);

    const result = await release.getMetadata();

    t.ok(typeof result === 'object', 'Returns an object');
    t.ok(result.name, 'Returns an object.name');
    t.ok(result.version, 'Returns an object.version');
    t.ok(result.repoName, 'Returns an object.repoName');

    sandbox.restore();
    t.end();
});
