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
const taoRoot = 'testRoot';
const extension = 'testExtension';
jest.mock('inquirer', () => ({
    prompt: jest.fn(() => ({ extension, taoRoot, pr: true }))
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
            mergeBack: jest.fn(),
            pull: jest.fn(),
            merge: jest.fn(),
            mergePr: jest.fn(),
            getLocalBranches: jest.fn(() => []),
            checkoutNonLocal: jest.fn(),
        }))
    };
});

import log from '../../../../src/log.js';
import inquirer from 'inquirer';
import git from '../../../../src/git.js';
import releaseFactory from '../../../../src/release.js';

const baseBranch = 'testBaseBranch';
const releaseBranch = 'testReleaseBranch';
const token = 'abc123';
const branchPrefix = 'releaser';
const releasingBranch = 'releaser-1.1.1';
const repoName = 'oat-sa/extension-test';

describe('src/release.js verifyBranches', () => {
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

    test('should define verifyBranches method on release instance', () => {
        expect.assertions(1);

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        expect(typeof release.verifyBranches).toBe('function');
    });

    test('should prompt to pull branches', async () => {
        expect.assertions(4);

        const getReleaseBranchNameMock = jest.fn(() => releaseBranch);
        const pullMock = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                getReleaseBranchName: getReleaseBranchNameMock,
                pull: pullMock,
            };
        });

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('pull');
            expect(message).toBe(`Can I checkout and pull ${baseBranch} and ${releaseBranch}  ?`);
            return { pull: true };
        });

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        await release.initialiseGitClient();
        await release.verifyBranches();

        expect(inquirer.prompt).toBeCalledTimes(1);
    });

    test('should log exit if pull not confirmed', async () => {
        expect.assertions(1);

        const getReleaseBranchNameMock = jest.fn(() => releaseBranch);
        const pullMock = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                getReleaseBranchName: getReleaseBranchNameMock,
                pull: pullMock,
            };
        });

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ pull: false }));

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        await release.initialiseGitClient();
        await release.verifyBranches();

        expect(log.exit).toBeCalledTimes(1);
    });

    test('should pull release branch', async () => {
        expect.assertions(2);

        const getReleaseBranchNameMock = jest.fn(() => releaseBranch);
        const pullMock = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                getReleaseBranchName: getReleaseBranchNameMock,
                pull: pullMock,
            };
        });

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.verifyBranches();

        expect(pullMock).toBeCalledTimes(2);
        expect(pullMock).toBeCalledWith(releaseBranch);
    });

    test('should pull base branch', async () => {
        expect.assertions(2);

        const getReleaseBranchNameMock = jest.fn(() => releaseBranch);
        const pullMock = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                getReleaseBranchName: getReleaseBranchNameMock,
                pull: pullMock,
            };
        });

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.verifyBranches();

        expect(pullMock).toBeCalledTimes(2);
        expect(pullMock).toBeCalledWith(baseBranch);
    });

});
