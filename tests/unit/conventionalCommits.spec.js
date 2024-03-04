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
 * Copyright (c) 2023-2024 Open Assessment Technologies SA;
 */

import conventionalCommits from '../../src/conventionalCommits';
import conventionalChangelogCore from 'conventional-changelog-core';
import conventionalPresetConfig from '@oat-sa/conventional-changelog-tao';

jest.mock('conventional-changelog-core', () => {
    const originalModule = jest.requireActual('conventional-changelog-core');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn(() => ({
            on: function (e, callback) {
                if (e === 'end') {
                    callback();
                }

                return this;
            }
        }))
    };
});

jest.mock('@oat-sa/conventional-changelog-tao');
const recommendation = {
    releaseType: 'minor'
};
jest.mock('conventional-recommended-bump', () => {
    const originalModule = jest.requireActual('conventional-recommended-bump');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn((preset, config, callback) => callback(undefined, recommendation))
    };
});

describe('src/conventionalCommits.js', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    afterAll(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });
    it('the conventional commits instance has a buildChangelog method', () => {
        expect(typeof conventionalCommits.buildChangelog).toBe('function');
    });
    it('should get config of conventionalcommits preset', async () => {
        await conventionalCommits.buildChangelog();
        expect(conventionalPresetConfig).toHaveBeenCalled();
    });
    it('should build change log', async () => {
        const context = 'testContext';
        await conventionalCommits.buildChangelog(context);
        expect(conventionalChangelogCore).toHaveBeenCalled();
        expect(conventionalChangelogCore).toHaveBeenCalledWith({config: conventionalPresetConfig()}, context);
    });
    it('the conventional commits instance has a getNextVersion method', () => {
        expect(typeof conventionalCommits.getNextVersion).toBe('function');
    });
    it('the conventional commits instance has a getVersionFromTag method', () => {
        expect(typeof conventionalCommits.getVersionFromTag).toBe('function');
    });
    it('should parse last tag and increment', async () => {
        const lastTag = '1.2.3';
        const lastVersion = conventionalCommits.getVersionFromTag(lastTag);
        expect(lastVersion).toBe('1.2.3');
        const results = await conventionalCommits.getNextVersion(lastVersion);
        expect(results.version).toBe('1.3.0');
    });
    it('should coerce and increment a bad tag', async () => {
        const lastTag = '3.2.5.8';
        const lastVersion = conventionalCommits.getVersionFromTag(lastTag);
        expect(lastVersion).toBe('3.2.5');
        const results = await conventionalCommits.getNextVersion(lastVersion);
        expect(results.version).toBe('3.3.0');
    });
    it('should coerce version with a pre-release', async () => {
        const lastTag = '4.12.13-8';
        const lastVersion = conventionalCommits.getVersionFromTag(lastTag);
        expect(lastVersion).toBe('4.12.13');
        const results = await conventionalCommits.getNextVersion(lastVersion);
        expect(results.version).toBe('4.13.0');
    });
    it('fails when the last cannot be parsed', async () => {
        expect.assertions(2);
        expect(() => conventionalCommits.getVersionFromTag('foo')).toThrow(TypeError('Unable to retrieve last version from tags or the last tag "foo" is not semver compliant'));
        await expect(conventionalCommits.getNextVersion('foo')).rejects.toEqual(Error('Last version "foo" is not semver compliant'));
    });
});
