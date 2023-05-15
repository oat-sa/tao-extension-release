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
import github from '../../../../src/github.js';
import releaseFactory from '../../../../src/release.js';

const version = '1.1.1';
const branchPrefix = 'release';
const repoName = 'extension-test';
const tag = 'v1.1.1';
const releaseBranch = 'testReleaseBranch';
const prNumber = '123';
const pr = { notes: 'some pr note', number: prNumber };
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

describe('src/release.js extractReleaseNotes', () => {

    test('should define extractReleaseNotes method on release instance', () => {
        expect.assertions(1);
    
        const release = releaseFactory({ branchPrefix, releaseBranch });
        expect(typeof release.extractReleaseNotes).toBe('function');
    });

    test('should extract release notes', async () => {
        expect.assertions(3);
    
        const releaseNote = 'The release note of a PR';
        const extractReleaseNotesFromReleasePR = jest.fn(() => releaseNote);
        github.mockImplementationOnce(() => {
            //Mock the default export
            return {
                extractReleaseNotesFromReleasePR
            };
        });

        
        const release = releaseFactory({ branchPrefix, origin });
        release.setData({ releasingBranch, version, tag, token, pr, extension: {} });
    
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
    
        await release.initialiseGithubClient();
        await release.extractReleaseNotes();
    
        expect(extractReleaseNotesFromReleasePR).toBeCalledTimes(1);
        expect(extractReleaseNotesFromReleasePR).toBeCalledWith(prNumber);
    
        const data = release.getData();
        expect(data.pr.notes).toStrictEqual(releaseNote);
    });
    
    test('should log info message', async () => {
        expect.assertions(2);
    
        const releaseNotes = 'testRleaseNotes';
        const extractReleaseNotesFromReleasePR = jest.fn(() => releaseNotes);
        github.mockImplementationOnce(() => {
            //Mock the default export
            return {
                extractReleaseNotesFromReleasePR
            };
        });

        
        const release = releaseFactory({ branchPrefix, origin });
        release.setData({ releasingBranch, version, tag, token, pr, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
    
        await release.initialiseGithubClient();
        await release.extractReleaseNotes();
    
        expect(log.info).toBeCalledTimes(1);
        expect(log.info).toBeCalledWith(releaseNotes);
    });
    
    test('should log done message', async () => {
        expect.assertions(1);
    
        const releaseNotes = 'testRleaseNotes';
        const extractReleaseNotesFromReleasePR = jest.fn(() => releaseNotes);
        github.mockImplementationOnce(() => {
            //Mock the default export
            return {
                extractReleaseNotesFromReleasePR
            };
        });

        const release = releaseFactory({ branchPrefix, origin });
        release.setData({ releasingBranch, version, tag, token, pr, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
    
        await release.initialiseGithubClient();
        await release.extractReleaseNotes();
    
        expect(log.done).toBeCalledTimes(1);
    });
    
    test('should log error message if can not extract release notes', async () => {
        expect.assertions(3);
    
        const release = releaseFactory({ branchPrefix, origin });
        release.setData({ releasingBranch, version, tag, token, pr, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
    
        await release.initialiseGithubClient();
        await release.extractReleaseNotes();
    
        expect(log.error).toBeCalledTimes(1);
        expect(log.error).toBeCalledWith('Unable to create the release notes. Continue.');
    
        const data = release.getData();
        expect(data.pr.notes).toBe('');
    });
});
