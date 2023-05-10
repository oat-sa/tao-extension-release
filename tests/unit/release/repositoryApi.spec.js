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
jest.mock('../../../src/log.js', () => ({
    error: jest.fn(() => ({
        exit: jest.fn()
    })),
    exit: jest.fn()
}));
const name = 'oat-sa/tao-extension-release';
jest.mock('../../../src/git.js', () => {
    const originalModule = jest.requireActual('../../../src/git.js');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn((path, origin) => ({
            getRepositoryName:  jest.fn(() => {
                return origin === 'origin' ? name : Promise.reject(new Error('Not a git repo'))
            }),
        }))
    };
});
import repositoryApiFactory from '../../../src/release/repositoryApi.js';
import log from '../../../src/log.js';

const path = '/foo/bar';

afterAll(() => {
    jest.restoreAllMocks();
});

test('should define selectTarget method on repositoryApi instance', () => {
    const data = {x: 1};
    const data2 = {x: 2};
    const repositoryApi = repositoryApiFactory({}, data);
    expect(typeof repositoryApi.selectTarget).toBe('function');
    expect(typeof repositoryApi.setData).toBe('function');
    expect(typeof repositoryApi.getData).toBe('function');
    expect(repositoryApi.getData()).toStrictEqual(data);
    repositoryApi.setData(data2);
    expect(repositoryApi.getData()).toStrictEqual(data2);
    expect(typeof repositoryApi.gitClient).toBe('object');
    expect(typeof repositoryApi.npmPackage).toBe('undefined');
});

test('should return selected target data', async () => {
    expect.assertions(1);
    jest.spyOn(process, 'cwd').mockImplementation(() => path);
    const repositoryApi = repositoryApiFactory({origin: 'origin'});
    const res = await repositoryApi.selectTarget();

    expect(res).toStrictEqual({
        repository: {
            path,
            name
        },
    });

});

test('should log error if package.json is invalid', async () => {
    expect.assertions(1);
    
    jest.spyOn(process, 'cwd').mockImplementation(() => path);

    const repositoryApi = repositoryApiFactory();
    await repositoryApi.selectTarget();

    expect(log.error).toBeCalledTimes(1);
});
