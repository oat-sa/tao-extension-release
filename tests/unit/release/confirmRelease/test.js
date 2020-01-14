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
 * Unit test the confirmRelease method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const config = {
    write: () => { },
};
const extension = 'testExtension';
const gitClientInstance = {
    pull: () => { }
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const log = {
    exit: () => { },
    doing: () => { },
    done: () => { },
};
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => { },
};
const version = '1.1.1';
const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({ version, name: extension }),
    getRepoName: () => ''
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const extensionApi = proxyquire.noCallThru().load('../../../../src/release/extensionApi.js', {
    '../taoInstance.js': taoInstanceFactory,
    '../log.js': log,
    inquirer
});
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './release/extensionApi.js': extensionApi,
    inquirer
})();

test('should define confirmRelease method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.confirmRelease === 'function', 'The release instance has confirmRelease method');

    t.end();
});

test('should prompt to confirm release', async (t) => {
    t.plan(4);

    await release.initialiseAdaptee();

    sandbox.stub(log, 'exit');
    sandbox.stub(inquirer, 'prompt')
        .onCall(0).returns({ taoRoot })
        .onCall(1).returns({ extension: '' })
        .onCall(2).returns({ pull: true });
    sandbox.stub(taoInstance, 'isInstalled').returns(false);
    sandbox.stub(taoInstance, 'isRoot').returns({ root: true });
    sandbox.stub(taoInstance, 'getExtensions').returns([]);

    await release.selectTarget();
    await release.verifyBranches();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'go', 'The param name should be go');
        t.equal(message, `Let's release version ${extension}@${version} 🚀 ?`, 'Should disaplay appropriate message');

        return { go: true };
    });

    await release.confirmRelease();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should log exit if release was not confirmed', async (t) => {
    t.plan(1);

    await release.initialiseAdaptee();
    await release.selectTarget();
    await release.verifyBranches();

    sandbox.stub(inquirer, 'prompt').returns({ go: false });
    sandbox.stub(log, 'exit');

    await release.confirmRelease();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');

    sandbox.restore();
    t.end();
});
