#!/usr/bin/env node

const os       = require('os');
const path     = require('path');
const inquirer = require('inquirer');
const git      = require('simple-git/promise');
const tao      = require('./src/tao.js');
const log      = require('./src/log.js');

const cwd           = process.cwd();
const data          = {};
const origin        = 'origin';
const baseBranch    = 'develop';
const releaseBranch = 'master';
const branchPrefix  = 'release';



log.title('TAO Extension Release');

// TAO ROOT
tao.isTaoRoot(cwd)
    .then(isRoot => {
        return inquirer.prompt({
            type: 'input',
            name: 'taoRoot',
            message: 'Path to the TAO insance : ',
            default: isRoot ? cwd : ''
        });
    })
    .then(result => tao.isTaoRoot(path.resolve(result.taoRoot)))
    .then(result => {
        const root = result.dir;
        if (!result.root) {
            log.exit(`${root} is not a TAO instance`);
        }
        data.taoRoot =  root;
        return tao.getExtensions(root);
    })

// Select the extension to release
    .then(extensions => {
        return inquirer.prompt({
            type: 'list',
            name: 'extension',
            message: 'Which extension you want to release ? ',
            pageSize : 10,
            choices: extensions
        });
    })
    .then(result => {
        if (!result.extension) {
            log.exit('No extension.');
        }
        data.extension =  {
            name: result.extension,
            path: `${data.taoRoot}/${result.extension}`,
        };

        log.doing('Checking extension status');
    })

// Verify local changes and curren branch
    .then( () => git(data.extension.path).status())
    .then(status => {
        const empty = ['modified', 'renamed', 'conflicted', 'created', 'deleted'];

        if (empty.some(value => status[value].length > 0)) {
            log.exit(`The extension ${data.extension.name} have local changes, please clean or stash them before releasing`);
        }

        return inquirer.prompt({
            type: 'confirm',
            name: 'pull',
            message: `Can I checkout and pull ${baseBranch} and ${releaseBranch}  ?`
        }).then(result => {
            if (!result.pull) {
                log.exit();
            }

            log.doing(`Updating ${data.extension.name}`);
        });
    })

// Sign tags ?
    .then( () => git(data.extension.path).raw(['config', '--list']))
    .then( results => {
        const configs = results.split(os.EOL).map( row => row.split('=')[0] );
        data.signtags = configs.indexOf('user.signingkey') > 0;
    })

// Fecth and pull branchs, extract manifests

    .then( () => git(data.extension.path).fetch(origin) )

    .then( () => git(data.extension.path).checkout(releaseBranch) )
    .then( () => git(data.extension.path).pull(origin, releaseBranch) )
    .then( () => tao.parseManifest(`/${data.extension.path}/manifest.php`) )
    .then(manifest => {
        data.lastVersion = manifest.version;
        data.lastTag = `v${manifest.version}`;
    })

    .then( () => git(data.extension.path).checkout(baseBranch) )
    .then( () => git(data.extension.path).pull(origin, baseBranch) )
    .then( () => tao.parseManifest(`/${data.extension.path}/manifest.php`) )
    .then(manifest => {
        data.extension.manifest = manifest;
        data.version = manifest.version;
        data.tag = `v${manifest.version}`;

        log.doing('Verify tags');
    })

//5. Release exists ?
    .then( () => git(data.extension.path).tags() )
    .then( tags => {
        if(tags.all.indexOf(data.tag) > -1) {
            log.exit(`The tag ${data.tag} already exists`);
        }

        log.doing(`Diff ${baseBranch}..${releaseBranch}`);
    })

//5. Needs a release (diff) ?
    .then( () => git(data.extension.path).raw(['diff', '--shortstat', `${baseBranch}..${releaseBranch}`]) )
    .then( result => {
        if(!result){
            return inquirer.prompt({
                type: 'confirm',
                name: 'diff',
                message: `It seems there is no changes between ${baseBranch} and ${releaseBranch}'. Do you want to rrelease anyway  ?`
            }).then(result => {
                if (!result.diff) {
                    log.exit();
                }
            });
        }
    })

//last confirmation
    .then( () => {
        return inquirer.prompt({
            type: 'confirm',
            name: 'go',
            message: `Let's release version ${data.extension.name}@${data.version} 🚀 ?`
        }).then( result => {
            if(!result.go){
                log.exit();
            }

            log.doing(`Create release branch`);
        });
    })

//create the release branch
    .then( () => {
        data.releasingBranch = `${branchPrefix}-${data.version}`;
        return git(data.extension.path).checkoutLocalBranch(data.releasingBranch);
    })

//compile assets
    .then( () => {

        log.doing(`Bundle extension assets`);
        return tao.buildAssets(data.extension.name, data.taoRoot);
    })

//push branch
    .then( () => {

        log.exit('assets built');

        return git(data.extension.path).push(origin, data.releasingBranch);

    })

//create PR
    .then( () => {

    })

//merge PR
    .then( () => {

    })

// Create and push the tag
    .then( () => git(data.extension.path).checkoutLocalBranch(releaseBranch) )
    .then( () => git(data.extension.path).pull(origin, releaseBranch) )
    .then( () => git(data.extension.path).tag([data.version, `-m "version ${data.version}`]) )
    .then( () => git(data.extension.path).pushTags(origin) )

// Update
    .then( () => git(data.extension.path).checkoutLocalBranch(baseBranch) )
    .then( () => git(data.extension.path).pull(origin, baseBranch) )
    .then( () => git(data.extension.path).merge([releaseBranch]) )
    .then( () => git(data.extension.path).push(origin, baseBranch) )

// End

    .then( () => console.log('Done') )

// Errors

    .catch(err => log.error(err));

