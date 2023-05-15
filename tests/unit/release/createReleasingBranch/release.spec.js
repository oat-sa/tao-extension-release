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
import git from '../../../../src/git.js';
import releaseFactory from '../../../../src/release.js';

const version = '1.1.1';
const branchPrefix = 'release';
const tag = 'v1.1.1';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';
const origin = 'origin';

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

describe('src/release.js createReleasingBranch', () => {

    test('should define createReleasingBranch method on release instance', () => {
        expect.assertions(1);

        const release = releaseFactory({ branchPrefix, origin });
        expect(typeof release.createReleasingBranch).toBe('function');
    });
    
    test('should create and push releasing branch', async () => {
        expect.assertions(4);
    
        const localBranchMock = jest.fn(() => true);
        const pushMock = jest.fn(() => true);
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                localBranch: localBranchMock,
                push: pushMock
            };
        });

        const release = releaseFactory({ branchPrefix, origin });
        release.setData({ releasingBranch, version, tag, token, extension: {} });
        await release.initialiseGitClient();
        await release.createReleasingBranch();
    
        expect(pushMock).toBeCalledTimes(1);
        expect(pushMock).toBeCalledWith('origin', `${branchPrefix}-${version}`);

        expect(localBranchMock).toBeCalledTimes(1);
        expect(localBranchMock).toBeCalledWith(`${branchPrefix}-${version}`);
    });
    
    test('should log done message', async () => {
        expect.assertions(2);
    
        const release = releaseFactory({ branchPrefix, origin });
        release.setData({ releasingBranch, version, tag, token, extension: {} });
        await release.initialiseGitClient();
        await release.createReleasingBranch();
    
        expect(log.done).toBeCalledTimes(1);
        expect(log.done).toBeCalledWith(`${branchPrefix}-${version} created`);
    });
});
