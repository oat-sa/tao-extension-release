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

## [Version 1.1.0]

 - Introduce npm commander for CLI params
 - Add `prepareRelease` & `createRelease` commands
 - Keep old process as `oldWayRelease`
 - Add `npmRelease` command
 - npm install the extension/views before release
 - Make release note extraction more robust

## [Version 1.1.1]

 - Bugfix for when data.extension is not already set

 ## [Version 1.2.0]

 - Calculate the version from conventional commits. More details https://www.conventionalcommits.org/en/v1.0.0/
 - Introduce new CLI parameter `release-version` which provide version to be taken as new release version
 - Update unit tests
