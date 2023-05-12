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

jest.mock('../../../../src/github.js', () => {
    const originalModule = jest.requireActual('../../../../src/github.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn(() => ({
            createReleasePR: jest.fn(),
            release: jest.fn(),
            extractReleaseNotesFromReleasePR: jest.fn()
        }))
    };
});

import log from '../../../../src/log.js';
import github from '../../../../src/github.js';
import releaseFactory from '../../../../src/release.js';

const repoName = 'extension-test';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';

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

describe('src/release.js initialiseGithubClient', () => {

    test('should define initialiseGithubClient method on release instance', () => {
        expect.assertions(1);

        const release = releaseFactory();
        expect(typeof release.initialiseGithubClient).toBe('function');
    });
    
    test('should create github instance', async () => {
        expect.assertions(2);

        const release = releaseFactory();
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
    
        await release.initialiseGitClient();
        await release.initialiseGithubClient();
    
        expect(github).toBeCalledTimes(1);
        expect(github).toBeCalledWith(token, repoName);
    });
    
    test('should log exit message if can not get repository name', async () => {
        expect.assertions(2);
    
        const release = releaseFactory();
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => null);
        await release.initialiseGitClient();
        await release.initialiseGithubClient();
    
        expect(log.exit).toBeCalledTimes(1);
        expect(log.exit).toBeCalledWith('Unable to find the github repository name');
    });
    
});
