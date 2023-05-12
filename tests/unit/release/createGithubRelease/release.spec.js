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
import inquirer from 'inquirer';
import releaseFactory from '../../../../src/release.js';

const version = '1.1.1';
const branchPrefix = 'release';
const repoName = 'extension-test';
const tag = 'v1.1.1';
const releaseBranch = 'testReleaseBranch';
const prNumber = '123';
const pr = { notes: 'some pr note', number: prNumber };
const token = 'abc123';
const releaseComment = 'testComment';

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

describe('src/release.js createGithubRelease', () => {

    test('should define createGithubRelease method on release instance', () => {
        expect.assertions(1);

        const release = releaseFactory({ branchPrefix, releaseBranch });
        expect(typeof release.createGithubRelease).toBe('function');
    });

    test('should prompt about release comment', async () => {
        expect.assertions(4);
        
        const release = releaseFactory({ branchPrefix, releaseBranch });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('input');
            expect(name).toBe('comment');
            expect(message).toBe('Any comment on the release ?');
            return { comment: releaseComment };
        });
    
        release.setData({ version, tag, pr, token, extension: {} });
        await release.initialiseGithubClient();
        await release.createGithubRelease();

        expect(inquirer.prompt).toBeCalledTimes(1);
    });

    test('should create release', async () => {
        expect.assertions(2);

        const comment = 'my comment';
        const release = releaseFactory({ branchPrefix, releaseBranch });
        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ comment }));
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        const releaseMock = jest.fn();
        github.mockImplementationOnce(() => {
            //Mock the default export
            return {
                release: releaseMock
            };
        });
        
        release.setData({ version, tag, pr, token, extension: {} });
        await release.initialiseGithubClient();
        await release.createGithubRelease();

        expect(releaseMock).toBeCalledTimes(1);
        expect(releaseMock).toBeCalledWith(`v${version}`, `${comment}\n\n**Release notes :**\n${pr.notes}`);
    });

    test('should log done message', async () => {
        expect.assertions(1);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ comment: releaseComment }));
        const release = releaseFactory({ branchPrefix, releaseBranch });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        release.setData({ version, tag, pr, token, extension: {} });

        await release.initialiseGithubClient();
        await release.createGithubRelease();

        expect(log.done).toBeCalledTimes(1);
    });

    test('should use CLI release comment instead of prompting', async () => {
        expect.assertions(3);

        const releaseWithCliOption = releaseFactory({ branchPrefix, releaseBranch, releaseComment });
        jest.spyOn(releaseWithCliOption, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        const releaseMock = jest.fn();
        github.mockImplementationOnce(() => {
            //Mock the default export
            return {
                release: releaseMock
            };
        });

        releaseWithCliOption.setData({ version, tag, pr, token, extension: {} });

        await releaseWithCliOption.initialiseGithubClient();
        await releaseWithCliOption.createGithubRelease();
        expect(inquirer.prompt).not.toBeCalled();
        expect(releaseMock).toBeCalledTimes(1);
        expect(releaseMock).toBeCalledWith(`v${version}`, `${releaseComment}\n\n**Release notes :**\n${pr.notes}`);
    });
});
