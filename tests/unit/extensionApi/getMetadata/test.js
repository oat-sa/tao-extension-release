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
 * Unit test the getMetadata method of module src/release/extensionApi.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

const sandbox = sinon.sandbox.create();

const taoRoot = 'taoRoot';
const extension = 'taoFakeExtension';
const repositoryName = 'testRepository';
const data = {
    taoRoot,
    extension: {
        name: extension,
        path: `${taoRoot}/${extension}`
    }
};

const log = {
    exit: () => { },
};
const inquirer = {
    prompt: () => ({ extension, taoRoot }),
};

const taoInstance = {
    getExtensions: () => [],
    getRepoName: () => repositoryName,
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot })
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);

const extensionApi = proxyquire.noCallThru().load('../../../../src/release/extensionApi.js', {
    '../log.js': log,
    '../taoInstance.js': taoInstanceFactory,
    inquirer,
})({}, data);

test('should define getMetadata method on extensionApi instance', (t) => {
    t.plan(1);

    t.ok(typeof extensionApi.getMetadata === 'function', 'The extensionApi instance has getMetadata method');

    t.end();
});

test('should get extension metadata', async (t) => {
    t.plan(2);

    await extensionApi.selectTaoInstance();

    sandbox.stub(taoInstance, 'getRepoName').returns(repositoryName);

    await extensionApi.getMetadata();

    t.equal(taoInstance.getRepoName.callCount, 1, 'Getting of repository name');
    t.ok(taoInstance.getRepoName.calledWith(extension), 'Getting of repository name of appropriate extension');

    sandbox.restore();
    t.end();
});

test('should return metadata object', async (t) => {
    t.plan(2);

    await extensionApi.selectTaoInstance();

    sandbox.stub(taoInstance, 'getRepoName').returns(repositoryName);

    const result = await extensionApi.getMetadata();

    t.ok(typeof result === 'object', 'Returns an object');
    t.ok(result.repoName, 'Returns an object.repoName');

    sandbox.restore();
    t.end();
});
