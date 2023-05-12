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

import git from '../../../../src/git.js';
import releaseFactory from '../../../../src/release.js';

const branchPrefix = 'release';
const version = '1.1.1';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';

describe('src/release.js removeReleasingBranch', () => {
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
    
    test('should define removeReleasingBranch method on release instance', () => {
        expect.assertions(1);
    
        const release = releaseFactory(branchPrefix);
        release.setData({ releasingBranch, token, extension: {} });
        expect(typeof release.removeReleasingBranch).toBe('function');
    });
    test('should delete releasing branch', async () => {
        expect.assertions(2);
    
        const deleteBranch = jest.fn();
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                deleteBranch
            };
        });

        const release = releaseFactory(branchPrefix);
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.removeReleasingBranch();
    
        expect(deleteBranch).toBeCalledTimes(1);
        expect(deleteBranch).toBeCalledWith(`${branchPrefix}-${version}`)
    });

});
