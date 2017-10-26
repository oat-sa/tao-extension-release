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

const path               = require('path');
const inquirer           = require('inquirer');
const opn                = require('opn');
const log                = require('./src/log.js');
const config             = require('./src/config.js')();
const gitClientFactory   = require('./src/git.js');
const github             = require('./src/github.js');
const taoInstanceFactory = require('./src/taoInstance.js');

const data          = {};

//TODO CLI params
const origin        = 'origin';
const baseBranch    = 'develop';
const releaseBranch = 'master';
const branchPrefix  = 'release';
const wwwUser       = 'www-data';

var taoInstance;
var gitClient;
var githubClient;


log.title('TAO Extension Release');

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


// Select TAO instance
    .then( () => inquirer.prompt({
        type: 'input',
        name: 'taoRoot',
        message: 'Path to the TAO instance : ',
        default: data.taoRoot || process.cwd()
    }) )
    .then( result => {
        taoInstance = taoInstanceFactory(path.resolve(result.taoRoot), false, wwwUser);
        return taoInstance.isRoot();
    })
    .then( result => {
        if (!result.dir) {
            log.exit(`${result.dir} is not a TAO instance`);
        }
        data.taoRoot = result.dir;
    })
    .then( () => taoInstance.isInstalled() )
    .then( result => {
        if (!result) {
            log.exit('It looks like the given TAO instance is not installed.');
        }
    })

// Select the extension to release
    .then( () => taoInstance.getExtensions())
    .then( extensions => inquirer.prompt({
        type: 'list',
        name: 'extension',
        message: 'Which extension you want to release ? ',
        pageSize: 12,
        choices: extensions,
        default : data.extension && data.extension.name
    }) )
    .then( result => {
        if (!result.extension) {
            log.exit('No extension.');
        }
        data.extension = {
            name: result.extension,
            path: `${data.taoRoot}/${result.extension}`,
        };

        gitClient = gitClientFactory(data.extension.path, origin);

        return config.write(data);
    })


// Verify local changes and current branch
    .then( () => log.doing('Checking extension status'))
    .then( () => gitClient.hasLocalChanges() )
    .then( result => {
        if (result) {
            log.exit(`The extension ${data.extension.name} has local changes, please clean or stash them before releasing`);
        }
    })
    .then( () => inquirer.prompt({
        type: 'confirm',
        name: 'pull',
        message: `Can I checkout and pull ${baseBranch} and ${releaseBranch}  ?`
    }) )
    .then( result => {
        if (!result.pull) {
            log.exit();
        }

        log.done(`${data.extension.name} is clean`);
    })


// Sign tags (todo, not yet implemented)
    .then( () => gitClient.hasSignKey() )
    .then( result => data.signtags = result)


// Fetch and pull branches, extract manifests and repo name
    .then( () => log.doing(`Updating ${data.extension.name}`) )

    .then( () => gitClient.pull(releaseBranch) )
    .then( () => taoInstance.parseManifest(`/${data.extension.path}/manifest.php`) )
    .then( manifest => {
        data.lastVersion = manifest.version;
        data.lastTag     = `v${manifest.version}`;
    })

    .then( () => gitClient.pull(baseBranch) )
    .then( () => taoInstance.parseManifest(`/${data.extension.path}/manifest.php`) )
    .then( manifest => {
        data.extension.manifest = manifest;
        data.version            = manifest.version;
        data.tag                = `v${manifest.version}`;
        data.releasingBranch    = `${branchPrefix}-${manifest.version}`;
    })

    .then( () => taoInstance.getRepoName(data.extension.name) )
    .then( result => {
        if(result){
            githubClient = github(data.token, result);
        } else {
            log.exit('Unable to find the gitbuh repository name');
        }
    })


//Release exists ?
    .then( () => log.doing(`Check if tag ${data.tag} exists`))
    .then( () => gitClient.hasTag(data.tag))
    .then( result => {
        if (result) {
            log.exit(`The tag ${data.tag} already exists`);
        }
    })
    .then( () => log.done() )


// Needs a release (diff) ?
    .then( () => log.doing(`Diff ${baseBranch}..${releaseBranch}`) )
    .then( () => gitClient.hasDiff(baseBranch, releaseBranch) )
    .then( result => {
        if (!result) {
            return inquirer.prompt({
                type: 'confirm',
                name: 'diff',
                message: `It seems there is no changes between ${baseBranch} and ${releaseBranch}'. Do you want to rrelease anyway  ?`
            }).then(result => {
                if (!result.diff) {
                    log.exit();
                }
            });
        } else {
            log.done();
        }
    })


// Last confirmation
    .then( () => inquirer.prompt({
        type: 'confirm',
        name: 'go',
        message: `Let's release version ${data.extension.name}@${data.version} 🚀 ?`
    }) )
    .then( result => {
        if (!result.go) {
            log.exit();
        }
    })


// Create the release branch
    .then( () => log.doing('Create release branch') )
    .then( () => gitClient.localBranch(data.releasingBranch) )
    .then( () => log.done(`${branchPrefix}-${data.version} created`) )


// Compile assets
    .then( () => log.doing('Bundling') )
    .then( () => log.info('Asset build started, this may take a while') )
    .then( () => {
        return taoInstance.buildAssets(data.extension.name, false)
            .catch( err => log.error(`Unable to bundle assets. ${err.message}. Continue.`) );
    })
    .then( () => gitClient.commitAndPush(data.releasingBranch, 'bundle assets') )
    .then( changes => {
        if(changes && changes.length){
            log.info(`Commit : [bundle assets - ${changes.length} files]`);
            changes.forEach( file => log.info(`  - ${file}`) );
        }
    })
    .then( () => log.done() )


// Update translations
    .then( () => inquirer.prompt({
        type: 'confirm',
        name: 'translation',
        message: `${data.extension.name} needs updated translations ? `,
    }) )
    .then( result => {
        if(result.translation){
            return taoInstance.updateTranslations(data.extension.name)
                .catch( err => log.error(`Unable to update translations. ${err.message}. Continue.`))
                .then(() => gitClient.commitAndPush(data.releasingBranch, 'update translations'))
                .then( changes => {
                    if(changes && changes.length){
                        log.info(`Commit : [update translations - ${changes.length} files]`);
                        changes.forEach( file => log.info(`  - ${file}`) );
                    }
                });
        }
    })


// Create PR
    .then( () => log.doing('Create the pull request') )
    .then( () => githubClient.createReleasePR(data.releasingBranch, releaseBranch, data.version, data.lastVersion) )
    .then( result => {
        if(result && result.state === 'open'){
            data.pr = {
                url : result.html_url,
                apiUrl : result.url,
                number : result.number,
                id : result.id
            };
            log.info(`${data.pr.url} created`);
            log.done();
        } else {
            log.exit('Unable to create the release pull request');
        }
    })

// Merge PR
    .then( () => setTimeout(() => opn(data.pr.url), 2000) )
    .then( () => inquirer.prompt({
        type: 'confirm',
        name: 'pr',
        message: 'Please review the release PR (you can make the last changes now). Can I merge it now ?',
    }))
    .then( result => {
        if (!result.pr) {
            log.exit();
        }
    })
    .then( () => log.doing('Merging the pull request') )
    .then( () => gitClient.mergePr(releaseBranch, data.releasingBranch) )
    .then( () => log.done('PR merged') )


// Create and push the tag
    .then( () => log.doing(`Add and push tag ${data.tag}`) )
    .then( () => gitClient.tag(releaseBranch, data.tag, `version ${data.version}`) )
    .then( () => log.done() )


// GH release
    .then( () => log.doing(`Creating github release ${data.version}`) )
    .then( () => inquirer.prompt({
        type: 'input',
        name: 'comment',
        message: 'Any comment on the release ?',
    }) )
    .then( result => githubClient.release(data.tag, result.comment) )
    .then( () => log.done() )


// Merge Back
    .then( () => log.doing('Merging back master into develop') )
    .then( () => gitClient.mergeBack(baseBranch, releaseBranch) )
    .then( () => log.done())


// Clean up
    .then( () => log.doing('Clean up the place') )
    .then( () => gitClient.deleteBranch(data.releasingBranch) )
    .then( () => log.done())

// End
    .then( () => log.done('Good job!') )


// Errors
    .catch(err => log.error(err) );
