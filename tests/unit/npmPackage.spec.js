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

jest.mock('read-pkg');
jest.mock('write-pkg');
jest.mock('cross-spawn');

import readPkg from 'read-pkg';
import writePkg from 'write-pkg';
import crossSpawn from 'cross-spawn';
import npmPackageFactory from '../../src/npmPackage.js';
const npmPackage = npmPackageFactory();

const goodUrls = ['git+https://github.com/owner/my-cool-repo.git', 'github.com/owner/my-cool-repo.git'];
const badUrls = ['git+https://github.com/owner/my-cool-repo', 'https://svn.com/owner/my-cool-repo.svn'];
const validPackageData = {
    name: 'my-package',
    version: '1.2.3',
    repository: {
        url: 'https://example.com/owner/my-package.git'
    }
};
const invalidPackageData = {
    name: 'my-package',
    version: '1.2.3'
};
const folderName = 'folderName';
const version = '1.1.1';
describe('src/npmPackage.js', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    afterAll(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('should define extractRepoName method on release instance', () => {
        expect(typeof npmPackage.extractRepoName).toBe('function');
    });

    it.each(goodUrls)('the repoName can be extracted', url => {
        const mockRepository = jest.spyOn(npmPackage, 'repository', 'get');
        mockRepository.mockImplementation(() => ({ url }));
        const result = npmPackage.extractRepoName();
        expect(result).toBe('owner/my-cool-repo');
    });

    it.each(badUrls)('the repoName cannot be extracted', url => {
        const mockRepository = jest.spyOn(npmPackage, 'repository', 'get');
        mockRepository.mockImplementation(() => ({ url }));
        const result = npmPackage.extractRepoName();
        expect(result).toBe(null);
    });

    it('should define isValidPackage method on release instance', () => {
        expect(typeof npmPackage.isValidPackage).toBe('function');
    });

    it('read a valid package', async () => {
        const mockRepository = jest.spyOn(npmPackage, 'parsePackageJson');
        mockRepository.mockImplementationOnce(async () => validPackageData);
        const result = await npmPackage.isValidPackage();
        expect(result).toBe(true);
    });

    it('read an invalid package', async () => {
        const mockParse = jest.spyOn(npmPackage, 'parsePackageJson');
        mockParse.mockImplementationOnce(async () => invalidPackageData);
        const result = await npmPackage.isValidPackage();
        expect(result).toBe(false);
    });

    it('should define npmCommand method on release instance', () => {
        expect.assertions(2);
        expect(typeof npmPackage.npmCommand).toBe('function');
        expect(npmPackage.npmCommand()).rejects.toEqual(
            TypeError('Invalid argument type: npm/npx command: "npmNpx" and "command" arguments should be string')
        );
    });

    it('npmCommand should reject on invalid params', () => {
        expect.assertions(1);
        return expect(npmPackage.npmCommand(['my', 'command'])).rejects.toEqual(
            TypeError('Invalid argument type: npm/npx command: "npmNpx" and "command" arguments should be string')
        );
    });

    it('npmCommand should crossSpawn', async () => {
        expect.assertions(1);
        const on = jest.fn((event, callback) => callback(0));
        crossSpawn.mockImplementationOnce(() => {
            //Mock the default export
            return {
                on
            };
        });
        await npmPackage.npmCommand('install');
        expect(on).toBeCalledTimes(1);
    });

    it('should define updateVersion method on release instance', () => {
        expect(typeof npmPackage.updateVersion).toBe('function');
    });

    it('should read package.json', async () => {
        readPkg.mockImplementation(() => Promise.resolve({}));
        writePkg.mockImplementation(() => Promise.resolve({}));
        const mockNpmCommand = jest.spyOn(npmPackage, 'npmCommand');
        mockNpmCommand.mockImplementation(arg => arg);
        await npmPackage.updateVersion(folderName);
        expect(readPkg).toBeCalled();
        expect(readPkg).toBeCalledWith({ cwd: folderName });
    });

    it('should write package.json', async () => {
        readPkg.mockImplementation(() => Promise.resolve({}));
        writePkg.mockImplementation(() => Promise.resolve({}));
        const mockNpmCommand = jest.spyOn(npmPackage, 'npmCommand');
        mockNpmCommand.mockImplementation(arg => arg);
        await npmPackage.updateVersion(folderName, version);
        expect(writePkg).toBeCalled();
        expect(writePkg).toBeCalledWith(folderName, { version });
    });

    it('should define parsePackageJson method on release instance', () => {
        expect(typeof npmPackage.parsePackageJson).toBe('function');
    });

    it('should return data from package.json', async () => {
        const repoName = 'owner/my-cool-repo';
        readPkg.mockImplementation(() => Promise.resolve(validPackageData));
        jest.spyOn(npmPackage, 'extractRepoName').mockImplementation(() => repoName);

        const result = await npmPackage.parsePackageJson(folderName);
        expect(readPkg).toBeCalled();
        expect(readPkg).toBeCalledWith({ cwd: folderName });
        expect(result).toStrictEqual({ ...validPackageData, repoName });
    });

    it('should define ci method on release instance', () => {
        const mockNpmCommand = jest.spyOn(npmPackage, 'npmCommand');
        mockNpmCommand.mockImplementation(arg => arg);
        expect(typeof npmPackage.ci).toBe('function');
        expect(npmPackage.ci()).toBe('ci');
    });

    it('should define build method on release instance', () => {
        const mockNpmCommand = jest.spyOn(npmPackage, 'npmCommand');
        mockNpmCommand.mockImplementation(arg => arg);
        expect(typeof npmPackage.build).toBe('function');
        expect(npmPackage.build()).toBe('run build');
    });

    it('should define build method on release instance', () => {
        const repoName = 'owner/my-cool-repo';
        const mockNpmCommand = jest.spyOn(npmPackage, 'npmCommand');
        mockNpmCommand.mockImplementation(arg => arg);
        expect(typeof npmPackage.publish).toBe('function');
        expect(npmPackage.publish(repoName)).toBe(`publish --registry ${repoName}`);
    });
});
