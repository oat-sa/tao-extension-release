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

const taoRoot = 'testRoot';
jest.mock('../../../../src/taoInstance.js', () => {
    const originalModule = jest.requireActual('../../../../src/taoInstance.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn((path, origin) => ({
            buildAssets: jest.fn(),
            getExtensions: jest.fn(() => []),
            isInstalled: jest.fn(() => true),
            isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
            getRepoName: jest.fn(),
            updateTranslations: jest.fn()
        }))
    };
});

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

jest.mock('../../../../src/conventionalCommits.js', () => {
    const originalModule = jest.requireActual('../../../../src/conventionalCommits.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        getNextVersion: jest.fn()
    };
});

jest.mock('../../../../src/config.js', () => {
    const originalModule = jest.requireActual('../../../../src/config.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn(() => ({
            load:  jest.fn(() => {}),
            write:  jest.fn()
        }))
    };
});

jest.mock('open');

import log from '../../../../src/log.js';
import github from '../../../../src/github.js';
import inquirer from 'inquirer';
import taoInstanceFactory from '../../../../src/taoInstance.js';
import git from '../../../../src/git.js';
import conventionalCommits from '../../../../src/conventionalCommits.js';
import configFactory from '../../../../src/config.js';
import open from 'open';
import releaseFactory from '../../../../src/release.js';

const extension = 'testExtension';
const version = '1.1.1';
const branchPrefix = 'release';
const repoName = 'extension-test';
const tag = 'v1.1.1';
const releaseBranch = 'testReleaseBranch';
const prNumber = '123';
const pr = { notes: 'some pr note', number: prNumber };
const token = 'abc123';
const releaseComment = 'testComment';
const releasingBranch = 'release-1.1.1';
const lastVersion = '1.1.0';
const origin = 'origin';
const baseBranch = 'testBaseBranch';

const data = {
    version,
    extension: { name: extension }
};

beforeEach(() => {
    jest.spyOn(process, 'stdin', 'get').mockReturnValue({ isTTY: true });
    process.stdin.isTTY
});
afterEach(() => {
    jest.clearAllMocks();
});
afterAll(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

describe('src/release.js createPullRequest', () => {
    
    test('should define createPullRequest method on release instance', () => {
        expect.assertions(1);

        const release = releaseFactory({ branchPrefix, releaseBranch });
        expect(typeof release.createPullRequest).toBe('function');
    });

    test('should create pull request', async () => {
        expect.assertions(2);

        const release = releaseFactory({ branchPrefix, releaseBranch });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        const createReleasePR = jest.fn();
        github.mockImplementationOnce(() => {
            //Mock the default export
            return {
                createReleasePR
            };
        });

        release.setData({ releasingBranch, version, lastVersion, tag, token, pr: null, extension: {} });
        await release.initialiseGithubClient();
        await release.createPullRequest();

        expect(createReleasePR).toBeCalledTimes(1);
        expect(createReleasePR).toBeCalledWith(`${branchPrefix}-${version}`, releaseBranch, version, lastVersion, 'extension');
    });

    test('should log info message', async () => {
        expect.assertions(2);

        const url = 'testUrl';

        const release = releaseFactory({ branchPrefix, releaseBranch });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        const createReleasePR = jest.fn(() => ({
            state: 'open',
            html_url: url,
        }));
        github.mockImplementationOnce(() => {
            //Mock the default export
            return {
                createReleasePR
            };
        });

        release.setData({ releasingBranch, version, lastVersion, tag, token, pr: null, extension: {} });
        await release.initialiseGithubClient();
        await release.createPullRequest();

        expect(log.info).toBeCalledTimes(1);
        expect(log.info).toBeCalledWith(`${url} created`);
    });

    test('should set data.pr', async () => {
        expect.assertions(1);

        const html_url = 'testUrl';
        const apiUrl = 'apiUrl';
        const number = 42;
        const id = 'pr_id';
        const expectedPR = {
            url: html_url,
            apiUrl,
            number,
            id
        };
        const release = releaseFactory({ branchPrefix, releaseBranch });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        const createReleasePR = jest.fn(() => ({
            state: 'open',
            html_url,
            url: apiUrl,
            number,
            id
        }));
        github.mockImplementationOnce(() => {
            //Mock the default export
            return {
                createReleasePR
            };
        });

        release.setData({ releasingBranch, version, lastVersion, tag, token, pr: null, extension: {} });
        await release.initialiseGithubClient();
        await release.createPullRequest();

        expect(release.getData().pr).toStrictEqual(expectedPR);
    });

    test('should log done message', async () => {
        expect.assertions(1);

        const release = releaseFactory({ branchPrefix, releaseBranch });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        const createReleasePR = jest.fn(() => ({
            state: 'open',
        }));
        github.mockImplementationOnce(() => {
            //Mock the default export
            return {
                createReleasePR
            };
        });

        release.setData({ releasingBranch, version, lastVersion, tag, token, pr: null, extension: {} });
        await release.initialiseGithubClient();
        await release.createPullRequest();

        expect(log.done).toBeCalledTimes(1);
    });

    test('should log exit message if pull request is not created', async () => {
        expect.assertions(2);

        const release = releaseFactory({ branchPrefix, releaseBranch });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));

        release.setData({ releasingBranch, version, lastVersion, tag, token, pr: null, extension: {} });
        await release.initialiseGithubClient();
        await release.createPullRequest();

        expect(log.exit).toBeCalledTimes(1);
        expect(log.exit).toBeCalledWith('Unable to create the release pull request');
    });
});
