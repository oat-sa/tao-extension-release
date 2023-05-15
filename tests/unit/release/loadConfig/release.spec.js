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
import inquirer from 'inquirer';
import open from 'open';
import releaseFactory from '../../../../src/release.js';

const OLD_ENV = process.env;
beforeAll(() => {
    jest.useFakeTimers();
});
beforeEach(() => {
    jest.resetModules();
    process.env = {};
    jest.spyOn(process, 'stdin', 'get').mockReturnValue({ isTTY: true });
});
afterEach(() => {
    jest.clearAllMocks();
    process.env = OLD_ENV;
});
afterAll(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
});

describe('src/release.js loadConfig', () => {
    test('should define loadConfig method on release instance', () => {
        expect.assertions(1);

        const release = releaseFactory();
        expect(typeof release.loadConfig).toBe('function');
    });

    test('should open github token settings if there is no token in the config', async () => {
        expect.assertions(2);

        const release = releaseFactory();
        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({}));
        jest.advanceTimersByTime(2000);
        await release.loadConfig();
        jest.runAllTimers();
        expect(open).toBeCalledTimes(1);
        expect(open).toBeCalledWith('https://github.com/settings/tokens');
        
    });

    test('should prompt user to provide a token if there is no token in the config', async () => {
        expect.assertions(4);

        const release = releaseFactory();
        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message }) => {
            expect(type).toBe('input');
            expect(name).toBe('token');
            expect(message).toBe('I need a Github token, with "repo" rights (check your browser) : ');
            return { };
        });

        await release.loadConfig();
        jest.runAllTimers();
        expect(inquirer.prompt).toBeCalledTimes(1);
    });

    test('should validate provided token', async () => {
        expect.assertions(2);

        const validToken = 'hsajdf234jhsaj234dfhh234asj32dfh';
        const invalidToken = 'invalidToken';

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ validate }) => {
            expect(validate(validToken)).toBe(true);
            expect(validate(invalidToken)).toBe(false);
            return { };
        });

        const release = releaseFactory();
        await release.loadConfig();
        jest.runAllTimers();
    });

    test('should trim token', async () => {
        expect.assertions(1);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ filter }) => {
            expect(filter('   testToken   ')).toBe('testToken');
            return {};
        });

        const release = releaseFactory();

        await release.loadConfig();
        jest.runAllTimers();
    });

    test('should exit without a token in non interaction mode', async () => {
        expect.assertions(2);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(() => ({}));
        const release = releaseFactory({ interactive: false });
        await release.loadConfig();

        expect(inquirer.prompt).not.toBeCalled();
        expect(log.exit).toBeCalledTimes(1);
    });

    test('fallback to env token if not set', async () => {
        expect.assertions(2);

        const release = releaseFactory();
        expect(typeof release.getData().token).toBe('undefined');

        process.env.GITHUB_TOKEN = 'foo';
        await release.loadConfig();

        expect(release.getData().token).toBe('foo');

        delete process.env.GITHUB_TOKEN;
    });
});
