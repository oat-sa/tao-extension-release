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

/**
 * Helper module to ease working with npm CLI
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const crossSpawn = require('cross-spawn');
const log = require('./log.js');

/**
 * Get the npmPackage
 *
 * @param {String} rootDir - the path of the TAO instance root
 * @return {Promise} resolves with a result object
 */
module.exports =  {
    /**
     * Run any npm command and wrap result in a Promise
     * @param {String} command
     * @param {String} prefix - directory to run command in, if not cwd
     * @returns {Promise} - resolves if command ran without errors
     */
    async npmCommand(command, prefix) {
        return new Promise( (resolve, reject) => {
            if (typeof command !== 'string') {
                reject();
            }
            if (prefix) {
                command += ` --prefix ${prefix}`;
            }
            log.info('npm ' + command);

            const options = { stdio: 'inherit', env: process.env };
            const spawned = crossSpawn('npm', command.split(' '), options);
            spawned.on('close', code => {
                code === 0 ? resolve() : reject();
            });
        });
    },

    /**
     * Run a command to determine if current user is logged in with npmjs account and has 2FA
     * @returns {Boolean}
     */
    async verifyUser() {
        log.doing('Checking npm account');

        try {
            const profile = await this.npmCommand('profile get --json');
            console.log('p', profile);

            const has2fa = profile && profile.tfa && profile.tfa.mode && profile.tfs.mode === 'auth-and-writes';

            if (profile.name && has2fa) {
                log.done(`Logged in as ${profile.name} with 2FA`);
                return true;
            }
        }
        catch (e) {
            log.error('Error with npm authentication. Please set up your account.').exit();
        }
    }
};
