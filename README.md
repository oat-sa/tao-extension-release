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

## Release an npm package

There is also a command to perform the Github release, and npm publishing, of frontend packages. Unlike the above commands, this one *must* be run in the root directory of an npm package repo.

```sh
cd path/to/my/package/repo
taoRelease npmRelease
```

The sequence of steps to be followed is very similar. At then end, you will be prompted to trigger the execution of `npm publish`. The Github release is already finished at this stage. If the publish step fails, you can try again manually, or ask someone with the necessary privileges to perform the publishing.

## Commandline arguments

Commandline arguments to give you more control over the parameters of the release:

### Common options

| option | description | default |
|---|---|---|
|`--base-branch <branch>`|branch to release from|`develop`|
|`--branch-prefix <prefix>`|releasing branch prefix|`release`|
|`--origin <remote>`|git repository remote name|`origin`|
|`--release-branch <branch>`|branch to release to|`master`|

### prepareRelease extra options

| option | description | default |
|---|---|---|
|`--path-to-tao <path>`|relative or absolute filesystem path|(none - prompted)|
|`--extension-to-release <extension>`|extension name (e.g. taoFoobar)|(none - prompted)|
|`--update-translations`|flag to indicate translation files should be updated|(none - prompted)|
|`--www-user <user>`|the system user used to launch PHP commands|`www-data`|

### createRelease extra options

| option | description | default |
|---|---|---|
|`--path-to-tao <path>`|relative or absolute filesystem path|(none - prompted)|
|`--extension-to-release <extension>`|extension name (e.g. taoFoobar)|(none - prompted)|
|`--version-to-release <version>`|version of remote branch to retrieve (e.g. 1.2.3)|(none - prompted)|
|`--update-translations`|flag to indicate translation files should be updated|(none - prompted)|
|`--www-user <user>`|the system user used to launch PHP commands|`www-data`|
|`--release-comment <comment>`|comment to attach to the release|(none - prompted)|

For absolute control, specify both `--branch-prefix` and `--version-to-release`. That way, the program is guaranteed to retrieve the remote branch named e.g. `release-1.2.3`, which could be helpful if there are multiple remote branches with similar names.

### npmRelease extra options

| option | description | default |
|---|---|---|
|`--release-comment <comment>`|comment to attach to the release|(none - prompted)|

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
