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
 * Copyright (c) 2019-2021 Open Assessment Technologies SA;
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

const extension = 'testExtension';
const version = '1.1.1';

const data = {
    version,
    extension: { name: extension }
};
const log = {
    info: () => { },
    exit: () => { },
    doing: () => { },
    done: () => { },
};
const inquirer = {
    prompt: () => { },
};

const releaseFactory = proxyquire.noCallThru().load('../../../../src/release.js', {
    './log.js': log,
    inquirer
});

test('should define confirmRelease method on release instance', (t) => {
    t.plan(1);

    const release = releaseFactory();
    t.ok(typeof release.confirmRelease === 'function', 'The release instance has confirmRelease method');

    t.end();
});

test('should prompt to confirm release', async (t) => {
    t.plan(4);

    sandbox.stub(log, 'exit');

    const release = releaseFactory();
    release.setData(data);
    sandbox.stub(inquirer, 'prompt')
        .callsFake(({ type, name, message }) => {
            t.equal(type, 'confirm', 'The type should be "confirm"');
            t.equal(name, 'go', 'The param name should be go');
            t.equal(message, `Let's release version ${extension}@${version} 🚀?`, 'Should display appropriate message');

            return { go: true };
        });

    await release.confirmRelease();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should log exit if release was not confirmed', async (t) => {
    t.plan(1);

    sandbox.stub(inquirer, 'prompt').returns({ go: false });
    sandbox.stub(log, 'exit');

    const release = releaseFactory();
    release.setData(data);
    await release.confirmRelease();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');

    sandbox.restore();
    t.end();
});

test('should log only when not interactive', async (t) => {
    t.plan(3);

    sandbox.stub(inquirer, 'prompt');
    sandbox.stub(log, 'exit');
    sandbox.stub(log, 'info');

    const release = releaseFactory({ interactive : false});
    release.setData(data);
    await release.confirmRelease();

    t.equal(log.info.callCount, 1, 'An info message has been displayed');
    t.equal(inquirer.prompt.callCount, 0, 'No prompt called');
    t.equal(log.exit.callCount, 0, 'Exit is not called');

    sandbox.restore();
    t.end();
});
