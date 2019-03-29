# tao-extension-release

This tool automate TAO extension release

## Installation

Please verify installation [prerequisite](#prerequisite).

You also need an installed instance of tao:
```sh
git clone git@github.com:oat-sa/package-tao.git
cd package-tao/
git checkout develop
composer install
php tao/scripts/taoInstall.php --db_driver pdo_mysql --db_host localhost --db_name <dbname> --db_user <username> --db_pass <password> --module_namespace http://tao.local/mytao.rdf --module_url <root directory> --user_login admin --user_pass admin -e taoCe
```

Then run :

```sh
npm i -g @oat-sa/tao-extension-release
```

## Release an extension

Run :

```sh
taoRelease
```

and follow the instructions

## Commandline arguments

Commandline arguments:

 - `--base-branch` - branch to release from. 'develop' by default
 - `--branch-prefix` - releasing branch prefix. 'release' by default
 - `--origin` - git repository origin. 'origin' by default
 - `--release-branch` - branch to release to. 'master' by default
 - `--www-user` - www user. 'www-data' by default

## Development

Remove the package if already installed globally :

```sh
npm uninstall -g @oat-sa/tao-extension-release
```

Then clone the sources :

```sh
git clone git@github.com:oat-sa/tao-extension-release.git
cd tao-extension-release
npm install
npm link
```

So the command `taoRelease` will use the sources.

Useful commands :

 - `npm test` runs the test suite
 - `npm run test:cov` runs the test suite with code coverage
 - `npm run test:dev` runs the test suite in watch mode
 - `npm run lint` verifies the sources complies with the code style guide


## Configuration

A file named `.tao-extension-release` is created in the user directory.
The following values can be defined in this file :

 - `token` : your Github auth token
 - `taoRoot` : the path to the root of TAO
 - `wwwUser` : the system user used to launch PHP commands (`www-data`)


## System Prerequisite
<a name="prerequisite"></a>

#### node.js

You need a recent version of [node.js](https://nodejs.org) for your platform :

 - [Windows installer](https://nodejs.org/dist/v8.7.0/node-v8.7.0-x86.msi)
 - [OSX installer](https://nodejs.org/dist/v8.7.0/node-v8.7.0.pkg)
 - Linux package
```sh
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
```
 - or using [nvm](https://github.com/creationix/nvm#installation) for multiple versions.

#### git

You need to have the `git` > `1.7.0` command available in your `PATH`.

#### PHP

You also need the `php` command available in your `PATH`.

#### sudo (linux and OSX)

You also need the `sudo` command available in your `PATH`.


## Known Issues

### `Task foosass not found`

Everything looks ok but you don't know why the `grunt` task is not found. If you have updated `node` or `npm` recently, you can fix this by :

```sh
cd tao/views/build
npm reinstall node-sass --force
```

## Release notes

See the [history](HISTORY.md)

## License

Copyright (c) 2017 Open Assessment Technologies SA;
[GNU General Public License v2.0](https://github.com/oat-sa/tao-extension-release/blob/master/LICENSE)
