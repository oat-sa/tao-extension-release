# tao-extension-release

This tool automates TAO extension release

## Installation

Please verify installation [prerequisite](#prerequisite). And run :

```sh
npm i -g @oat-sa/tao-extension-release
```

## Release

This tool offers specialized release process for different types of repositories.

### TAO extensions

If the repository contains a TAO Extension, please use the command `extensionRelease`.

```sh
taoRelease extensionRelease
```

You will be prompted to follow the instructions.

This command does:

- compute the next version from commits
- bundle assets
- create a tag and a release

### NPM packages

If the repository contains an npm package, please use the command `npmRelease`. This command _must_ be run in the root directory of an npm package repository.

```sh
cd path/to/my/package/repo
taoRelease npmRelease
```

You will be prompted to follow the instructions.

This command does:

- compute the next version from commits
- update the package.json and package-lock.json
- create a tag and a release
- publish the package to npm

At then end, you will be prompted to trigger the execution of `npm publish`. The Github release is already finished at this stage. If the publish step fails, you can try again manually, or ask someone with the necessary privileges to perform the publishing.

### Tag based repositories

For any other repository that doesn't need any special build but only tagging and merging, like PHP libraries, please use the command `repoRelease`. This command _must_ be run in the root directory of the repository.

```sh
cd path/to/my/repo
taoRelease repoRelease
```

You will be prompted to follow the instructions.

This command does:

- compute the next version from commits
- create a tag and a release

## Commandline arguments

Commandline arguments to give you more control over the parameters of the release:

### Common options

| option                        | description                        | default                                                  |
| ----------------------------- | ---------------------------------- | -------------------------------------------------------- |
| `--base-branch <branch>`      | branch to release from             | `develop`                                                |
| `--branch-prefix <prefix>`    | releasing branch prefix            | `release`                                                |
| `--origin <remote>`           | git repository remote name         | `origin`                                                 |
| `--release-branch <branch>`   | branch to release to               | `master`                                                 |
| `--release-version <version>` | version to be used for the release | version extracted from conventional commits              |
| `--release-comment <comment>` | comment to attach to the release   | (none - prompted)                                        |
| `--no-interactive`            | turns off the interactive mode     | interactive mode is on by default, except on non TTY shells |

### extensionRelease extra options

| option                               | description                                          | default           |
| ------------------------------------ | ---------------------------------------------------- | ----------------- |
| `--path-to-tao <path>`               | relative or absolute filesystem path                 | (none - prompted) |
| `--extension-to-release <extension>` | extension name (e.g. taoFoobar)                      | (none - prompted) |
| `--update-translations`              | flag to indicate translation files should be updated | `false`           |
| `--www-user <user>`                  | the system user used to launch PHP commands          | `www-data`        |


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

## Next version calculation

Next version taken based on [Conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).
Some treats of the next version calculation:

- if one or more commits contains a breaking change, the version will be increased by one major semver version
- if one or more commits contains a feature change, the version will be increased by one minor semver version
- if one or more commits contains a bugfix change, the version will be increased by one fix semver version
- if no commit contains a conventional change information, the version will be increased by one fix semver version and warn the user
- if `release-version` option provided, it will be taken as next release version and version calculation will be skipped

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

Everything looks OK but you don't know why the `grunt` task is not found. If you have updated `node` or `npm` recently, you can fix this by :

```sh
cd tao/views/build
npm reinstall node-sass --force
```

## Release notes

See the [history](HISTORY.md)

## License

Copyright (c) 2017-2021 Open Assessment Technologies SA;
[GNU General Public License v2.0](https://github.com/oat-sa/tao-extension-release/blob/master/LICENSE)
