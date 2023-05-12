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
            hasLocalChanges: jest.fn()
        }))
    };
});

import log from '../../../../src/log.js';
import git from '../../../../src/git.js';
import releaseFactory from '../../../../src/release.js';

const token = 'abc123';
const releasingBranch = 'release-1.1.1';

describe('src/release.js verifyLocalChanges', () => {
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
    
    test('should define verifyLocalChanges method on release instance', () => {
        expect.assertions(1);
    
        const release = releaseFactory();
        release.setData({ releasingBranch, token, extension: { name: extension } });
        expect(typeof release.verifyLocalChanges).toBe('function');
    });

    test('should check if there is any local changes', async () => {
        expect.assertions(1);
    
        const hasLocalChanges = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                hasLocalChanges,
            };
        });

        const release = releaseFactory();
        release.setData({ releasingBranch, token, extension: { name: extension } });
        await release.initialiseGitClient();
        await release.verifyLocalChanges();
    
        expect(hasLocalChanges).toBeCalledTimes(1);
    });
    
    test('should log exit message if there is local changes', async () => {
        expect.assertions(2);
    
        const hasLocalChanges = jest.fn(() => true);
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                hasLocalChanges,
            };
        });

        const release = releaseFactory();
        release.setData({ releasingBranch, token, extension: { name: extension } });
        await release.initialiseGitClient();
        await release.verifyLocalChanges();
    
        expect(log.exit).toBeCalledTimes(1);
        expect(log.exit).toBeCalledWith(`The extension ${extension} has local changes, please clean or stash them before releasing`);
    });
    
    test('should log done message', async () => {
        expect.assertions(2);
    
        const release = releaseFactory();
        release.setData({ releasingBranch, token, extension: { name: extension } });
        await release.initialiseGitClient();
        await release.verifyLocalChanges();
    
        expect(log.done).toBeCalledTimes(1);
        expect(log.done).toBeCalledWith(`${extension} is clean`);
    });
});
