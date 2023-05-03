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
 * Copyright (c) 2019-2021 (original work) Open Assessment Technologies SA ;
 */

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = {
    verbose: true,
    transform: {
        '^.+\\.js$': ['babel-jest', { configFile: path.join(__dirname, 'babel.jest.config.cjs') }],
    },
    collectCoverageFrom: ['<rootDir>/src/**/*.js'],
    testMatch: ['**/*.spec.js'],
    testPathIgnorePatterns: ['node_modules'],
    coverageReporters: ['json', 'text', 'html'],
    coveragePathIgnorePatterns: ['/node_modules/'],
    setupFilesAfterEnv: ['./jest.setup.js', 'jest-extended']
};

export default config;
