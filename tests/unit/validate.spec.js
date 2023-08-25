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
import validate from '../../src/validate.js';

describe('src/validate.js', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    afterAll(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });
    it('the module api', () => {
        expect(typeof validate).toBe('object');
    });
    it('the githubToken method', async () => {
        expect(typeof validate.githubToken).toBe('function');

        expect(() => validate.githubToken()).toThrow(TypeError);
        expect(() => validate.githubToken('')).toThrow(TypeError);
        expect(() => validate.githubToken('12')).toThrow(TypeError);
        expect(() => validate.githubToken(12)).toThrow(TypeError);
        expect(() => validate.githubToken('AE')).toThrow(TypeError);
        expect(() => validate.githubToken('gho_12345abc')).toThrow(TypeError);

        expect(() => validate.githubToken('foo')).toThrow('The Github token is missing or not well formatted.');
        expect(() => validate.githubToken('foo', 'Custom Message')).toThrow('Custom Message');

        expect(() => validate.githubToken('01AF9E99BFE0')).not.toThrow(TypeError);
        expect(() => validate.githubToken('01af9e99fe012a01')).not.toThrow(TypeError);
        expect(() => validate.githubToken('23acf5dd2087369942acef7a30b4c5e070ee0b79')).not.toThrow(TypeError);
        expect(() => validate.githubToken('ghp_XhtlFn124mUjukG6lzGgJvX6AhC5UZ0PnT5Y')).not.toThrow(TypeError);

        expect(validate.githubToken('01af9e99fe012a01')).toEqual(validate);
    });
    it('the githubRepository method', () => {
        expect(typeof validate.githubRepository).toBe('function');

        expect(() => validate.githubRepository()).toThrow(TypeError);
        expect(() => validate.githubRepository('')).toThrow(TypeError);
        expect(() => validate.githubRepository('foo')).toThrow(TypeError);
        expect(() => validate.githubRepository('tao-core')).toThrow(TypeError);
        expect(() => validate.githubRepository('git@github.com:tao-core.git')).toThrow(TypeError);

        expect(() => validate.githubRepository('foo')).toThrow('The Github repository identifier is missing or not well formatted, we expect the short version org-name/repo-name.');
        expect(() => validate.githubRepository('foo', 'Custom Message')).toThrow('Custom Message');

        expect(() => validate.githubRepository('oat-sa/tao-core')).not.toThrow(TypeError);
        expect(() => validate.githubRepository('fooOrg/awsome-list_3')).not.toThrow(TypeError);

        expect(validate.githubRepository('oat-sa/tao-core')).toEqual(validate);
    });


    it('the prNumber method', () => {
        expect(typeof validate.prNumber).toBe('function');

        expect(() => validate.prNumber()).toThrow(TypeError);
        expect(() => validate.prNumber(null)).toThrow(TypeError);
        expect(() => validate.prNumber('')).toThrow(TypeError);
        expect(() => validate.prNumber('2.5')).toThrow(TypeError);
        expect(() => validate.prNumber(-1)).toThrow(TypeError);
        expect(() => validate.prNumber(0)).toThrow(TypeError);
        expect(() => validate.prNumber('-50')).toThrow(TypeError);

        expect(() => validate.prNumber('foo')).toThrow('The given number is missing or not a valid Pull Request number');
        expect(() => validate.prNumber('foo', 'Custom Message')).toThrow('Custom Message');

        expect(() => validate.prNumber('1265')).not.toThrow(TypeError);
        expect(() => validate.prNumber(41)).not.toThrow(TypeError);
        expect(() => validate.prNumber(1)).not.toThrow(TypeError);
        expect(() => validate.prNumber(999999)).not.toThrow(TypeError);

        expect(validate.prNumber(12)).toEqual(validate);
    });
});
