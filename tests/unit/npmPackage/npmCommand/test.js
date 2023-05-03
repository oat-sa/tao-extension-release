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
 * Unit test the method npmCommand of module src/npmPackage.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

import proxyquire from 'proxyquire';
import tape from 'tape';
import _test  from 'tape-promise';
const test = _test(tape); // decorate tape

const log = {
    doing: () => { },
    done: () => { },
    info: () => { },
    exit: () => { },
    error: () => { }
};
const crossSpawn = {
    default: () => Promise.resolve(0)
};

const npmPackage = proxyquire.noCallThru().load('../../../../src/npmPackage.js', {
    'cross-spawn': crossSpawn,
    './log.js': log,
})();

test('should define npmCommand method on release instance', (t) => {
    t.plan(1);

    t.ok(typeof npmPackage.npmCommand === 'function', 'The release instance has npmCommand method');

    t.end();
});

test('npmCommand should have correct return type', (t) => {
    t.plan(1);

    t.ok(npmPackage.npmCommand() instanceof Promise, 'npmCommand returns a Promise');

    t.end();
});

test('npmCommand should reject on invalid params', (t) => {
    npmPackage.npmCommand(['my', 'command'])
        .then(() => {
            t.fail('Should not resolve here');
        })
        .catch(() => {
            t.pass('Should catch rejection');
        })
        .finally(() => t.end());
});
