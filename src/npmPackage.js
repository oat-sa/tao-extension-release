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
 * Helper module to ease working with npm packages and package.json info
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

const fs                      = require('fs');
const { normalize, basename } = require('path');
const { exec }                = require('child_process');
const crossSpawn              = require('cross-spawn');
const readPkg                 = require('read-pkg');

const isWin = /^win/.test(process.platform);

/**
 * Get the npmPackage
 *
 * @param {String} rootDir - the path of the TAO instance root
 * @param {Boolean} [quiet = true] - if we redirect stdout and stderr to the console
 * @return {Promise} resolves with a result object
 */
module.exports = function npmPackageFactory(rootDir = '', quiet = true) {

    let _name;
    let _version;
    let _repository;

    return {

        /**
         * Does the given folder look like a valid npm package?
         * @param {String} folderName
         * @returns {Boolean}
         */
        async isValidPackage(folderName = rootDir) {
            console.log('rootDir', rootDir, 'folderName', folderName);
            const pkg = await this.parsePackageJson(folderName);
            console.log('pkg', pkg);
            return pkg.name && pkg.version && pkg.repository.url;
        },

        /**
         * Extract (org+)name, version, reponame
         * @param {String} folderName
         * @returns {Object}
         */
        async parsePackageJson(folderName = rootDir) {
            const { name, version, repository } = await readPkg({ cwd: folderName });
            _name = name;
            _version = version;
            _repository = repository;
            return { name, version, repository };
        },

        get name() {
            return _name;
        },

        get version() {
            return _version;
        },

        get repository() {
            return _repository;
        },

        /**
         * Run any npm command and wrap result in a Promise
         * @param {String} command
         * @returns {Promise}
         */
        npmCommand(command) {
            return new Promise( (resolve, reject) => {
                if (typeof command !== 'string') {
                    reject();
                }
                const spawned = crossSpawn('npm', command.split(' '));
                spawned.on('close', code => code === 0 ? resolve() : reject());
            });
        },

        /**
         * Run `npm ci` command
         * @returns {Promise}
         */
        cleanInstall() {
            return this.npmCommand('ci');
        },

        /**
         * Run `npm run build` command
         * @returns {Promise}
         */
        build() {
            return this.npmCommand('run build');
        },

        /**
         * Run `npm publish` command
         * @returns {Promise}
         */
        publish() {
            return this.npmCommand('publish --registry http://localhost:4873');
        }
    };
};
