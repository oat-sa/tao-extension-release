#!/usr/bin/env node

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
 * Copyright (c) 2017-2023 Open Assessment Technologies SA;
 */

/**
 * CLI script entry point
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
import updateNotifier from 'update-notifier';

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(`${__dirname}/package.json`));

updateNotifier({ pkg }).notify();

import commander from 'commander';
const program = new commander.Command();

program
    .version(pkg.version)
    .name('taoRelease')
    .usage('command [options]')
    .command('extensionRelease', 'release a TAO extension', {
        executableFile: './src/commands/extensionRelease'
    })
    .command('npmRelease', 'release and publish an npm package', {
        executableFile: './src/commands/npmRelease'
    })
    .command('repoRelease', 'release any repository', {
        executableFile: './src/commands/repoRelease'
    })
    .parse(process.argv);
