# TAO Extension Release Tool history

## [Version 0.1.0](https://github.com/oat-sa/tao-extension-release/releases/tag/0.1.0)

 - interactive mode only
 - basic release process
 - Linux and OSX support only
 - keeps configuration in `$HOME`

## [Version 0.2.0](https://github.com/oat-sa/tao-extension-release/releases/tag/0.2.0)

 - Windows support
 - update notification

## [Version 0.2.1](https://github.com/oat-sa/tao-extension-release/releases/tag/0.2.1)

 - fix Windows home path
 - library update

## [Version 0.3.0](https://github.com/oat-sa/tao-extension-release/releases/tag/0.3.1)

 - Add unit and integration tests
 - Add ESLint
 - Translations are false by default
 - `wwwUser` can be defined in the config file

## [Version 0.4.0](https://github.com/oat-sa/tao-extension-release/releases/tag/0.4.0)

 - Refactor release functionality into separate module
 - Partially migrate application to use github v4 api
 - Extract release notes from github pull requests
 - Introduce `base-branch`, `branch-prefix`, `origin`, `release-branch`, `www-user` command line arguments
 - Cover changes with unit tests

## [Version 0.4.1](https://github.com/oat-sa/tao-extension-release/releases/tag/0.4.1)

 - Enforce npm install

## [Version 1.1.0](https://github.com/oat-sa/tao-extension-release/releases/tag/1.1.0)

 - Introduce npm commander for CLI params
 - Add `prepareRelease` & `createRelease` commands
 - Keep old process as `oldWayRelease`
 - Add `npmRelease` command
 - npm install the extension/views before release
 - Make release note extraction more robust

## [Version 1.1.1](https://github.com/oat-sa/tao-extension-release/releases/tag/1.1.1)

 - Bugfix for when data.extension is not already set

 ## [Version 1.2.0](https://github.com/oat-sa/tao-extension-release/releases/tag/1.2.0)

 - Calculate the version from conventional commits. More details https://www.conventionalcommits.org/en/v1.0.0/
 - Introduce new CLI parameter `release-version` which provide version to be taken as new release version
 - Update unit tests

## [Version 2.0.0](https://github.com/oat-sa/tao-extension-release/releases/tag/2.0.0)

 - BREAKING CHANGE: change commands to `extensionRelease`, `npmRelease` and `repoRelease` and remove the commands `oldWayRelease`, `createRelease` and `prepareRelease`
 - BREAKING CHANGE: next version is computed from conventional commits
 - BREAKING CHANGE: `extensionRelease` doesn't update version in the manifest anymore


## [Version 2.1.0](https://github.com/oat-sa/tao-extension-release/releases/tag/2.1.0)

 - Support non interactive mode. (see `--no-interactive` option).
 - Writing to the config is configurable. (see `--no-write` option).
 - can read the `GITHUB_TOKEN` from env.

## [Version 2.1.1](https://github.com/oat-sa/tao-extension-release/releases/tag/2.1.1)

 - Fix: GitHub token regex #64

## [Version 2.2.0](https://github.com/oat-sa/tao-extension-release/releases/tag/2.2.0)

 - feat: include the git remote prune origin step into the command #75 ( by taorafael - validated by oatymart )

## [Version 2.3.0](https://github.com/oat-sa/tao-extension-release/releases/tag/2.3.0)

 - FUN-909 : feat: - add early credential check #80 ( by taorafael - validated by taorafael )
 - Fix COE-327 : : update the git-url-parse lib with all needed dependencies includ… #88
 - Fix TR-3312 : : clean vulnerabilities #90

## [Version 2.3.1](https://github.com/oat-sa/tao-extension-release/releases/tag/2.3.1)

 - Feature ADF-1419 : Upgrade the CI action to Node 18 #92

## [Version 2.3.2](https://github.com/oat-sa/tao-extension-release/releases/tag/2.3.2)

 - chore: attach labels to release, update CI #102

## [Version 2.4.0](https://github.com/oat-sa/tao-extension-release/releases/tag/2.4.0)

 - Feature : feat: add auto release action and an emergency label will be attached… #112

## [Version 2.4.1](https://github.com/oat-sa/tao-extension-release/releases/tag/2.4.1)

 - Feature : : disables manual trigger of workflow #114
 - Feature : : updated action NPM secret name #115
 - Feature : : updated on action #116

## [Version 2.4.2](https://github.com/oat-sa/tao-extension-release/releases/tag/2.4.2)

 - Feature : : added a secret to automate NPM release #118

## [Version 2.5.0](https://github.com/oat-sa/tao-extension-release/releases/tag/2.5.0)

 - FUN-910 : Feat - - add branch switch from master to main by default #82
