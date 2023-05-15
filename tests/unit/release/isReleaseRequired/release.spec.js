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
            getLastTag: jest.fn(),
            hasDiff:  jest.fn(() => true),
            mergeBack: jest.fn()
        }))
    };
});

import log from '../../../../src/log.js';
import inquirer from 'inquirer';
import git from '../../../../src/git.js';
import releaseFactory from '../../../../src/release.js';

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

describe('src/release.js isReleaseRequired', () => {
    test('should define isReleaseRequired method on release instance', () => {
        expect.assertions(1);

        const release = releaseFactory();
        expect(typeof release.isReleaseRequired).toBe('function');
    });

    test('should check for diffs between base and release branches', async () => {
        expect.assertions(2);

        const hasDiff = jest.fn(() => true);
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                hasDiff
            };
        });

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.isReleaseRequired();

        expect(hasDiff).toBeCalledTimes(1);
        expect(hasDiff).toBeCalledWith(baseBranch, releaseBranch);
    });

    test('should prompt about release if there is no diffs', async () => {
        expect.assertions(4);

        const hasDiff = jest.fn(() => false);
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                hasDiff
            };
        });
        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('diff');
            expect(message).toBe(`It seems there is no changes between ${baseBranch} and ${releaseBranch}. Do you want to release anyway?`);

            return { diff: true };
        });

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.isReleaseRequired();

        expect(inquirer.prompt).toBeCalledTimes(1);
    });

    test('should log exit', async () => {
        expect.assertions(1);

        const hasDiff = jest.fn(() => false);
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                hasDiff
            };
        });
        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ diff: false }));

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.isReleaseRequired();

        expect(log.exit).toBeCalledTimes(1);
    });

    test('should directly exit without a diff in non interactive mode', async () => {
        expect.assertions(2);

        const hasDiff = jest.fn(() => false);
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                hasDiff
            };
        });
        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => {});

        const release = releaseFactory({ baseBranch, releaseBranch, interactive: false });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.isReleaseRequired();

        expect(inquirer.prompt).not.toBeCalled();
        expect(log.exit).toBeCalledTimes(1);
    });

    test('should log done message', async () => {
        expect.assertions(1);

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.isReleaseRequired();

        expect(log.done).toBeCalledTimes(1);
    });
});