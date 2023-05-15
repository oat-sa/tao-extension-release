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
const taoRoot = 'testRoot';
const extension = 'testExtension';
jest.mock('inquirer', () => ({
    prompt: jest.fn(() => ({ extension, pull: true, taoRoot }))
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
            commitAndPush: jest.fn()
        }))
    };
});

jest.mock('../../../../src/release/extensionApi.js', () => {
    const originalModule = jest.requireActual('../../../../src/release/extensionApi.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn(() => ({
            updateVersion:  jest.fn(() => {})
        }))
    };
});

jest.mock('open');

import git from '../../../../src/git.js';
import extensionApiInstance from '../../../../src/release/extensionApi.js';
import releaseFactory from '../../../../src/release.js';

const baseBranch = 'testBaseBranch';
const releaseBranch = 'testReleaseBranch';
const token = 'abc123';
const branchPrefix = 'releaser';
const releasingBranch = 'releaser-1.1.1';
const repoName = 'oat-sa/extension-test';

describe('src/release.js updateVersion', () => {
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
    
    test('should define updateVersion method on release instance', () => {
        expect.assertions(1);
    
        const release = releaseFactory({branchPrefix, baseBranch, releaseBranch});
        release.setData({ releasingBranch, token, extension: {} });
        expect(typeof release.updateVersion).toBe('function');
    });

    test('should call updateVersion method of api provider', async () => {
        expect.assertions(1);
    
        const updateVersion = jest.fn();
        extensionApiInstance.mockImplementationOnce(() => {
            //Mock the default export
            return {
                updateVersion
            };
        });

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });

        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
    
        await release.initialiseGitClient();
        await release.updateVersion();
    
        expect(updateVersion).toBeCalledTimes(1);
    });
    
    test('should commit and push version changes', async () => {
        expect.assertions(2);
    
        const commitAndPush = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                commitAndPush
            };
        });

        const release = releaseFactory({ branchPrefix, baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });

        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
    
        await release.initialiseGitClient();
        await release.updateVersion();
    
        expect(commitAndPush).toBeCalledTimes(1);
        expect(commitAndPush).toBeCalledWith(releasingBranch, 'chore: bump version');
    });
    
});
