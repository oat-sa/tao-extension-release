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
const packageName = 'test-package';
jest.mock('../../../src/npmPackage.js', () => {
    const originalModule = jest.requireActual('../../../src/npmPackage.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn(() => ({
            name: packageName,
            isValidPackage: jest.fn(() => true),
            publish: jest.fn()
        }))
    };
});
jest.mock('../../../src/log.js', () => ({
    error: jest.fn(),
    exit: jest.fn(),
    doing: jest.fn(),
    info: jest.fn(),
    done: jest.fn()
}));

import packageApiFactory from '../../../src/release/packageApi.js';
import npmPackageFactory from '../../../src/npmPackage.js';

import log from '../../../src/log.js';
import fs from 'fs';
import inquirer from 'inquirer';

const taoRoot = 'testRoot';
const releaseBranch = 'testReleaseBranch';

const gitClientInstance = {
    checkout: () => { },
};

beforeAll(() => {
    jest.spyOn(process, 'cwd')
        .mockImplementation(() => taoRoot);
    jest.spyOn(fs, 'existsSync')
        .mockImplementation(() => true);
});
afterEach(() => {
    jest.clearAllMocks();
})
afterAll(() => {
    jest.restoreAllMocks();
});

test('should define publish method on packageApi instance', () => {
    expect.assertions(1);

    const packageApi = packageApiFactory();
    expect(typeof packageApi.publish).toBe('function');
});

test('should checkout releasing branch', async () => {
    expect.assertions(1);

    const packageApi = packageApiFactory({ releaseBranch, interactive: true });
    packageApi.gitClient = gitClientInstance;

    jest.spyOn(gitClientInstance, 'checkout').mockImplementationOnce(() => Promise.resolve());
    jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ confirmPublish: true }));

    await packageApi.selectTarget();
    await packageApi.publish();

    expect(gitClientInstance.checkout).toBeCalledTimes(1);
});

test('should prompt about publishing', async () => {
    expect.assertions(5);

    const packageApi = packageApiFactory({ releaseBranch, interactive: true });
    packageApi.gitClient = gitClientInstance;

    jest.spyOn(gitClientInstance, 'checkout').mockImplementationOnce(() => Promise.resolve());
    jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
        expect(type).toBe('confirm');
        expect(name).toBe('confirmPublish');
        expect(message).toBe('Do you want to proceed with the \'npm publish\' command?');
        return { confirmPublish: false };
    });

    await packageApi.selectTarget();
    await packageApi.publish();

    expect(inquirer.prompt).toBeCalledTimes(1);
    expect(log.exit).toBeCalledTimes(1);
});

test('should call npmPackage.publish', async () => {
    expect.assertions(3);

    const packageApi = packageApiFactory({ releaseBranch, interactive: true });
    packageApi.gitClient = gitClientInstance;

    jest.spyOn(gitClientInstance, 'checkout').mockImplementationOnce(() => Promise.resolve());
    jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({ confirmPublish: true }));

    await packageApi.selectTarget();
    const npmPackage = npmPackageFactory();
    packageApi.npmPackage = npmPackage;
    await packageApi.publish();

    expect(log.doing).toBeCalledTimes(2);
    expect(log.doing).toHaveBeenLastCalledWith(`Publishing package ${packageName} @ undefined`);
    expect(npmPackage.publish).toBeCalledTimes(1);
});

test('should not prompt in non interactive mode', async () => {
    expect.assertions(3);

    const packageApi = packageApiFactory({ releaseBranch, interactive : false });
    packageApi.gitClient = gitClientInstance;

    jest.spyOn(gitClientInstance, 'checkout').mockImplementationOnce(() => Promise.resolve());

    await packageApi.selectTarget();
    const npmPackage = npmPackageFactory();
    packageApi.npmPackage = npmPackage;
    await packageApi.publish();

    expect(log.doing).toBeCalledTimes(2);
    expect(log.doing).toHaveBeenLastCalledWith(`Publishing package ${packageName} @ undefined`);
    expect(inquirer.prompt).not.toBeCalled();
});
