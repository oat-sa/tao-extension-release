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
 * Copyright (c) 2017 Open Assessment Technologies SA;
 */

/*eslint no-console: "off"*/

/**
 * Quick logging setup
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
const chalk = require('chalk');

module.exports = {
    title(msg){
        console.log(' ');
        console.log('✨ ' + chalk.bold.underline(msg) + ' ✨');
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
    warn(msg){
        msg = msg || 'ok';
        console.log(chalk.yellow(`⚠ ${msg}`));
        return this;
    },
    info(msg){
        console.log(chalk.blue(msg));
        return this;
    },
    error(err){
        if(err.message){
            console.log(chalk.red(`❎ ${err.message}`));
        }
        console.error(err);
        return this;
    },
    exit(msg){
        console.log(msg || 'Good bye');
        process.exit();
    }
};
