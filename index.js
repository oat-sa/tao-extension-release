#!/usr/bin/env node

const os       = require('os');
const path     = require('path');
const inquirer = require('inquirer');
const git      = require('simple-git/promise');
const opn      = require('opn');
const tao      = require('./src/tao.js');
const log      = require('./src/log.js');
const config   = require('./src/config.js')();
const github   = require('./src/github.js');


const data = {};
const origin = 'origin';
const baseBranch = 'develop';
const releaseBranch = 'master';
const branchPrefix = 'release';


log.title('TAO Extension Release');

// Lload config
config.load()
    .then(result => {
        Object.assign(data, result);
        if (!data.taoRoot) {
            data.taoRoot = process.cwd();
        }
    })

// Github Token

    .then(() => {
        if (!data.token) {

            setTimeout(() => opn('https://github.com/settings/tokens'), 3000);

            return inquirer.prompt({
                type: 'input',
                name: 'token',
                message: 'I need a Github token, with "repo" rights (check your browser)  : '
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

// TAO ROOT
    .then( () => inquirer.prompt({
        type: 'input',
        name: 'taoRoot',
        message: 'Path to the TAO instance : ',
        default: data.taoRoot
    }))
    .then(result => tao.isTaoRoot(path.resolve(result.taoRoot)))
    .then(result => {
        const root = result.dir;
        if (!result.root) {
            log.exit(`${root} is not a TAO instance`);
        }
        data.taoRoot = root;
        return tao.getExtensions(root);
    })

// Select the extension to release

    .then(extensions => {
        return inquirer.prompt({
            type: 'list',
            name: 'extension',
            message: 'Which extension you want to release ? ',
            pageSize: 10,
            choices: extensions
        });
    })
    .then(result => {
        if (!result.extension) {
            log.exit('No extension.');
        }
        data.extension = {
            name: result.extension,
            path: `${data.taoRoot}/${result.extension}`,
        };

        return config.write(data);
    })

// Verify local changes and current branch

    .then(() => log.doing('Checking extension status'))
    .then(() => git(data.extension.path).status())
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

            log.done(`${status.current} is clean`);
        });
    })

// Sign tags ?
    .then(() => git(data.extension.path).raw(['config', '--list']))
    .then(results => {
        const configs = results.split(os.EOL).map(row => row.split('=')[0]);
        data.signtags = configs.indexOf('user.signingkey') > 0;
    })

// Fecth and pull branchs, extract manifests and repo name

    .then(() => log.doing(`Updating ${data.extension.name}`))

    .then(() => git(data.extension.path).fetch(origin))

    .then(() => git(data.extension.path).checkout(releaseBranch))
    .then(() => git(data.extension.path).pull(origin, releaseBranch))
    .then(() => tao.parseManifest(`/${data.extension.path}/manifest.php`))
    .then(manifest => {
        data.lastVersion = manifest.version;
        data.lastTag = `v${manifest.version}`;
    })

    .then(() => git(data.extension.path).checkout(baseBranch))
    .then(() => git(data.extension.path).pull(origin, baseBranch))
    .then(() => tao.parseManifest(`/${data.extension.path}/manifest.php`))
    .then(manifest => {
        data.extension.manifest = manifest;
        data.version = manifest.version;
        data.tag = `v${manifest.version}`;
    })

    .then( () => tao.getRepoName(data.extension.name, data.taoRoot))
    .then( result => {
        data.repo = result;
    })

//Release exists ?

    .then(() => log.doing('Check existing tags'))
    .then(() => git(data.extension.path).tags())
    .then(tags => {
        if (tags.all.indexOf(data.tag) > -1) {
            log.exit(`The tag ${data.tag} already exists`);
        }
    })
    .then(() => log.done())

// Needs a release (diff) ?

    .then(() => log.doing(`Diff ${baseBranch}..${releaseBranch}`))
    .then(() => git(data.extension.path).raw(['diff', '--shortstat', `${baseBranch}..${releaseBranch}`]))
    .then(result => {
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

    //last confirmation
    .then(() => {
        return inquirer.prompt({
            type: 'confirm',
            name: 'go',
            message: `Let's release version ${data.extension.name}@${data.version} 🚀 ?`
        }).then(result => {
            if (!result.go) {
                log.exit();
            }
        });
    })

// Create the release branch

    .then(() => log.doing('Create release branch'))
    .then(() => {
        data.releasingBranch = `${branchPrefix}-${data.version}`;
        return git(data.extension.path).checkoutLocalBranch(data.releasingBranch);
    })
    .then(() => log.done(`${branchPrefix}-${data.version} created`))

// Compile assets

    .then(() => log.doing('Bundling extension assets'))
    .then(() => tao.buildAssets(data.extension.name, data.taoRoot))
    .then(() => git(data.extension.path).diffSummary())
    .then(results => {
        if (results && results.files) {
            const changes = results.files.map(file => file.file);
            return git(data.extension.path)
                .commit('bundle assets', changes)
                .then(() => log.info(`Commit : [bundle assets - ${changes.length} files]`));
        }
    })
    .then(() => git(data.extension.path).push(origin, data.releasingBranch))
    .then(() => log.done())


// Create PR
    .then(() => log.doing('Create the pull request'))
    .then(() => {
        data.githubClient = github(data.token, data.repo);
        return data.githubClient.createReleasePR(data.releasingBranch, releaseBranch, data.version);
    })
    .then( result => {
        if(result && result.state === 'open'){
            data.pr = {
                url : result.url,
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
    .then(() => {
        return inquirer.prompt({
            type: 'confirm',
            name: 'pr',
            message: 'Please review the pull request in your browser. Can I merge it ?',
        }).then(result => {
            if (!result.pr) {
                log.exit();
            }
        });
    })
    .then( () => log.doing('Merging the pull request'))
    .then(() => git(data.extension.path).checkout(releaseBranch))
    .then(() => git(data.extension.path).merge([data.releasingBranch, '--no-ff']))
    .then(() => git(data.extension.path).push(origin, releaseBranch))
    .then(() => data.githubClient.closePR(data.pr.id) )
    .then(() => log.done('PR merged and closed'))


// Create and push the tag
    .then(() => log.doing(`Add and push tag ${data.tag}`))
    .then(() => git(data.extension.path).checkout(releaseBranch))
    .then(() => git(data.extension.path).pull(origin, releaseBranch))
    .then(() => git(data.extension.path).tag([data.tag, `-m "version ${data.version}`]))
    .then(() => git(data.extension.path).pushTags(origin))
    .then(() => log.done())

// GH release

    .then(() => log.doing(`Creating github release ${data.version}`))
    .then(() => inquirer.prompt({
        type: 'input',
        name: 'comment',
        message: 'Any comment on the release ?',
    }))
    .then( result => data.githubClient.release(data.tag, result.comment) )
    .then(() => log.done())


// Update
    .then( () => log.doing('Merging back master into develop'))
    .then( () => git(data.extension.path).checkout(baseBranch) )
    .then( () => git(data.extension.path).pull(origin, baseBranch) )
    .then( () => git(data.extension.path).merge([releaseBranch]) )
    .then( () => git(data.extension.path).push(origin, baseBranch) )
    .then( () => log.done())

    // End

    // Errors

    .catch(err => log.error(err) );
