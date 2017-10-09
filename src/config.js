const fs = require('fs');

module.exports = function config(){
    const configFile = process.env.HOME + '/.tao-extension-release';

    return {

        /**
         * Load the config
         * @returns {Promise} always resolves with the config object
         */
        load(){
            return new Promise( resolve => {
                fs.readFile(configFile, 'utf-8', (err, data) => {
                    if(!err){
                        try {
                            return resolve(JSON.parse(data));
                        } catch(jsonErr){
                            //ignore
                        }
                    }
                    return resolve({});
                });
            });
        },

        /**
         * Writes the config
         * @param {Object} data - the config data
         * @returns {Promise} resolves once written
         */
        write(data = {}){
            return new Promise( (resolve, reject) => {
                fs.writeFile(configFile, JSON.stringify(data, null, 2), err => {
                    if(err){
                        return reject(err);
                    }
                    return resolve(true);
                });
            });
        }
    };
};
