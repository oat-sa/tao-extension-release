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
import path from 'path';
import fs from 'fs-extra';
import writeJsonFile from 'write-json-file';

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

        npxCommand(command, spawnOptions = {}) {
            return new Promise( (resolve, reject) => {
                if (typeof command !== 'string') {
                    return reject(new TypeError(`Invalid argument type: ${typeof command} for npxCommand (should be string)`));
                }
                const opts = { ...getOptions(), ...spawnOptions };
                log.info(`npx ${command}`, opts);

                let result;
                const spawned = crossSpawn('npx', command.split(' '), opts);
                spawned.stdout?.on('data', (data) => {
                    result = data;
                });
                spawned.on('close', (code) => {
                    code === 0 ? resolve(result) : reject(new Error('Error running npx command'));
                });
            });
        },

        async lernaGetPackagesList() {
            const packageListStr = await this.npxCommand('lerna list --json', { stdio: 'pipe' });

            const packageListJson = JSON.parse(packageListStr);
            const packagesInfo = packageListJson.map(packageInfo => ({
                packagePath: path.relative(rootDir, packageInfo.location),
                packageName: packageInfo.name,
                lastVersion: packageInfo.version
            }));

            const packageGraphStr = await this.npxCommand('lerna list --graph', { stdio: 'pipe' });

            const packageGraphJson = JSON.parse(packageGraphStr);
            for (const packageInfo of packagesInfo) {
                packageInfo.dependencies = (packageGraphJson[packageInfo.packageName] || []).filter(i =>
                    packagesInfo.some(k => k.packageName === i)
                );
            }

            return packagesInfo;
        },

        lernaPublish() {
            return this.npxCommand('lerna publish from-package --yes');
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
        },

        async readPackageLock(packagePath) {
            return fs.readJSON(path.join(packagePath, 'package-lock.json'));
        },

        async writePackageLock(packagePath, packageLockJson) {
            return writeJsonFile(path.join(packagePath, 'package-lock.json'), packageLockJson, { detectIndent: true });
        },

        async lernaUpdateVersions(packagesInfo, rootVersion) {
            // eslint-disable-next-line no-unused-vars
            const { readme, _id, ...packageJson } = await readPkg({ cwd: rootDir });
            packageJson.version = rootVersion;
            await writePkg(rootDir, packageJson);

            for (const packageInfo of packagesInfo) {
                // eslint-disable-next-line no-unused-vars
                const { readme, _id, ...packageJson } = await readPkg({ cwd: packageInfo.packagePath });
                packageJson.version = packageInfo.version;
                for (const depPackageInfo of packagesInfo) {
                    for (const depListKey of ['dependencies', 'devDependencies']) {
                        if (packageJson[depListKey] && packageJson[depListKey][depPackageInfo.packageName]) {
                            packageJson[depListKey][depPackageInfo.packageName] = `^${depPackageInfo.version}`;
                        }
                    }
                }
                await writePkg(packageInfo.packagePath, packageJson);

                const packageLockJson = await this.readPackageLock(packageInfo.packagePath);
                packageLockJson.version = packageInfo.version;
                if ((packageLockJson.packages || [])['']?.name === packageInfo.packageName) {
                    packageLockJson.packages[''].version = packageInfo.version;
                }
                await this.writePackageLock(packageInfo.packagePath, packageLockJson);
            }
            return this.npmCommand('i');
        },
    };
}
