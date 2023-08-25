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
 * Helper module to ease working with npm packages and package.json info
 *
 * @author Martin Nicholson <martin@taotesting.com>
 */

import readPkg from 'read-pkg';
import crossSpawn from 'cross-spawn';
import log from './log.js';
import writePkg from 'write-pkg';

/**
 * Get the npmPackage
 *
 * @param {String} rootDir - the path of the TAO instance root
 * @param {Boolean} [quiet = true] - if we redirect stdout and stderr to the console
 * @return {NpmPackage}
 */
export default function npmPackageFactory(rootDir = '', quiet = true) {

    let _name;
    let _version;
    let _repository;
    let _repoName;

    const getOptions = (cwd = rootDir) => ({
        cwd,
        stdio: quiet ? 'ignore' : 'inherit'
    });

    return {

        get name() {
            return _name;
        },

        get version() {
            return _version;
        },

        get repository() {
            return _repository;
        },

        get repoName() {
            return _repoName;
        },

        /**
         * Does the given folder look like a valid npm package?
         * @param {String} folderName
         * @returns {Boolean}
         */
        async isValidPackage(folderName = rootDir) {
            const pkg = await this.parsePackageJson(folderName);
            return !!(pkg.name && pkg.version && pkg.repository && pkg.repository.url);
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
            _repoName = this.extractRepoName();
            return { name, version, repository, repoName: _repoName };
        },

        /**
         * Extract the github repo name in org/repo format from the package's repository url
         * @returns {String}
         */
        extractRepoName() {
            const matches = this.repository.url.match(/([\w-]+\/[\w-]+)\.git$/);
            if (matches) {
                return matches[1];
            }
            return null;
        },

        /**
         * Run any npm command and wrap result in a Promise
         * @param {String} command
         * @returns {Promise} - resolves if command ran without errors
         */
        npmCommand(command) {
            return new Promise( (resolve, reject) => {
                if (typeof command !== 'string') {
                    return reject(new TypeError(`Invalid argument type: ${typeof command} for npmCommand (should be string)`));
                }
                const opts = getOptions();
                log.info(`npm ${command}`, opts);

                const spawned = crossSpawn('npm', command.split(' '), opts);
                spawned.on('close', code => {
                    code === 0 ? resolve() : reject(new Error('Error running npm command'));
                });
            });
        },

        /**
         * Run `npm ci` command
         * @returns {Promise}
         */
        ci() {
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
         * Parameters are mainly for ease of development/testing
         * @param {String} [registry='https://registry.npmjs.org']
         * @returns {Promise}
         */
        publish(registry = 'https://registry.npmjs.org') {
            const publishCommand = `publish --registry ${registry}`;
            return this.npmCommand(publishCommand);
        },

        /**
          * Update version in package.json and package-lock.json
          *
          * @param {String} folderName - the path to package
          * @param {String} version - package version
          * @return {Promise}
          */
        async updateVersion(folderName = rootDir, version) {
            // eslint-disable-next-line no-unused-vars
            const { readme, _id, ...packageJson } =  await readPkg({ cwd: folderName });

            await writePkg(folderName, { ...packageJson, version });

            return this.npmCommand('i');
        }
    };
}
