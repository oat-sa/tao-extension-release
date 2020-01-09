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
 * Copyright (c) 2020 Open Assessment Technologies SA;
 */

/**
 * This module provides TAO extension-specific implementations of methods to ../release.js
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const path = require('path');
const inquirer = require('inquirer');

const taoInstanceFactory = require('../taoInstance.js');
const gitClientFactory = require('../git.js');
const config = require('../config.js')();
const log = require('../log.js');

module.exports = {
    /**
     * Select and initialise tao instance
     * @param {Object} params - command line params
     * @param {Object} data - release subject data
     * @returns {Object}
     */
    async selectTaoInstance(params, data) {
        // Start with CLI option, if it's missing we'll prompt user
        let taoRoot = params.pathToTao;

        if (!taoRoot) {
            ( { taoRoot } = await inquirer.prompt({
                type: 'input',
                name: 'taoRoot',
                message: 'Path to the TAO instance : ',
                default: data.taoRoot || process.cwd()
            }) );
        }

        const taoInstance = taoInstanceFactory(path.resolve(taoRoot), false, params.wwwUser);

        const { dir, root } = await taoInstance.isRoot();

        if (!root) {
            log.exit(`${dir} is not a TAO instance`);
        }

        if (!await taoInstance.isInstalled()) {
            log.exit('It looks like the given TAO instance is not installed.');
        }

        data.taoRoot = dir;

        return {
            data,
            taoInstance
        };
    },

    /**
     * Select and initialise the extension to release
     * @param {Object} params - command line params
     * @param {Object} data - release subject data
     * @param {TaoInstance} taoInstance
     * @returns {GitClient}
     */
    async selectExtension(params, data, taoInstance) {
        // Start with CLI option, if it's missing we'll prompt user
        let extension = params.extensionToRelease;
        const availableExtensions = await taoInstance.getExtensions();

        if (extension && !availableExtensions.includes(extension)) {
            log.exit(`Specified extension ${extension} not found in ${data.taoRoot}`);
        }
        else if (!extension) {
            ( { extension } = await inquirer.prompt({
                type: 'list',
                name: 'extension',
                message: 'Which extension you want to release ? ',
                pageSize: 12,
                choices: availableExtensions,
                default: data.extension && data.extension.name,
            }) );
        }

        // TODO: split
        const gitClient = gitClientFactory(`${data.taoRoot}/${extension}`, params.origin, extension);

        data.extension = {
            name: extension,
            path: `${data.taoRoot}/${extension}`,
        };

        await config.write(data);

        return gitClient;
    },

    /**
     * Compile and publish extension assets
     * @param {Object} data - release subject data
     * @param {TaoInstance} taoInstance
     * @param {GitClient} gitClient
     */
    async compileAssets(data, taoInstance, gitClient) {
        log.doing('Bundling');
        log.info('Asset build started, this may take a while');

        try {
            await taoInstance.buildAssets(data.extension.name, false);

            const changes = await gitClient.commitAndPush(data.releasingBranch, 'bundle assets');

            if (changes && changes.length) {
                log.info(`Commit : [bundle assets - ${changes.length} files]`);
                changes.forEach(file => log.info(`  - ${file}`));
            }
        } catch (error) {
            log.error(`Unable to bundle assets. ${error.message}. Continue.`);
        }

        log.done();
    }
};
