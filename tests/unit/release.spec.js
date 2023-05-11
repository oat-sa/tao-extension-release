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
jest.mock('../../src/log.js', () => ({
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
jest.mock('inquirer');

jest.mock('../../src/taoInstance.js', () => {
    const originalModule = jest.requireActual('../../src/taoInstance.js');
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

jest.mock('../../src/github.js', () => {
    const originalModule = jest.requireActual('../../src/github.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn(() => ({
            createReleasePR: jest.fn(() => ({ state: 'open' })),
            release: jest.fn()
        }))
    };
});

import releaseFactory from '../../src/release.js';
import log from '../../src/log.js';
import taoInstanceFactory from '../../src/taoInstance.js';
import github from '../../src/github.js';
import inquirer from 'inquirer';

const extension = 'testExtension';
const version = '1.1.1';
const branchPrefix = 'release';
const repoName = 'extension-test';
const tag = 'v1.1.1';
const releaseBranch = 'testReleaseBranch';
const pr = { notes: 'some pr note' };
const token = 'abc123';
const releaseComment = 'testComment';
const releasingBranch = 'release-1.1.1';
const lastVersion = '1.1.0';

const data = {
    version,
    extension: { name: extension }
};
describe('src/release.js', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    afterAll(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test('should define confirmRelease method on release instance', () => {
        expect.assertions(1);

        const release = releaseFactory();
        expect(typeof release.confirmRelease).toBe('function');
    });

    test('should prompt to confirm release', async () => {
        expect.assertions(4);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('go');
            expect(message).toBe(`Let's release version ${extension}@${version} 🚀?`);
            return { go: true };
        });

        const release = releaseFactory();
        release.setData(data);

        await release.confirmRelease();

        expect(inquirer.prompt).toBeCalledTimes(1);
    });

    test('should log exit if release was not confirmed', async () => {
        expect.assertions(1);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ go: false }));

        const release = releaseFactory();
        release.setData(data);
        await release.confirmRelease();

        expect(log.exit).toBeCalledTimes(1);
    });

    test('should log only when not interactive', async () => {
        expect.assertions(3);

        jest.spyOn(inquirer, 'prompt');

        const release = releaseFactory({ interactive: false });
        release.setData(data);
        await release.confirmRelease();

        expect(log.info).toBeCalledTimes(1);
        expect(inquirer.prompt).not.toBeCalled();
        expect(log.exit).not.toBeCalled();
    });

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

    // test('should log info message', async () => {
    //     expect.assertions(2);

    //     const url = 'testUrl';

    //     sandbox.stub(release, 'getMetadata').returns({ repoName });

    //     await release.initialiseGithubClient();

    //     sandbox.stub(githubInstance, 'createReleasePR').returns({
    //         state: 'open',
    //         html_url: url,
    //     });
    //     sandbox.stub(log, 'info');

    //     await release.createPullRequest();

    //     expect(log.info.callCount, 1, 'Info has been logged');
    //     t.ok(log.info.calledWith(`${url} created`), 'Info has been logged with appropriate message');

    //     sandbox.restore();
    //     t.end();
    // });

    // test('should set data.pr', async () => {
    //     expect.assertions(1);

    //     const html_url = 'testUrl';
    //     const apiUrl = 'apiUrl';
    //     const number = 42;
    //     const id = 'pr_id';
    //     const expectedPR = {
    //         url: html_url,
    //         apiUrl,
    //         number,
    //         id
    //     };

    //     sandbox.stub(release, 'getMetadata').returns({ repoName });

    //     await release.initialiseGithubClient();

    //     sandbox.stub(githubInstance, 'createReleasePR').returns({
    //         state: 'open',
    //         html_url,
    //         url: apiUrl,
    //         number,
    //         id
    //     });
    //     sandbox.stub(log, 'info');

    //     await release.createPullRequest();

    //     t.deepEqual(release.getData().pr, expectedPR, 'The PR data has been saved');

    //     sandbox.restore();
    //     t.end();
    // });

    // test('should log done message', async () => {
    //     expect.assertions(1);

    //     sandbox.stub(release, 'getMetadata').returns({ repoName });

    //     await release.initialiseGithubClient();

    //     sandbox.stub(githubInstance, 'createReleasePR').returns({
    //         state: 'open',
    //     });
    //     sandbox.stub(log, 'done');

    //     await release.createPullRequest();

    //     expect(log.done.callCount, 1, 'Done has been logged');

    //     sandbox.restore();
    //     t.end();
    // });

    // test('should log exit message if pull request is not created', async () => {
    //     expect.assertions(2);

    //     sandbox.stub(release, 'getMetadata').returns({ repoName });

    //     await release.initialiseGithubClient();

    //     sandbox.stub(log, 'exit');

    //     await release.createPullRequest();

    //     expect(log.exit.callCount, 1, 'Exit has been logged');
    //     t.ok(log.exit.calledWith('Unable to create the release pull request'), 'Exit has been logged with appropriate message');

    //     sandbox.restore();
    //     t.end();
    // });
});
