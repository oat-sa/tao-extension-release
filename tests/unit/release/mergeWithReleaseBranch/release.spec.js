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

const localReleasingBranch = 'release-0.9.0';
const releaseBranch = 'master';
const token = 'abc123';
const version = '0.9.0';
const tag = 'v0.9.0';
const releaseOptions = {
    branchPrefix: 'release',
    origin: 'origin',
    versionToRelease: '0.9.0',
    releaseBranch: 'master'
};

describe('src/release.js mergeWithReleaseBranch', () => {
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
    
    test('should define mergeWithReleaseBranch method on release instance', () => {
        expect.assertions(1);
    
        const release = releaseFactory(releaseOptions);
        release.setData({ releasingBranch: localReleasingBranch, token, version, tag, extension: {} });
        expect(typeof release.mergeWithReleaseBranch).toBe('function');
    });

    test('Merging release branch into releasing branch, no conflicts found', async () => {
        expect.assertions(8);

        const checkout = jest.fn();
        const pull = jest.fn();
        const merge = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                checkout,
                pull,
                merge,
                getLocalBranches: jest.fn(() => []),
                checkoutNonLocal: jest.fn(),
            };
        });

        const release = releaseFactory(releaseOptions);
        release.setData({ releasingBranch: localReleasingBranch, token, version, tag, extension: {} });
        await release.initialiseGitClient();
        jest.spyOn(release, 'checkoutReleasingBranch');

        await release.mergeWithReleaseBranch();

        // Assertions
        expect(log.doing).toBeCalledTimes(1);
        expect(log.doing).toBeCalledWith(`Merging '${releaseBranch}' into '${localReleasingBranch}'.`);

        expect(checkout).toBeCalledTimes(1);
        expect(checkout).toBeCalledWith(releaseBranch);

        expect(pull).toBeCalledTimes(1);

        expect(merge).toBeCalledTimes(1);
        expect(log.done).toBeCalledTimes(1);
        expect(log.done).toBeCalledWith(`'${releaseBranch}' merged into '${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease}'.`);
    });

    test('Merging release branch into releasing branch, found conflicts and user abort merge', async () => {
        expect.assertions(13);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('isMergeDone');
            expect(message).toBe(`Has the merge been completed manually? I need to push the branch to ${releaseOptions.origin}.`);
            return { isMergeDone: false };
        });

        const checkout = jest.fn();
        const pull = jest.fn();
        const merge = jest.fn(() => {throw {stack : 'Error: CONFLICTS:', message: 'CONFLICTS:'};});
        const abortMerge = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                checkout,
                pull,
                merge,
                abortMerge,
                getLocalBranches: jest.fn(() => []),
                checkoutNonLocal: jest.fn(),
            };
        });

        const release = releaseFactory(releaseOptions);
        release.setData({ releasingBranch: localReleasingBranch, token, version, tag, extension: {} });
        jest.spyOn(release, 'checkoutReleasingBranch');
        await release.initialiseGitClient();
        await release.mergeWithReleaseBranch();

        // Assertions
        expect(log.doing).toBeCalledTimes(1);
        expect(log.doing).toBeCalledWith(`Merging '${releaseBranch}' into '${localReleasingBranch}'.`);

        expect(checkout).toBeCalledTimes(1);
        expect(checkout).toBeCalledWith(releaseBranch);

        expect(pull).toBeCalledTimes(1);
        expect(merge).toBeCalledTimes(1);

        expect(log.warn).toBeCalledTimes(1);
        expect(log.warn).toBeCalledWith('Please resolve the conflicts and complete the merge manually (including making the merge commit).');

        expect(abortMerge).toBeCalledTimes(1);
        expect(log.exit).toBeCalledTimes(1);
    });

    test('Merging release branch into releasing branch, found conflicts and user proceed with merge and resolved conflicts', async () => {
        expect.assertions(15);

        const checkout = jest.fn();
        const pull = jest.fn();
        const merge = jest.fn(() => {throw {stack : 'Error: CONFLICTS:', message: 'CONFLICTS:'};});
        const hasLocalChanges = jest.fn(() => false);
        const push = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                checkout,
                pull,
                merge,
                getLocalBranches: jest.fn(() => []),
                checkoutNonLocal: jest.fn(),
                hasLocalChanges,
                push
            };
        });

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('isMergeDone');
            expect(message).toBe(`Has the merge been completed manually? I need to push the branch to ${releaseOptions.origin}.`);
            return { isMergeDone: true };
        });

        const release = releaseFactory(releaseOptions);
        release.setData({ releasingBranch: localReleasingBranch, token, version, tag, extension: {} });
        jest.spyOn(release, 'checkoutReleasingBranch');
        await release.initialiseGitClient();
        await release.mergeWithReleaseBranch();

        // Assertions
        expect(log.doing).toBeCalledTimes(1);
        expect(log.doing).toBeCalledWith(`Merging '${releaseBranch}' into '${localReleasingBranch}'.`);

        expect(checkout).toBeCalledTimes(1);
        expect(checkout).toBeCalledWith(releaseBranch);

        expect(pull).toBeCalledTimes(1);
        expect(merge).toBeCalledTimes(1);

        expect(log.warn).toBeCalledTimes(1);
        expect(log.warn).toBeCalledWith('Please resolve the conflicts and complete the merge manually (including making the merge commit).');

        expect(hasLocalChanges).toBeCalledTimes(1);
        expect(push).toBeCalledTimes(1);

        expect(log.done).toBeCalledTimes(1);
        expect(log.done).toBeCalledWith(`'${releaseBranch}' merged into '${releaseOptions.branchPrefix}-${releaseOptions.versionToRelease}'.`);
    });

    test('Merging release branch into releasing branch, found conflicts and user proceed with merge without commiting local changes', async () => {
        expect.assertions(14);

        const checkout = jest.fn();
        const pull = jest.fn();
        const merge = jest.fn(() => {throw {stack : 'Error: CONFLICTS:', message: 'CONFLICTS:'};});
        const hasLocalChanges = jest.fn(() => true);
        const push = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                checkout,
                pull,
                merge,
                getLocalBranches: jest.fn(() => []),
                checkoutNonLocal: jest.fn(),
                hasLocalChanges,
                push
            };
        });

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('isMergeDone');
            expect(message).toBe(`Has the merge been completed manually? I need to push the branch to ${releaseOptions.origin}.`);
            return { isMergeDone: true };
        });

        const release = releaseFactory(releaseOptions);
        release.setData({ releasingBranch: localReleasingBranch, token, version, tag, extension: {} });
        jest.spyOn(release, 'checkoutReleasingBranch');
        await release.initialiseGitClient();
        await release.mergeWithReleaseBranch();

        // Assertions
        expect(log.doing).toBeCalledTimes(1);
        expect(log.doing).toBeCalledWith(`Merging '${releaseBranch}' into '${localReleasingBranch}'.`);

        expect(checkout).toBeCalledTimes(1);
        expect(checkout).toBeCalledWith(releaseBranch);

        expect(pull).toBeCalledTimes(1);
        expect(merge).toBeCalledTimes(1);

        expect(log.warn).toBeCalledTimes(1);
        expect(log.warn).toBeCalledWith('Please resolve the conflicts and complete the merge manually (including making the merge commit).');

        expect(hasLocalChanges).toBeCalledTimes(1);

        expect(log.exit).toBeCalledTimes(1);
        expect(log.exit).toBeCalledWith(`Cannot push changes because local branch '${localReleasingBranch}' still has changes to commit.`);
    });
    
});
