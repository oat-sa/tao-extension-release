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

const readPkg = require('read-pkg');
const npmUtil = require('./npm.js');

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
    let _repoName;

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
         * Run `npm ci` command
         * @returns {Promise}
         */
        cleanInstall() {
            return npmUtil.npmCommand('ci');
        },

        /**
         * Run `npm run build` command
         * @returns {Promise}
         */
        build() {
            return npmUtil.npmCommand('run build');
        },

        /**
         * Run `npm publish` command
         * Note: `npm publish` does not accept a `--prefix` param (to change dir) like other npm commands
         * @returns {Promise}
         */
        async publish(dryRun = true, myRegistry = true) {
            await npmUtil.verifyUser();

            // Flags for testing purposes:
            const dryRunFlag = '--dry-run';
            const registryFlag = '--registry http://localhost:4873';
            const publishCommand = `publish --otp --access public ${dryRun && dryRunFlag} ${myRegistry && registryFlag}`;
            return npmUtil.npmCommand(publishCommand, false);
        }
    };
};
