const chalk = require('chalk');

module.exports = {
    title(msg){
        console.log(' ');
        console.log('✨ ' + chalk.bold.underline(msg) + '✨');
        console.log(' ');
        return this;
    },
    doing(msg){
        console.log(chalk.gray(`➡ ${msg}`));
        return this;
    },
    done(msg){
        msg = msg || 'ok';
        console.log(chalk.green(` ✅ ${msg}`));
        return this;
    },

    info(msg){
        console.log(chalk.blue(msg));
        return this;
    },
    error(err){
        if(err.message){
            console.log(`⚠ ${err.message}`);
        } else {
            console.error(err);
        }
        return this;
    },
    exit(msg){
        console.log(msg || 'Good bye');
        process.exit();
    }

};
