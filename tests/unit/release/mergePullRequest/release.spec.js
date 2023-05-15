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

jest.mock('../../../../src/taoInstance.js', () => {
    const originalModule = jest.requireActual('../../../../src/taoInstance.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn(() => ({
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
            createReleasePR: jest.fn(() => ({ state: 'open' })),
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
            mergeBack: jest.fn(),
            pull: jest.fn(),
            merge: jest.fn(),
            mergePr: jest.fn()
        }))
    };
});

jest.mock('open');

import log from '../../../../src/log.js';
import inquirer from 'inquirer';
import git from '../../../../src/git.js';
import open from 'open';
import releaseFactory from '../../../../src/release.js';

const version = '1.1.1';
const branchPrefix = 'release';
const repoName = 'extension-test';
const releaseBranch = 'testReleaseBranch';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';
const baseBranch = 'testBaseBranch';

describe('src/release.js mergePullRequest', () => {
    beforeAll(() => {
        jest.useFakeTimers();
    });
    beforeEach(() => {
        jest.spyOn(process, 'stdin', 'get').mockReturnValue({ isTTY: true });
    });
    afterEach(() => {
        jest.clearAllMocks();
        log.done.mockClear();
    });
    afterAll(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        jest.useRealTimers();
    });
    
    test('should define mergePullRequest method on release instance', () => {
        expect.assertions(1);
    
        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        expect(typeof release.mergePullRequest).toBe('function');
    });
    
    test('should open pull request in browser', async () => {
        expect.assertions(1);

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));

        await release.initialiseGitClient();
        await release.initialiseGithubClient();
        await release.createPullRequest();
        await release.mergePullRequest();

        jest.runAllTimers();

        expect(open).toBeCalledTimes(1);
    });

    test('should prompt about merging pull request', async () => {
        expect.assertions(4);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('pr');
            expect(message).toBe('Please review the release PR (you can make the last changes now). Can I merge it now ?');
            return { pr: false };
        });

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));

        await release.initialiseGitClient();
        await release.initialiseGithubClient();
        await release.createPullRequest();
        await release.mergePullRequest();

        expect(inquirer.prompt).toBeCalledTimes(1);
    });

    test('should log exit if pr is not confirmed', async () => {
        expect.assertions(1);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ pr: false }));

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));

        await release.initialiseGitClient();
        await release.initialiseGithubClient();
        await release.createPullRequest();
        await release.mergePullRequest();

        expect(log.exit).toBeCalledTimes(1);
    });

    test('should merge pull request', async () => {
        expect.assertions(2);

        const mergePr = jest.fn(() => true);
        git.mockImplementationOnce(() => {
            //Mock the default export
            return {
                mergePr
            };
        });

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));

        await release.initialiseGitClient();
        await release.initialiseGithubClient();
        await release.createPullRequest();
        await release.mergePullRequest();

        expect(mergePr).toBeCalledTimes(1);
        expect(mergePr).toBeCalledWith(releaseBranch, `${branchPrefix}-${version}`);
    });

    test('should log done message', async () => {
        expect.assertions(2);

        const release = releaseFactory({ baseBranch, releaseBranch });
        release.setData({ releasingBranch, token, extension: {} });
        jest.spyOn(release, 'getMetadata').mockImplementationOnce(() => ({ repoName }));
        jest.spyOn(log, 'done');

        await release.initialiseGitClient();
        await release.initialiseGithubClient();
        await release.createPullRequest();
        await release.mergePullRequest();

        expect(log.done).toBeCalledTimes(2);
        expect(log.done).toBeCalledWith('PR merged');
    });
});
