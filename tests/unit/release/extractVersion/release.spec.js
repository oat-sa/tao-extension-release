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
jest.mock('../../../../src/log.js', () => ({
    error: jest.fn(() => ({
        exit: jest.fn()
    })),
    exit: jest.fn(() => ({
        exit: jest.fn()
    })),
    doing: jest.fn(),
    info: jest.fn(),
    done: jest.fn(),
    warn: jest.fn()
}));

jest.mock('inquirer', () => ({
    prompt: jest.fn(() => ({ }))
}));

jest.mock('../../../../src/git.js', () => {
    const originalModule = jest.requireActual('../../../../src/git.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn(() => ({
            tag:  jest.fn(arg => arg),
            localBranch:  jest.fn(arg => arg),
            push:  jest.fn(arg => arg),
            hasBranch:  jest.fn(),
            hasTag: jest.fn(),
            getLastTag: jest.fn().mockResolvedValue('v1.2.3'),
            hasDiff:  jest.fn(() => true),
            mergeBack: jest.fn()
        }))
    };
});

jest.mock('../../../../src/conventionalCommits.js', () => {
    const originalModule = jest.requireActual('../../../../src/conventionalCommits.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        getNextVersion: jest.fn()
    };
});

import log from '../../../../src/log.js';
import inquirer from 'inquirer';
import conventionalCommits from '../../../../src/conventionalCommits.js';
import releaseFactory from '../../../../src/release.js';

const branchPrefix = 'release';
const releaseBranch = 'testReleaseBranch';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';
const baseBranch = 'testBaseBranch';

beforeEach(() => {
    jest.spyOn(process, 'stdin', 'get').mockReturnValue({ isTTY: true });
});
afterEach(() => {
    jest.clearAllMocks();
});
afterAll(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

describe('src/release.js extractVersion', () => {

    test('should define extractVersion method on release instance', () => {
        expect.assertions(1);

        const release = releaseFactory();
        expect(typeof release.extractVersion).toBe('function');
    });

    test('should extract version from conventional commits', async () => {
        expect.assertions(5);

        jest.spyOn(conventionalCommits, 'getVersionFromTag').mockImplementationOnce(() => '1.2.3');
        jest.spyOn(conventionalCommits, 'getNextVersion').mockImplementationOnce(() => ({
            version: '1.3.0',
            recommendation: {
                stats : {
                    unset : 0,
                    commits: 2,
                    features: 1,
                    fix: 0,
                    breakings: 0
                }
            }
        }));

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.extractVersion();

        const data = release.getData();
        expect(data.lastVersion).toBe('1.2.3');
        expect(data.lastTag).toBe('v1.2.3');
        expect(data.version).toBe('1.3.0');
        expect(data.tag).toBe('v1.3.0');
        expect(data.releasingBranch).toBe('release-1.3.0');
    });

    test('should extract version from given value', async () => {
        expect.assertions(5);

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch, releaseVersion : '2.0.1' });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(conventionalCommits, 'getVersionFromTag').mockImplementationOnce(() => '1.2.3');
        jest.spyOn(conventionalCommits, 'getNextVersion').mockImplementationOnce(() => ({
            version: '1.3.0',
            recommendation: {
                stats : {
                    unset : 0,
                    commits: 2,
                    features: 1,
                    fix: 0,
                    breakings: 0
                }
            }
        }));

        await release.initialiseGitClient();
        await release.extractVersion();

        const data = release.getData();
        expect(data.lastVersion).toBe('1.2.3');
        expect(data.lastTag).toBe('v1.2.3');
        expect(data.version).toBe('2.0.1');
        expect(data.tag).toBe('v2.0.1');
        expect(data.releasingBranch).toBe('release-2.0.1');
    });

    test('exit when trying to release from a version lower than the last version', async () => {
        expect.assertions(2);

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch, releaseVersion : '1.0.0' });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(conventionalCommits, 'getVersionFromTag').mockImplementationOnce(() => '1.2.3');
        jest.spyOn(conventionalCommits, 'getNextVersion').mockImplementationOnce(() => ({
            version: '1.3.0',
            recommendation: {
                stats : {
                    unset : 0,
                    commits: 2,
                    features: 1,
                    fix: 0,
                    breakings: 0
                }
            }
        }));

        await release.initialiseGitClient();
        await release.extractVersion();

        expect(log.exit).toBeCalledTimes(1);
        expect(log.exit).toBeCalledWith('The provided version is lesser than the latest version 1.2.3.');
    });

    test('warn when no conventional commits are found', async () => {
        expect.assertions(4);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('acceptDefaultVersion');
            expect(message).toBe('There are some non conventional commits. Are you sure you want to continue?');

            return { acceptDefaultVersion: true };
        });

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(conventionalCommits, 'getVersionFromTag').mockImplementationOnce(() => '1.2.3');
        jest.spyOn(conventionalCommits, 'getNextVersion').mockImplementationOnce(() => ({
            version: '1.2.4',
            recommendation: {
                stats : {
                    unset : 7,
                    commits: 8,
                    features: 0,
                    fix: 0,
                    breakings: 0
                }
            }
        }));

        await release.initialiseGitClient();
        await release.extractVersion();

        expect(inquirer.prompt).toBeCalledTimes(1);
    });

    test('warn when no new commits are found', async () => {
        expect.assertions(5);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('releaseAgain');
            expect(message).toBe('There\'s no new commits, do you really want to release a new version?');

            return { releaseAgain: false };
        });

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(conventionalCommits, 'getVersionFromTag').mockImplementationOnce(() => '1.2.3');
        jest.spyOn(conventionalCommits, 'getNextVersion').mockImplementationOnce(() => ({
            version: '1.2.4',
            recommendation: {
                stats : {
                    unset : 0,
                    commits: 0,
                    features: 0,
                    fix: 0,
                    breakings: 0
                }
            }
        }));

        await release.initialiseGitClient();
        await release.extractVersion();

        expect(inquirer.prompt).toBeCalledTimes(1);
        expect(log.exit).toBeCalledTimes(1);
    });
});
