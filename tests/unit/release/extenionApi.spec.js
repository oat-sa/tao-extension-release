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

const extension = 'testExtension';
const taoRoot = 'testRoot';
const gitClientInstance = {
    commitAndPush: jest.fn(),
    pull: jest.fn()
};
jest.mock('../../../src/log.js', () => ({
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
jest.mock('../../../src/taoInstance.js', () => {
    const originalModule = jest.requireActual('../../../src/taoInstance.js');
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
jest.mock('inquirer', () => ({
    prompt: jest.fn(() => ({ extension, taoRoot }))
}));

import extensionApiFactory from '../../../src/release/extensionApi.js';
import log from '../../../src/log.js';
import taoInstanceFactory from '../../../src/taoInstance.js';
import inquirer from 'inquirer';
import path from 'path';

const branchPrefix = 'release';
const version = '1.1.1';
const releasingBranch = 'release-1.1.1';
const data = {
    taoRoot,
    extension: {
        name: extension,
        path: `${taoRoot}/${extension}`
    }
};
const repositoryName = 'testRepository';
const origin = 'testOrigin';
const interactive = true;
const wwwUser = 'testwwwUser';

describe('src/release/extensionApi.js', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    afterAll(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    test('should define compileAssets method on extensionApi instance', () => {
        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true });
        extensionApi.gitClient = gitClientInstance;
        expect(typeof extensionApi.compileAssets).toBe('function');
    });

    test('should log doing message', async () => {
        expect.assertions(2);

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true });
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.selectTaoInstance();
        await extensionApi.selectExtension();

        await extensionApi.compileAssets(releasingBranch);

        expect(log.doing).toBeCalledTimes(1);
        expect(log.doing).toBeCalledWith('Bundling')
    });

    test('should log info message', async () => {
        expect.assertions(2);

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true });
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.selectTaoInstance();
        await extensionApi.selectExtension();

        await extensionApi.compileAssets(releasingBranch);

        expect(log.info).toBeCalledTimes(1);
        expect(log.info).toBeCalledWith('Asset build started, this may take a while');
    });

    test('should build assets', async () => {
        expect.assertions(2);

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true });
        extensionApi.gitClient = gitClientInstance;

        const buildAssets = jest.fn(() => true);
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: buildAssets,
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn()
            };
        });

        await extensionApi.selectTaoInstance();
        await extensionApi.selectExtension();

        await extensionApi.compileAssets(releasingBranch);

        expect(buildAssets).toBeCalledTimes(1);
        expect(buildAssets).toBeCalledWith(extension, false);
    });

    test('should publish assets', async () => {
        expect.assertions(2);

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true });
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.selectTaoInstance();
        await extensionApi.selectExtension();

        await extensionApi.compileAssets(releasingBranch);

        expect(gitClientInstance.commitAndPush).toBeCalledTimes(1);
        expect(gitClientInstance.commitAndPush).toBeCalledWith(`${branchPrefix}-${version}`, 'chore: bundle assets');
    });

    test('should log error message if compilation failed', async () => {
        expect.assertions(2);

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true });
        extensionApi.gitClient = gitClientInstance;
        const errorMessage = 'testError';
        const buildAssets = jest.fn(() => Promise.reject(new Error(errorMessage)));
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: buildAssets,
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn()
            };
        });

        await extensionApi.selectTaoInstance();
        await extensionApi.selectExtension();
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.compileAssets(releasingBranch);

        expect(log.error).toBeCalledTimes(1);
        expect(log.error).toBeCalledWith(`Unable to bundle assets. ${errorMessage}. Continue.`);
    });

    test('should log info message after compilation of assets', async () => {
        expect.assertions(4);

        const changes = ['change1', 'change2'];
        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true });
        extensionApi.gitClient = gitClientInstance;
        await extensionApi.selectTaoInstance();
        await extensionApi.selectExtension();

        jest.spyOn(gitClientInstance, 'commitAndPush').mockImplementationOnce(() => changes);

        await extensionApi.compileAssets(releasingBranch);

        expect(log.info).toBeCalledTimes(4);
        expect(log.info).toBeCalledWith(`Commit : [bundle assets - ${changes.length} files]`);
        changes.forEach(change =>
            expect(log.info).toBeCalledWith(`  - ${change}`)
        );
    });

    test('should log done message', async () => {
        expect.assertions(1);
        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true });
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.selectTaoInstance();
        await extensionApi.selectExtension();

        await extensionApi.compileAssets(releasingBranch);

        expect(log.done).toBeCalledTimes(1);
    });


    test('should define getMetadata method on extensionApi instance', () => {
        expect.assertions(1);
        const extensionApi = extensionApiFactory({}, data);
        expect(typeof extensionApi.getMetadata).toBe('function');
    });

    test('should get extension metadata', async () => {
        expect.assertions(2);

        const extensionApi = extensionApiFactory({}, data);
        extensionApi.gitClient = gitClientInstance;
        const getRepoName = jest.fn(() => repositoryName);
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName
            };
        });

        await extensionApi.selectTaoInstance();

        await extensionApi.getMetadata();

        expect(getRepoName).toBeCalledTimes(1);
        expect(getRepoName).toBeCalledWith(extension);
    });

    test('should return metadata object', async () => {
        expect.assertions(2);
        const extensionApi = extensionApiFactory({}, data);
        extensionApi.gitClient = gitClientInstance;
        const getRepoName = jest.fn(() => repositoryName);
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName
            };
        });
        await extensionApi.selectTaoInstance();

        const result = await extensionApi.getMetadata();

        expect(typeof result).toBe('object');
        expect(result.repoName).toBe(repositoryName);
    });

    test('should define selectExtension method on extensionApi instance', () => {
        expect.assertions(1);
        const extensionApi = extensionApiFactory({ origin, interactive });
        expect(typeof extensionApi.selectExtension).toBe('function');
    });

    test('should get available extensions', async () => {
        expect.assertions(1);
        const extensionApi = extensionApiFactory({ origin, interactive });
        extensionApi.gitClient = gitClientInstance;
        const getExtensions = jest.fn(() => []);
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions,
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
            };
        });

        await extensionApi.selectTaoInstance();
        await extensionApi.selectExtension();

        expect(getExtensions).toBeCalledTimes(1);
    });

    test('should prompt to select tao extension', async () => {
        expect.assertions(6);

        const availableExtensions = ['testExtensionFoo', 'testExtensionBar'];
        const extensionApi = extensionApiFactory({ origin, interactive, pathToTao: taoRoot });
        extensionApi.gitClient = gitClientInstance;
        const getExtensions = jest.fn(() => availableExtensions);
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions,
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
            };
        });
        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message, pageSize, choices }) => {
            expect(type).toBe('list');
            expect(name).toBe('extension');
            expect(message).toBe('Which extension you want to release ? ');
            expect(pageSize).toBe(12);
            expect(choices).toBe(availableExtensions);

            return { extension: '' };
        });

        await extensionApi.selectTaoInstance();
        await extensionApi.selectExtension();

        expect(inquirer.prompt).toBeCalledTimes(1);
    });

    test('should use CLI extension instead of prompting', async () => {
        expect.assertions(1);

        const availableExtensions = ['testExtensionFoo', 'testExtensionBar'];
        const extensionApiWithCliOption = extensionApiFactory({ origin, extensionToRelease: 'testExtensionFoo' });
        extensionApiWithCliOption.gitClient = gitClientInstance;
        const getExtensions = jest.fn(() => availableExtensions);
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions,
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
            };
        });

        await extensionApiWithCliOption.selectTaoInstance();
        await extensionApiWithCliOption.selectExtension();

        expect(inquirer.prompt).not.toBeCalled();
    });

    test('should log exit message when bad CLI extension provided', async () => {
        expect.assertions(2);

        const availableExtensions = ['testExtensionBaz', 'testExtensionBar'];
        const extensionApiWithCliOption = extensionApiFactory({ origin, extensionToRelease: 'testExtensionFoo' });
        extensionApiWithCliOption.gitClient = gitClientInstance;
        const getExtensions = jest.fn(() => availableExtensions);
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions,
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
            };
        });

        await extensionApiWithCliOption.selectTaoInstance();
        await extensionApiWithCliOption.selectExtension();

        expect(log.exit).toBeCalledTimes(1);
        expect(log.exit).toBeCalledWith('Specified extension testExtensionFoo not found in testRoot');
    });

    test('should define selectTaoInstance method on extensionApi instance', () => {
        expect.assertions(1);
        const extensionApi = extensionApiFactory({ wwwUser, interactive: true });
        extensionApi.gitClient = gitClientInstance;
        expect(typeof extensionApi.selectTaoInstance).toBe('function');
    });

    test('should prompt to provide path to tao instance', async () => {
        expect.assertions(5);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message, default: defaultValue }) => {
            expect(type).toBe('input');
            expect(name).toBe('taoRoot');
            expect(message).toBe('Path to the TAO instance : ');
            expect(defaultValue).toBe( path.resolve(''));

            return { taoRoot: '' };
        });
        const extensionApi = extensionApiFactory({ wwwUser, interactive: true });
        extensionApi.gitClient = gitClientInstance;
        await extensionApi.selectTaoInstance();

        expect(inquirer.prompt).toBeCalledTimes(1);
    });

    test('should initialise taoInstance', async () => {
        expect.assertions(2);

        const taoRoot = 'testRoot';

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ taoRoot }));
        const extensionApi = extensionApiFactory({ wwwUser, interactive: true });
        extensionApi.gitClient = gitClientInstance;
        await extensionApi.selectTaoInstance();

        expect(taoInstanceFactory).toBeCalledTimes(1);
        expect(taoInstanceFactory).toBeCalledWith(path.resolve(taoRoot), false, wwwUser);
    });

    test('should check if under provided path there is a real tao instance', async () => {
        expect.assertions(1);

        const taoRoot = 'testRoot';

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ taoRoot }));
        const isRoot = jest.fn(() => ({}));
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot,
                getRepoName: jest.fn(),
            };
        });
        const extensionApi = extensionApiFactory({ wwwUser, interactive: true });
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.selectTaoInstance();

        expect(isRoot).toBeCalledTimes(1);
    });

    test('should log exit if provided path is not a tao root', async () => {
        expect.assertions(2);

        const taoRoot = 'testRoot';
        const dir = 'testDir';

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ taoRoot }));
        const isRoot = jest.fn(() => ({dir}));
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot,
                getRepoName: jest.fn(),
            };
        });
        const extensionApi = extensionApiFactory({ wwwUser, interactive: true });
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.selectTaoInstance();

        expect(log.exit).toBeCalledTimes(1);
        expect(log.exit).toBeCalledWith(`${dir} is not a TAO instance.`);
    });

    test('should check if tao instance is installed', async () => {
        expect.assertions(1);

        const taoRoot = 'testRoot';

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ taoRoot }));
        const isInstalled = jest.fn(() => true);
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled,
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
            };
        });
        const extensionApi = extensionApiFactory({ wwwUser, interactive: true });
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.selectTaoInstance();

        expect(isInstalled).toBeCalledTimes(1);
    });

    test('should log exit if tao instance is not installed', async () => {
        expect.assertions(2);
        const extensionApi = extensionApiFactory({ wwwUser, interactive: true });
        extensionApi.gitClient = gitClientInstance;
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => false),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
            };
        });
        await extensionApi.selectTaoInstance();

        expect(log.exit).toBeCalledTimes(1);
        expect(log.exit).toBeCalledWith('It looks like the given TAO instance is not installed.');
    });

    test('should use CLI pathToTao instead of prompting', async () => {
        expect.assertions(3);

        const releaseWithCliOption = extensionApiFactory({ pathToTao: '/path/to/tao' });
        releaseWithCliOption.gitClient = gitClientInstance;

        await releaseWithCliOption.selectTaoInstance();

        expect(taoInstanceFactory).toBeCalledTimes(1);
        expect(taoInstanceFactory).toBeCalledWith('/path/to/tao', false, undefined);
        expect(inquirer.prompt).not.toBeCalled();
    });


    test('should define updateTranslations method on extensionApi instance', () => {
        expect.assertions(1);

        const extensionApi = extensionApiFactory();
        expect(typeof extensionApi.updateTranslations).toBe('function');
    });

    test('should log doing message', async () => {
        expect.assertions(2);

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);

        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;
        await extensionApi.updateTranslations(releasingBranch);

        expect(log.doing).toBeCalledTimes(1);
        expect(log.doing).toBeCalledWith('Translations');
    });

    test('should log warn message', async () => {
        expect.assertions(2);

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);
        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.updateTranslations(releasingBranch);

        expect(log.warn).toBeCalledTimes(1);
        expect(log.warn).toBeCalledWith('Update translations during a release only if you know what you are doing');
    });

    test('should prompt to update translations', async () => {
        expect.assertions(5);

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false }, data);
        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message, default: defaultValue }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('runTranslations');
            expect(message).toBe(`${extension} needs updated translations ? `);
            expect(defaultValue).toBe(false);

            return { runTranslations : false };
        });

        await extensionApi.updateTranslations(releasingBranch);

        expect(inquirer.prompt).toBeCalled();
    });

    test('should update translations', async () => {
        expect.assertions(2);

        const updateTranslations = jest.fn();
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
                updateTranslations
            };
        });

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: true }, data);
        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.updateTranslations(releasingBranch);

        expect(updateTranslations).toBeCalledTimes(1);
        expect(updateTranslations).toBeCalledWith(extension);
    });

    test('should publish translations', async () => {
        expect.assertions(2);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => Promise.resolve({ runTranslations : true }));

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false, pathToTao: '/path/to/tao' }, data);
        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.updateTranslations(releasingBranch);

        expect(gitClientInstance.commitAndPush).toBeCalledTimes(1);
        expect(gitClientInstance.commitAndPush).toBeCalledWith(`${branchPrefix}-${version}`, 'chore: update translations');

    });

    test('should log error message if update failed', async () => {
        expect.assertions(2);

        const errorMessage = 'testError';

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => Promise.resolve({ runTranslations : true }));
        const updateTranslations = jest.fn(() => Promise.reject(new Error(errorMessage)));
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
                updateTranslations
            };
        });

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false, pathToTao: '/path/to/tao' }, data);
        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.updateTranslations(releasingBranch);

        expect(log.error).toBeCalledTimes(1);
        expect(log.error).toBeCalledWith(`Unable to update translations. ${errorMessage}. Continue.`);
    });

    test('should log info message after update of translations', async () => {
        expect.assertions(4);

        const changes = ['change1', 'change2'];

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => Promise.resolve({ runTranslations : true }));
        jest.spyOn(gitClientInstance, 'commitAndPush').mockImplementationOnce(() => Promise.resolve(changes));
        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false, pathToTao: '/path/to/tao' }, data);
        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.updateTranslations(releasingBranch);

        expect(log.info).toBeCalledTimes(3);
        expect(log.info).toBeCalledWith(`Commit : [update translations - ${changes.length} files]`);
        changes.forEach(change =>
            expect(log.info).toBeCalledWith(`  - ${change}`)
        );
    });

    test('should skip translations if "no" answered', async () => {
        expect.assertions(3);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => Promise.resolve({ runTranslations : false }));
        const updateTranslations = jest.fn(() => Promise.resolve([]));
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
                updateTranslations
            };
        });

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false, pathToTao: '/path/to/tao'  }, data);
        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.updateTranslations(releasingBranch);

        expect(inquirer.prompt).toBeCalledTimes(1);
        expect(updateTranslations).not.toBeCalled();
        expect(log.done).toBeCalledTimes(1);
    });

    test('should log done message', async () => {
        expect.assertions(1);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => Promise.resolve({ runTranslations : false }));
        const updateTranslations = jest.fn(() => Promise.resolve([]));
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
                updateTranslations
            };
        });

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: false, pathToTao: '/path/to/tao'  }, data);
        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;
        await extensionApi.updateTranslations(releasingBranch);

        expect(log.done).toBeCalledTimes(1);
    });

    test('should skip prompt if updateTranslations is set', async () => {
        expect.assertions(2);

        const updateTranslations = jest.fn(() => Promise.resolve([]));
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
                updateTranslations
            };
        });

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: true, updateTranslations: true, pathToTao: '/path/to/tao' }, data);
        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;
        await extensionApi.updateTranslations(releasingBranch);

        expect(updateTranslations).toBeCalledTimes(1);
        expect(inquirer.prompt).not.toBeCalled();
    });

    test('should not update translations in non interaction mode', async () => {
        expect.assertions(2);

        const updateTranslations = jest.fn(() => Promise.resolve([]));
        taoInstanceFactory.mockImplementationOnce(() => {
            //Mock the default export
            return {
                buildAssets: jest.fn(),
                getExtensions: jest.fn(() => []),
                isInstalled: jest.fn(() => true),
                isRoot: jest.fn(() => ({ root: true, dir: taoRoot })),
                getRepoName: jest.fn(),
                updateTranslations
            };
        });

        const extensionApi = extensionApiFactory({ branchPrefix, interactive: false, updateTranslations: true });
        await extensionApi.selectTaoInstance();
        extensionApi.gitClient = gitClientInstance;

        await extensionApi.updateTranslations(releasingBranch);

        expect(updateTranslations).not.toBeCalled();
        expect(inquirer.prompt).not.toBeCalled();
    });
});
