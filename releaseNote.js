#!/usr/bin/env node

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

/**
 * CLI script entry point
 *
 * Long but linear process.
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */

const inquirer           = require('inquirer');
const opn                = require('opn');
const updateNotifier     = require('update-notifier');
const pkg                = require('./package.json');
const log                = require('./src/log.js');
const config             = require('./src/config.js')();
const github             = require('./src/github.js');

const data          = {};

//TODO CLI params
const origin        = 'origin';
const baseBranch    = 'develop';
const releaseBranch = 'master';
const branchPrefix  = 'release';
const repository    = 'oat-sa/tao-core';
const prNumber      = '1742';

var githubClient;


log.title('TAO Extension Release');

// check for updates

updateNotifier({pkg}).notify();


// Load local config

config.load()
    .then( result => Object.assign(data, result) )


// Github Token
    .then( () => {
        if (!data.token) {

            setTimeout(() => opn('https://github.com/settings/tokens'), 2000);

            return inquirer.prompt({
                type: 'input',
                name: 'token',
                message: 'I need a Github token, with "repo" rights (check your browser)  : ',
                validate : token => /[a-z0-9]{32,48}/i.test(token),
                filter : token => token.trim()
            }).then(result => {
                if (result.token) {
                    data.token = result.token;
                    return config.write(data);
                } else {
                    log.exit('No token, no script. Sorry.');
                }
            });
        }
    })
    .then( () => {

        githubClient = github(data.token, repository);

    })

// Extract release notes
    .then( () => log.doing('Extract release notes') )
    .then( () => githubClient.extractReleaseNotesFromReleasePR(prNumber) )
    .then( result => {
        if(result){
            data.pr.notes = result;

            console.log(data.pr.notes );
            log.done();
        } else {
            log.exit('Unable to create the release notes');
        }
    })


// End
    .then( () => log.done('Good job!') )


// Errors
    .catch(err => log.error(err) );
