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

import log from '../../../../src/log.js';
import inquirer from 'inquirer';
import releaseFactory from '../../../../src/release.js';

const extension = 'testExtension';
const version = '1.1.1';

const data = {
    version,
    extension: { name: extension }
};

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

describe('src/release.js confirmRelease', () => {
    
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
});
