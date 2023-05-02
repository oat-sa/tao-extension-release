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
 * Unit test the loadConfig method of module src/release.js
 *
 * @author Anton Tsymuk <anton@taotesting.com>
 */

import proxyquire from 'proxyquire';
import sinon from 'sinon';
import test from 'tape';

const sandbox = sinon.sandbox.create();

const config = {
    load: () => ({}),
    write: () => { },
};
const inquirer = {
    prompt: () => ({}),
};
const log = {
    exit: () => { },
};
const open = sandbox.spy();
const releaseFactory = proxyquire.noCallThru().load('../../../../src/release.js', {
    './config.js': () => config,
    './log.js': log,
    inquirer,
    open,
});

test('should define loadConfig method on release instance', (t) => {
    t.plan(1);

    const release = releaseFactory();
    t.equal(typeof release.loadConfig, 'function', 'The release instance has loadConfig method');

    t.end();
});

test('should load config', async (t) => {
    t.plan(1);

    const data = { token: 'testToken' };

    sandbox.stub(config, 'load').returns(data);

    const release = releaseFactory();
    await release.loadConfig();

    t.equal(config.load.callCount, 1, 'Config has been loaded');

    sandbox.restore();
    t.end();
});

test('should open github token settings if there is no token in the config', async (t) => {
    t.plan(2);

    const clock = sandbox.useFakeTimers();

    const release = releaseFactory();
    await release.loadConfig();

    clock.tick(2000);

    t.equal(open.callCount, 1, 'Config has been loaded');
    t.ok(open.calledWith('https://github.com/settings/tokens'));

    clock.restore();
    sandbox.restore();
    t.end();
});

test('should prompt user to provide a token if there is no token in the config', async (t) => {
    t.plan(4);

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'input', 'The type should be "input"');
        t.equal(name, 'token', 'The param name should be token');
        t.equal(message, 'I need a Github token, with "repo" rights (check your browser) : ', 'Should display appropriate message');

        return {};
    });

    const release = releaseFactory();
    await release.loadConfig();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should validate provided token', async (t) => {
    t.plan(2);

    const validToken = 'hsajdf234jhsaj234dfhh234asj32dfh';
    const invalidToken = 'invalidToken';

    sandbox.stub(inquirer, 'prompt').callsFake(({ validate }) => {
        t.ok(validate(validToken), 'Validate valid token');
        t.notOk(validate(invalidToken), 'Validate invalid token');

        return {};
    });

    const release = releaseFactory();
    await release.loadConfig();

    sandbox.restore();
    t.end();
});

test('should trim token', async (t) => {
    t.plan(1);

    sandbox.stub(inquirer, 'prompt').callsFake(({ filter }) => {
        t.equal(filter('   testToken   '), 'testToken', 'Validate valid token');

        return {};
    });

    const release = releaseFactory();
    await release.loadConfig();

    sandbox.restore();
    t.end();
});

test('should save provided token', async (t) => {
    t.plan(2);

    const token = 'testToken';

    sandbox.stub(config, 'write');

    sandbox.stub(inquirer, 'prompt').returns({ token });

    const release = releaseFactory();
    await release.loadConfig();

    t.equal(config.write.callCount, 1, 'The config has been saved');
    t.ok(config.write.calledWith({ token }), 'The token has been saved in the config');

    sandbox.restore();
    t.end();
});

test('should exit without a token in non interaction mode', async (t) => {
    t.plan(2);

    sandbox.stub(inquirer, 'prompt');
    sandbox.stub(log, 'exit');

    const release = releaseFactory({ interactive: false });
    await release.loadConfig();


    t.equal(inquirer.prompt.callCount, 0, 'No prompt is displayed');
    t.equal(log.exit.callCount, 1, 'Without a token we exit');

    sandbox.restore();
    t.end();
});

test('fallback to env token if not set', async (t) => {
    t.plan(2);

    const release = releaseFactory();
    t.equal(typeof release.getData().token, 'undefined', 'The token is not set');

    process.env.GITHUB_TOKEN = 'foo';
    await release.loadConfig();

    t.equal(release.getData().token, 'foo', 'The token is read from env');

    sandbox.restore();

    delete process.env.GITHUB_TOKEN;
    t.end();
});
