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
 * Copyright (c) 2023 Open Assessment Technologies SA;
 */

import config from '../../src/config.js';
jest.mock('fs-extra');
import fs from 'fs-extra';

describe('src/config.js', () => {
    it('the module exports a function', () => {
        expect(typeof config).toBe('function');
    });
    it('the module function creates an object', () => {
        expect(typeof config()).toBe('object');
    });
    it('the created object has a load method', async () => {
        expect(typeof config().load).toBe('function');
        jest.spyOn(fs, 'readJSON').mockImplementationOnce(() => Promise.resolve(true));
        await config().load();
        expect(fs.readJSON).toBeCalledTimes(1);
    });
    it('the created object has a write method', async () => {
        expect(typeof config().write).toBe('function');
        jest.spyOn(fs, 'writeJson').mockImplementationOnce(() => true);
        await config().write();
        expect(fs.writeJson).toBeCalledTimes(1);
    });
});
