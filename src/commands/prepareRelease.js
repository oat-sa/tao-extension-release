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
 * Copyright (c) 2019 Open Assessment Technologies SA;
 */

const log = require('../log.js');

const commander = require('commander');
const program = new commander.Command();

program
    .name("taoRelease prepareRelease")
    .usage("[options]")
    .option('-d, --debug', 'output extra debugging')
    // options with defaults
    .option('--base-branch <branch>', 'the source branch for the release', 'develop')
    .option('--branch-prefix <prefix>', 'the prefix of the branch created for releasing', 'release')
    .option('--origin <remotename>', 'the name of the remote repo', 'origin')
    .option('--release-branch <branch>', 'the target branch for the release PR', 'master')
    .option('--www-user <user>', 'the user who runs php commands', 'www-data')
    // options which fall back to user prompts if undefined
    .option('--tao-instance <path>', 'path to local TAO instance')
    .option('--extension-to-release <extension>', 'camelCase name of the extension to release')
    .option('--update-translations', 'indicates if we need to update translations')
    .parse(process.argv);

if (program.debug) console.log(program.opts());