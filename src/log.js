const chalk = require('chalk');

module.exports = {
    title(msg){
        console.log(' ');
        console.log(chalk.bold.underline(msg));
        console.log(' ');
    },
    doing(msg){
        console.log(chalk.green(` > ${msg}`));
    },
    info(msg){
        console.log(chalk.blue(msg));
    },
    error(err){
        if(err.message){
            console.log(`⚠ ${err.message}`);
        } else {
            console.error(err);
        }
    },
    exit(msg){
        console.log(msg || 'Good bye');
        process.exit();
    }

};
