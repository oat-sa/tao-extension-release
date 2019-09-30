# tao-extension-release

This tool automates TAO extension release

## Installation

Please verify installation [prerequisite](#prerequisite). And run :

```sh
npm i -g @oat-sa/tao-extension-release
```

## Release an extension

Extension release now happens in 2 stages: the preparation and the release.

### prepareRelease

The first stage prepares the releasing branch, compiles assets and translations, and pushes the branch to the remote repo, ready to be tested, deployed or released.

```sh
taoRelease prepareRelease
```

### createRelease

The second stage retrieves a prepared releasing branch from the remote repo, brings it up to date, and executes the release.

```sh
taoRelease createRelease
```

You will be prompted to follow the instructions.

### oldWayRelease (deprecated)

The `taoRelease oldWayRelease` command launches the sequence used by the old version (<= 0.4.1) of this tool. Functionally it is equivalent to running `prepareRelease` followed immediately by `createRelease`, but there is no opportunity to do any deployment or testing at the mid-point of the process.

## Commandline arguments

Commandline arguments to give you more control over the parameters of the release:

| option | description | default | prepareRelease | createRelease | oldWayRelease |
|---|---|---|---|---|---|
|`--base-branch`|branch to release from|`develop`|✅|✅|✅|
|`--branch-prefix`|releasing branch prefix|`release`|✅|✅|✅|
|`--origin`|git repository remote name|`origin`|✅|✅|✅|
|`--release-branch`|branch to release to|`master`|✅|✅|✅|
|`--www-user`|www user|`www-data`|✅|✅|✅|
|`--path-to-tao`|relative or absolute filesystem path|(prompted)|✅|✅|❌|
|`--extension-to-release`|extension name|(prompted)|✅|✅|❌|
|`--version-to-release`|which branch to look for|(prompted)|❌|✅|❌|
|`--update-translations`|should translation files be updated?|(prompted)|✅|✅|❌|
|`--release-comment`|comment to attach to the release|(prompted)|❌|✅|❌|

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

Copyright (c) 2017-2019 Open Assessment Technologies SA;
[GNU General Public License v2.0](https://github.com/oat-sa/tao-extension-release/blob/master/LICENSE)
