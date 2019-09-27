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

updateNotifier({pkg}).notify();

const commander = require('commander');
const program = new commander.Command();

program
    .version('0.5.0')
    .name('taoRelease')
    .usage('command [options]')
    .command('prepareRelease', 'prepare an extension release in a local branch', {
        executableFile: './src/commands/prepareRelease'
    })
    .command('createRelease', 'push a local release branch to its remote and finish the release', {
        executableFile: './src/commands/createRelease'
    })
    .command('oldWayRelease', '[deprecated] run the whole release process from start to finish',  {
        executableFile: './src/commands/oldWayRelease'
    })
    .parse(process.argv);
