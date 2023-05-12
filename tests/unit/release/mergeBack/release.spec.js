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
    prompt: jest.fn(() => ({}))
}));

jest.mock('../../../../src/git.js', () => {
    const originalModule = jest.requireActual('../../../../src/git.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn(() => ({
            tag: jest.fn(arg => arg),
            localBranch: jest.fn(arg => arg),
            push: jest.fn(arg => arg),
            hasBranch: jest.fn(),
            hasTag: jest.fn(),
            getLastTag: jest.fn(),
            hasDiff: jest.fn(() => true),
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

describe('src/release.js mergeBack', () => {
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

    const conflictedSummary = {
        stack: [],
        message: 'CONFLICTS: manifest.php:content'
    };

    test('should define mergeBack method on release instance', () => {
        expect.assertions(1);

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        expect(typeof release.mergeBack).toBe('function');
    });

    test('should merge release branch into base branch', async () => {
        expect.assertions(2);

        const mergeBack = jest.fn(() => true);
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                mergeBack
            };
        });

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.mergeBack();

        expect(mergeBack).toBeCalledTimes(1);
        expect(mergeBack).toBeCalledWith(baseBranch, releaseBranch);
    });

    test('should log done message', async () => {
        expect.assertions(1);

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.mergeBack();

        expect(log.done).toBeCalledTimes(1);
    });

    test('should prompt if there are merge conflicts', async () => {
        expect.assertions(2);

        const mergeBack = jest.fn(() => {
            throw conflictedSummary;
        });
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                mergeBack
            };
        });
        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => {});

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'promptToResolveConflicts').mockImplementationOnce(() => {});

        await release.initialiseGitClient();
        await release.mergeBack();

        expect(mergeBack).toBeCalledTimes(1);
        expect(release.promptToResolveConflicts).toBeCalledTimes(1);
    });

    test('should push and log done if prompt accepted', async () => {
        expect.assertions(4);

        const mergeBack = jest.fn(() => {
            throw conflictedSummary;
        });
        const push = jest.fn();
        const hasLocalChanges = jest.fn(() => false);
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                mergeBack,
                push,
                hasLocalChanges
            };
        });
        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'promptToResolveConflicts').mockImplementationOnce(() => true);

        await release.initialiseGitClient();
        await release.mergeBack();

        expect(mergeBack).toBeCalledTimes(1);
        expect(release.promptToResolveConflicts).toBeCalledTimes(1);
        expect(push).toBeCalledTimes(1);
        expect(log.done).toBeCalledTimes(1);
    });

    test('should log exit if prompt rejected', async () => {
        expect.assertions(5);

        const mergeBack = jest.fn(() => {
            throw conflictedSummary;
        });
        const push = jest.fn();
        const hasLocalChanges = jest.fn(() => false);
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                mergeBack,
                push,
                hasLocalChanges
            };
        });

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'promptToResolveConflicts').mockImplementationOnce(() => false);

        await release.initialiseGitClient();
        await release.mergeBack();

        expect(mergeBack).toBeCalledTimes(1);
        expect(release.promptToResolveConflicts).toBeCalledTimes(1);
        expect(push).not.toBeCalled();
        expect(log.done).not.toBeCalled();
        expect(log.exit).toBeCalledTimes(1);
    });
});
