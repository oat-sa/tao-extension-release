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
const extension = 'testExtension';
jest.mock('inquirer', () => ({
    prompt: jest.fn(() => ({ extension, taoRoot }))
}));

import inquirer from 'inquirer';
import releaseFactory from '../../../../src/release.js';

const origin = 'origin';
const token = 'abc123';
const releasingBranch = 'release-1.1.1';

describe('src/release.js promptToResolveConflicts', () => {
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
    
    test('should define promptToResolveConflicts method on release instance', () => {
        expect.assertions(1);
    
        const release = releaseFactory({ origin });
        release.setData({ releasingBranch, token, extension: {} });
        expect(typeof release.promptToResolveConflicts).toBe('function');
    });

    test('should prompt to confirm resolution', async () => {
        expect.assertions(5);

        jest.spyOn(inquirer, 'prompt').mockImplementationOnce(({ type, name, message, default: defaultValue  }) => {
            expect(type).toBe('confirm');
            expect(name).toBe('isMergeDone');
            expect(message).toBe('Has the merge been completed manually? I need to push the branch to origin.');
            expect(defaultValue).toBe(false);
            return { isMergeDone: false  };
        });

        const release = releaseFactory({ origin });
        release.setData({ releasingBranch, token, extension: {} });
        await release.initialiseGitClient();
        await release.promptToResolveConflicts();

        expect(inquirer.prompt).toBeCalledTimes(1);
    });

    test('cannot merge in non interactive mode', async () => {
        expect.assertions(2);

        jest.spyOn(inquirer, 'prompt');

        const release = releaseFactory({ interactive: false });
        const result = await release.promptToResolveConflicts();
        expect(result).toBe(false);
        expect(inquirer.prompt).not.toBeCalled();
    });
    
});
