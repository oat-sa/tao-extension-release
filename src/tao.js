const fs        = require('fs');
const path      = require('path');
const phpParser = require('php-parser');
const { spawn } = require('child_process');

module.exports = {

    /**
     * Check if the given directory is the root of a TAO instance
     * @param {String} dir - the path of the directory to check
     * @return {Promise} resolves with a result object
     */
    isTaoRoot(dir = '') {
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
     * Check if the given directory is the root of a TAO instance
     * @param {String} dir - the path of the directory to check
     * @return {Promise} resolves with a results object
     */
    isTaoExtension(dir = '') {
        return new Promise( (resolve, reject) => {
            fs.lstat(dir, (err, stats) => {
                const result = {
                    dir,
                    extension : false
                };
                if (err) {
                    return reject(err);
                }
                if (stats.isDirectory()) {
                    fs.readdir(dir, (err, files) => {
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

    getExtensions(dir = ''){
        return new Promise( (resolve, reject) => {
            fs.readdir(dir, (err, files) => {
                if (err) {
                    return reject(err);
                }

                Promise
                    .all(files.map( file => this.isTaoExtension(path.normalize(`${dir}/${file}`))))
                    .then(results => {
                        resolve(
                            results
                                .filter( entry => entry.extension)
                                .map( entry => path.basename(entry.dir) )
                        );
                    })
                    .catch( err => reject(err) );
            });
        });
    },

    /**
     * Parse tao manifest and extract most of it's info
     * @param {String} manifestPath - the path to the extension manifest
     * @return {Promise} resolves with an object that retprsents the manifest
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

    buildAssets(extensionName = '', taoRootPath = ''){
        const options = {
            cwd : path.normalize(`${taoRootPath}/tao/views/build`)
        };
        const runGruntTask = task => {
            return new Promise( (resolve, reject) => {
                const spawned = spawn('./node_modules/.bin/grunt', [`${extensionName.toLowerCase()}${task}`], options);
                //spawned.stdout.on('data', data => console.log(data) );
                spawned.stderr.on('data', reject );
                spawned.on('close', resolve);
            });
        };
        const installNpm = () => {
            return new Promise( (resolve, reject) => {
                fs.access(`${taoRootPath}/tao/views/build/node_modules/.bin/grunt`, err => {
                    if(!err){
                        //file exists
                        resolve();
                    }
                    const spawned = spawn('npm', ['install'], options);
                    //spawned.stdout.on('data', data => console.log(data) );
                    spawned.stderr.on('data', reject );
                    spawned.on('close', resolve);
                });
            });
        };
        return installNpm()
            .then( () => runGruntTask('sass') )
            .then( () => runGruntTask('bundle') );
    }
};
