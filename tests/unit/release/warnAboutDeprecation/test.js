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
 * Copyright (c) 2019-2020 Open Assessment Technologies SA;
 */

/**
 * Unit test the warnAboutDeprecation method of module src/release.js
 *
 * @author Ricardo Proença <ricardo@taotesting.com>
 */

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const test = require('tape');

const sandbox = sinon.sandbox.create();

const log = {
    exit: () => { }
};

const inquirer = {
    prompt: () => {},
};

const release = proxyquire.noCallThru().load('../../../../src/release.js', {
    './git.js': {},
    './log.js': log,
    inquirer,
})();

test('should define warnAboutDeprecation method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof release.warnAboutDeprecation === 'function', 'The release instance has warnAboutDeprecation method');

    t.end();
});

test('should prompt to confirm release', async (t) => {
    t.plan(4);

    sandbox.stub(inquirer, 'prompt').callsFake(({ type, name, message }) => {
        t.equal(type, 'confirm', 'The type should be "confirm"');
        t.equal(name, 'isOldWayReleaseSelected', 'The param name should be isOldWayReleaseSelected');
        t.equal(message, 'This release process is deprecated. Are you sure you want to continue?', 'Should display appropriate message');

        return { go: true };
    });

    await release.warnAboutDeprecation();

    t.equal(inquirer.prompt.callCount, 1, 'Prompt has been initialised');

    sandbox.restore();
    t.end();
});

test('should log exit if release was not confirmed', async (t) => {
    t.plan(1);

    sandbox.stub(inquirer, 'prompt').returns({ go: false });
    sandbox.stub(log, 'exit');

    await release.warnAboutDeprecation();

    t.equal(log.exit.callCount, 1, 'Exit has been logged');

    sandbox.restore();
    t.end();
});
