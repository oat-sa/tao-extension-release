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
 * This module contains methods to retrieve info and data from a TAO instance.
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */

const fs                      = require('fs-extra');
const { normalize, basename } = require('path');
const { exec }                = require('child_process');
const phpParser               = require('php-parser');
const crossSpawn              = require('cross-spawn');

const isWin = /^win/.test(process.platform);

const versionPropRegex = /'version' => ('\d+\.\d+\.\d+((\.|-)\d+)?')/g;

/**
 * Get the taoInstance
 *
 * @param {String} rootDir - the path of the TAO instance root
 * @param {Boolean} [quiet = true] - if we redirect stdout and stderr to the console
 * @param {String} [wwwUser = www-data] - the user with web server rights
 * @return {Promise} resolves with a result object
 */
module.exports = function taoInstanceFactory(rootDir = '', quiet = true, wwwUser = 'www-data') {

    return {

        /**
         * Check if the given directory is the root of a TAO instance
         * @param {String} [dir] - the path of the directory to check
         * @return {Promise} resolves with a result object
         */
        isRoot(dir = rootDir) {
            return new Promise((resolve, reject) => {
                const result = {
                    dir,
                    root : false
                };
                fs.lstat(dir, (err, stats) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!stats.isDirectory()) {
                        return reject(new Error(`${dir} must be a valid directory`));
                    }

                    fs.readdir(dir, (err, files) => {
                        if (err) {
                            return reject(err);
                        }
                        result.root = files.length &&
                            files.indexOf('tao') > -1 &&
                            files.indexOf('generis') > -1 &&
                            files.indexOf('index.php') > -1 &&
                            files.indexOf('config') > -1;
                        resolve(result);
                    });
                });
            });
        },

        /**
         * Check if the given TAO instance is installed
         * @returns {Promise<Boolean>}
         */
        isInstalled(){
            const installFile =  normalize(`${rootDir}/tao/views/locales/en-US/messages.json`);

            return new Promise( resolve => {
                fs.access(installFile, fs.constants.R_OK, err => {
                    if (err) {
                        return resolve(false);
                    }
                    return resolve(true);
                });
            });
        },

        /**
        * Check if the given name is an extension of the TAO instance
        * @param {String} extensionName - the name to verify
        * @return {Promise} resolves with a results object
        */
        isExtension(extensionName) {
            const extensionPath = normalize(`${rootDir}/${extensionName}`);
            return new Promise( (resolve, reject) => {
                fs.lstat(extensionPath, (err, stats) => {
                    const result = {
                        dir : extensionPath,
                        extension : false
                    };
                    if (err) {
                        return reject(err);
                    }
                    if (stats.isDirectory()) {
                        fs.readdir(extensionPath, (err, files) => {
                            if (err) {
                                return reject(err);
                            }
                            result.extension = files.length && files.indexOf('manifest.php') > -1;
                            resolve(result);
                        });
                    } else {
                        resolve(result);
                    }
                });
            });
        },

        /**
         * Get the extension list of the current instance
         *
         * @return {Promise} resolves with the list of extensions
         */
        getExtensions(){
            return new Promise( (resolve, reject) => {
                fs.readdir(rootDir, (err, files) => {
                    if (err) {
                        return reject(err);
                    }

                    Promise
                        .all(files.map( file => this.isExtension(file)))
                        .then(results => {
                            resolve(
                                results
                                    .filter( entry => entry.extension)
                                    .map( entry => basename(entry.dir) )
                            );
                        })
                        .catch( err => reject(err) );
                });
            });
        },

        /**
        * Parse TAO manifest and extract most of it's info
        * @param {String} manifestPath - the path to the extension manifest
        * @return {Promise} resolves with an object that represents the manifest
        */
        parseManifest(manifestPath = '') {
            //reducer AST to JSON for arrays
            const reduceEntry = (entries) => {
                return entries.items.reduce((acc, entry) => {
                    var value;

                    if (entry.value.kind === 'string') {
                        value = entry.value.value;
                    }
                    if (entry.value.kind === 'array') {

                        value = reduceEntry(entry.value);
                    }
                    if (entry.key && entry.key.kind === 'string') {
                        acc[entry.key.value] = value;
                    }

                    return acc;
                }, {});
            };

            return new Promise((resolve, reject) => {
                fs.readFile(manifestPath, 'utf-8', (err, content) => {
                    if (err) {
                        return reject(err);
                    }

                    //load AST from PHP code
                    let parsed = phpParser.parseCode(content)
                        .children
                        //assume the return expression contains the manifest
                        .filter(token => token.kind === 'return')
                        .reduce((acc, token) => {
                            if (token.expr.kind === 'array') {
                                return reduceEntry(token.expr);
                            }
                            return acc;
                        }, {});

                    resolve(parsed);
                });
            });
        },

        /**
         * Extract the repository name from the extension composer
         * @param {String} extensionName - the name of the extension
         * @returns {Promise} resolves with the repo name
         */
        getRepoName(extensionName = ''){
            const composerPath = normalize(`${rootDir}/${extensionName}/composer.json`);
            return new Promise( (resolve, reject) => {
                fs.readFile(composerPath, 'utf-8', (err, data) => {
                    var fileData;
                    if(err){
                        return reject(err);
                    }
                    try{
                        fileData = JSON.parse(data);
                    } catch(jsonErr){
                        return reject(jsonErr);
                    }
                    return resolve(fileData.name);
                });
            });
        },

        /**
         * Run bundling for SASS and JavaScript assets.
         * Run npm install if not done yet on the TAO instance.
         *
         * @param {String} extensionName - the name of the extension to bundle
         * @returns {Promise} resolves once done
         */
        buildAssets(extensionName = ''){
            const getOptions = (cwd) => {
                const options = {
                    cwd : cwd || normalize(`${rootDir}/tao/views/build`)
                };
                if(!quiet){
                    options.stdio = 'inherit';
                }

                return options;
            };

            /**
             * Touch the mathjax fallback if needed to prevent build to fail
             * @returns {Promise}
             */
            const mathJaxFallback = () => {
                const touchFile = normalize(`${rootDir}/taoQtiItem/views/js/mathjax/MathJax.js`);
                return new Promise( (resolve, reject) => {
                    fs.open(touchFile, 'wx', (openErr, fd) => {
                        if(openErr){
                            //the file exists we are fine with that
                            if( openErr.code !== 'EEXISTS'){
                                return resolve();
                            }
                            return reject(openErr);
                        }
                        fs.close(fd, closeErr => {
                            if(closeErr){
                                return reject(closeErr);
                            }
                            return resolve();
                        });
                    });
                });
            };

            /**
             * run the given grunt task for the current extension :
             * `grunt extensionNametask`
             * @param {String} task
             */
            const runGruntTask = task => {
                return new Promise( (resolve, reject) => {
                    const spawned = crossSpawn(normalize(`${getOptions().cwd}/node_modules/.bin/grunt`), [`${extensionName.toLowerCase()}${task}`], getOptions());
                    spawned.on('close', code => code === 0 ? resolve() : reject());
                });
            };

            /**
             * run `npm install` on the TAO build folder at least once
             *
             * @param {object} options - options to perform npm install
             * @param {bool} checkIfCanRunNpmInstall - should perform a check if it is possible to run npm
             */
            const installNpm = (options, checkIfCanRunNpmInstall = false) => {
                return new Promise( (resolve, reject) => {
                    if (checkIfCanRunNpmInstall && !fs.existsSync(`${options.cwd}/package.json`)) {
                        resolve();
                        return;
                    }

                    process.env['PUPPETEER_SKIP_CHROMIUM_DOWNLOAD'] = 1;
                    const spawned = crossSpawn('npm', ['ci'], options);
                    spawned.on('close', code => code === 0 ? resolve() : reject());
                });
            };

            /**
             * run tasks in sequence
             * @param {String[]} tasks - the list of grunt tasks
             */
            const runTasks = tasks =>
                tasks.reduce(
                    (promise, task) => promise.then(() => runGruntTask(task)),
                    Promise.resolve()
                );

            return new Promise( resolve => {
                const buildConfigPath = normalize(`${rootDir}/${extensionName}/views/build/grunt`);
                fs.readdir(buildConfigPath, (err, files) => {
                    const availableTasks = [];
                    if(err){
                        return resolve(availableTasks);
                    }

                    if(files.indexOf('sass.js') > -1){
                        availableTasks.push('sass');
                    }
                    if(files.indexOf('bundle.js') > -1){
                        availableTasks.push('bundle');
                    }
                    return resolve(availableTasks);
                });
            }).then( tasks => {
                if(tasks.length){
                    return mathJaxFallback()
                        .then( () => installNpm(getOptions(normalize(`${rootDir}/${extensionName}/views/`)), true))
                        .then( () => installNpm(getOptions()))
                        .then( () => runTasks(tasks));
                }
            });
        },

        /**
         * Update translations
         *
         * @param {String} extensionName - the name of the extension to bundle
         * @returns {Promise} resolves once done
         */
        updateTranslations(extensionName = ''){
            const options = {
                cwd : rootDir
            };
            return new Promise( (resolve, reject) => {
                const command = (isWin ? '' : `sudo -u ${wwwUser} `) + `php tao/scripts/taoTranslate.php -a=updateAll -e=${extensionName}`;
                const execed = exec(command, options);
                execed.stdout.pipe(process.stdout);
                execed.stderr.pipe(process.stderr);
                execed.on('exit', code => code === 0 ? resolve() : reject( new Error('Something went wrong in the translation generation')));
            });
        },

        /**
        * Update version in extension manifest
        *
        * @param {String} manifestPath - the path to the extension manifest
        * @param {String} version - extension version
        * @return {Promise}
        */
        async updateVersion(manifestPath = '', version) {
            const manifestContent = await fs.readFile(manifestPath, 'utf8');

            if (!versionPropRegex.test(manifestContent)) {
                throw new Error('Cannot extract version from manifest file');
            }

            const updatedManifestContent = manifestContent.replace(
                versionPropRegex,
                (match, versionMatch) => match.replace(versionMatch, `'${version}'`)
            );

            await fs.writeFile(manifestPath, updatedManifestContent, 'utf8');
        }
    };
};
