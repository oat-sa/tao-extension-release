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
import readPkg from 'read-pkg';
import writePkg from 'write-pkg';
import npmPackageFactory from '../../src/npmPackage.js';
const npmPackage = npmPackageFactory();

jest.mock('read-pkg');
jest.mock('write-pkg');

const goodUrls = [
    'git+https://github.com/owner/my-cool-repo.git',
    'github.com/owner/my-cool-repo.git'
];
const badUrls = [
    'git+https://github.com/owner/my-cool-repo',
    'https://svn.com/owner/my-cool-repo.svn',
];
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
    it('should define extractRepoName method on release instance', () => {
        expect(typeof npmPackage.extractRepoName).toBe('function');
    });
    it.each(goodUrls)('the repoName can be extracted', (url) => {
        const mockRepository = jest.spyOn(npmPackage, 'repository', 'get');
        mockRepository.mockImplementation(() => ({ url }));
        const result = npmPackage.extractRepoName();
        expect(result).toBe('owner/my-cool-repo');
    });
    it.each(badUrls)('the repoName cannot be extracted', (url) => {
        const mockRepository = jest.spyOn(npmPackage, 'repository', 'get');
        mockRepository.mockImplementation(() => ({ url }));
        const result = npmPackage.extractRepoName();
        expect(result).toBe(null);
    });
    it('should define isValidPackage method on release instance', () => {
        expect(typeof npmPackage.isValidPackage).toBe('function');
    });
    it('read a valid package', async() => {
        const mockRepository = jest.spyOn(npmPackage, 'parsePackageJson');
        mockRepository.mockImplementation(async() => validPackageData);
        const result = await npmPackage.isValidPackage();
        expect(result).toBe(true);
    });
    it('read an invalid package', async() => {
        const mockParse = jest.spyOn(npmPackage, 'parsePackageJson');
        mockParse.mockImplementation(async() => invalidPackageData);
        const result = await npmPackage.isValidPackage();
        expect(result).toBe(false);
    });
    it('should define npmCommand method on release instance', () => {
        expect.assertions(2);
        expect(typeof npmPackage.npmCommand).toBe('function');
        expect(npmPackage.npmCommand()).rejects.toEqual(TypeError('Invalid argument type: undefined for npmCommand (should be string)'));
    });
    it('npmCommand should reject on invalid params', () => {
        expect.assertions(1);
        return expect(npmPackage.npmCommand(['my', 'command'])).rejects.toEqual(TypeError('Invalid argument type: object for npmCommand (should be string)'));
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
});