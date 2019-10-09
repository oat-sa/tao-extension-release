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
 * Unit test the verifyBranches method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const baseBranch = 'testBaseBranch';
const config = {
    write: () => { },
};
const extension = 'testExtension';
const gitClientInstance = {
    pull: () => { },
};
const gitClientFactory = sandbox.stub().callsFake(() => gitClientInstance);
const log = {
    doing: () => { },
    exit: () => { },
};
const taoRoot = 'testRoot';
const inquirer = {
    prompt: () => ({ extension, pull: true, taoRoot }),
};
const releaseBranch = 'testReleaseBranch';
const taoInstance = {
    getExtensions: () => [],
    isInstalled: () => true,
    isRoot: () => ({ root: true, dir: taoRoot }),
    parseManifest: () => ({}),
};
const taoInstanceFactory = sandbox.stub().callsFake(() => taoInstance);
const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './git.js': gitClientFactory,
    './log.js': log,
    './taoInstance.js': taoInstanceFactory,
    inquirer,
})({ baseBranch, releaseBranch });

test('should define verifyBranches method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.verifyBranches === 'function', 'The release instance has verifyBranches method');

    t.end();
});

test('should prompt to pull branches', async (t) => {
    t.plan(4);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'pull', 'The param name should be pull');
        t.equal(message, `Can I checkout and pull ${baseBranch} and ${releaseBranch}  ?`, 'Should disaplay appropriate message');

        return { pull: true };
    });

    await release.verifyBranches();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should log exit if pull not confirmed', async (t) => {
    t.plan(1);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(inquirer, 'prompt').returns({ pull: false });
    sandbox.stub(log, 'exit');

    await release.verifyBranches();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');

    sandbox.restore();
    t.end();
});

test('should log doing message', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(log, 'doing');

    await release.verifyBranches();

    t.equal(log.doing.callCount, 1, 'Doing has been logged');
    t.ok(log.doing.calledWith(`Updating ${extension}`), 'Doing has been logged with apropriate message');

    sandbox.restore();
    t.end();
});

test('should pull release branch', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'pull');

    await release.verifyBranches();

    t.equal(gitClientInstance.pull.callCount, 2, 'Branches have been pulled');
    t.ok(gitClientInstance.pull.calledWith(releaseBranch), 'Release branch have been pulled');

    sandbox.restore();
    t.end();
});

test('should parse extension manifes', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(taoInstance, 'parseManifest').returns({});

    await release.verifyBranches();

    t.equal(taoInstance.parseManifest.callCount, 2, 'Extension manifest has been parsed');
    t.ok(taoInstance.parseManifest.calledWith(`${taoRoot}/${extension}/manifest.php`), 'Extension manifest has been parsed from appropriated extension');

    sandbox.restore();
    t.end();
});

test('should pull base branch', async (t) => {
    t.plan(2);

    await release.selectTaoInstance();
    await release.selectExtension();

    sandbox.stub(gitClientInstance, 'pull');

    await release.verifyBranches();

    t.equal(gitClientInstance.pull.callCount, 2, 'Branches have been pulled');
    t.ok(gitClientInstance.pull.calledWith(releaseBranch), 'Base branch have been pulled');

    sandbox.restore();
    t.end();
});
