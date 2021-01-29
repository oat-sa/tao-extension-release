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
 * Unit test the selectTarget method of module src/release/repositoryApi.js
 *
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const log = {
    exit: () => { },
    error: () => { }
};
const gitClient = {
    getRepositoryName: () => {}
};

const repositoryApi = proxyquire.noCallThru().load('../../../../src/release/repositoryApi.js', {
    '../log.js': log,
    '../git.js': function(){
        return gitClient;
    }
})();

test('should define selectTarget method on repositoryApi instance', (t) => {
    t.plan(1);

    t.ok(typeof repositoryApi.selectTarget === 'function', 'The repositoryApi instance has selectTarget method');

    t.end();
});

test('should return selected target data', async (t) => {
    t.plan(1);

    const path = '/foo/bar';
    const name = 'oat-sa/tao-extension-release';
    sandbox.stub(process, 'cwd').returns(path);
    sandbox.stub(gitClient, 'getRepositoryName').returns(name);

    const res = await repositoryApi.selectTarget();

    t.deepEqual(res, {
        repository: {
            path,
            name
        },
    }, 'Return value is correct');

    sandbox.restore();
    t.end();
});

test('should log error if package.json is invalid', async (t) => {
    t.plan(3);

    const path = '/foo/bar';
    sandbox.stub(process, 'cwd').returns(path);
    sandbox.stub(log, 'error').returns({
        exit: sandbox.stub(log, 'exit')
    });
    sandbox.stub(gitClient, 'getRepositoryName').returns(Promise.reject(new Error('Not a git repo')));
    log.error.resetHistory();
    log.exit.resetHistory();

    await repositoryApi.selectTarget();

    t.equal(gitClient.getRepositoryName.callCount, 1, 'get repositoryName hgas been called');
    t.equal(log.error.callCount, 1, 'log.error has been called');
    t.equal(log.exit.callCount, 1, 'log.exit has been called');

    sandbox.restore();
    t.end();
});
