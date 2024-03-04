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
 * Copyright (c) 2020-2024 Open Assessment Technologies SA;
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

    /**
     * Run any npm/npx command and wrap result in a Promise
     * @param {String} npmNpx - `npm` or `npx`
     * @param {String} command - command which `npm` or `npx` should invoke
     * @param {Object?} spawnOptions - options for `crossSpawn`
     * @returns {Promise} - resolves if command ran without errors, with data returned by command if any
     */
    const runCommand = (npmNpx, command, spawnOptions = {}) => {
        return new Promise((resolve, reject) => {
            if (typeof npmNpx !== 'string' || typeof command !== 'string') {
                return reject(new TypeError('Invalid argument type: npm/npx command: "npmNpx" and "command" arguments should be string'));
            }
            const opts = { ...getOptions(), ...spawnOptions };
            log.info(`${npmNpx} ${command}`, opts);

            let result;
            const spawned = crossSpawn(npmNpx, command.split(' '), opts);
            spawned.stdout?.on('data', (data) => {
                result = data; //requires `{ stdio: pipe }` option
            });
            spawned.on('close', (code) => {
                code === 0 ? resolve(result) : reject(new Error(`Error running ${npmNpx} command`));
            });
        });
    };

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
         * For monorepo,
         * read package-lock.json of a package
         * @param {String} packagePath - path relative to repository root
         * @returns {Promise<Object>} json
         */
        async readPackageLock(packagePath) {
            return fs.readJSON(path.join(packagePath, 'package-lock.json'));
        },

        /**
         * For monorepo,
         * write package-lock.json of a package
         * @param {String} packagePath - path relative to repository root
         * @param {Object} packageLockJson - json object to write into package-lock.json
         * @returns {Promise}
         */
        async writePackageLock(packagePath, packageLockJson) {
            return writeJsonFile(path.join(packagePath, 'package-lock.json'), packageLockJson, { detectIndent: true });
        },

        /**
         * Run any npm command and wrap result in a Promise
         * @param {String} command
         * @returns {Promise} - resolves if command ran without errors
         */
        npmCommand(command) {
            return runCommand('npm', command);
        },


        /**
         * Run any npx command and wrap result in a Promise
         * @param {String} command
         * @param {Object?} spawnOptions
         * @returns {Promise<*>} - resolves if command ran without errors, with data returned by command if any
         */
        npxCommand(command, spawnOptions = {}) {
            return runCommand('npx', command, spawnOptions);
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

        /**
          * For monorepo,
          * update version in package.json and package-lock.json,
          * in the root and in the packages.
          * @param {Object[]} packagesInfo - `[{ packageName: string, packagePath: string, version: string }]`
          * @param {String} rootVersion - new root package.json version
          * @return {Promise}
          */
        async lernaUpdateVersions(packagesInfo, rootVersion) {
            //root version
            // eslint-disable-next-line no-unused-vars
            const { readme, _id, ...packageJson } = await readPkg({ cwd: rootDir });
            packageJson.version = rootVersion;
            await writePkg(rootDir, packageJson);

            //monorepo package versions
            //note: alternatively:
            //  1) from the same commit as last release tag, create local tags in format `${packageInfo.packageName}@${packageInfo.lastVersion}`
            //      For example `@oat-sa-private/ui-core@5.19.0`.
            //  2) `npx lerna version --no-git-tag-version --yes --conventional-commits --changelog-preset @oat-sa/conventional-changelog-tao --no-changelog`
            //      It will calulate conventional-commit bump for each package,
            //      and update all needed things in package.json/package-lock.json files.
            //      `@oat-sa/conventional-changelog-tao` preset should be installed in the repo root, or otherwise can reference module from tao-extension-release:
            //      `path.join(path.dirname(fileURLToPath(import.meta.url)),'../node_modules/@oat-sa/conventional-changelog-tao/index.js')`
            //  3) delete local tags
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

        /**
          * For monorepo,
          * get information about its packages
          * @return {Promise<Object[]} - `[{ packageName: string, packagePath: string, lastVersion: string, dependencies: string[] }]`
          */
        async lernaGetPackagesList() {
            const packageListStr = await this.npxCommand('lerna list --all --json', { stdio: 'pipe' });

            const packageListJson = JSON.parse(packageListStr);
            const packagesInfo = packageListJson.map(packageInfo => ({
                packagePath: path.relative(rootDir, packageInfo.location),
                packageName: packageInfo.name,
                lastVersion: packageInfo.version
            }));

            const packageGraphStr = await this.npxCommand('lerna list --all --graph', { stdio: 'pipe' });

            const packageGraphJson = JSON.parse(packageGraphStr);
            for (const packageInfo of packagesInfo) {
                packageInfo.dependencies = (packageGraphJson[packageInfo.packageName] || []).filter(i =>
                    packagesInfo.some(k => k.packageName === i)
                );
            }

            return packagesInfo;
        },

        /**
         * For monorepo,
         * publish packages
         * @returns {Promise}
         */
        lernaPublish() {
            return this.npxCommand('lerna publish from-package --yes');
        }
    };
}
