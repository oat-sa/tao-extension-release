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
 * Copyright (c) 2017-2019 Open Assessment Technologies SA;
 */

/**
 * CLI script entry point
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
const updateNotifier = require('update-notifier');

const pkg = require('./package.json');

updateNotifier({ pkg }).notify();

const commander = require('commander');
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
