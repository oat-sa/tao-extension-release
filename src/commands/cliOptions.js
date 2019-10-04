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
 * Copyright (c) 2019 Open Assessment Technologies SA;
 */

/**
 * CLI options, reusable by the various commands within the project
 * The option values must each be an array with the format ['--option-name <value>', 'description', 'default']
 * @see https://www.npmjs.com/package/commander#options
 */
module.exports = {
    debug: ['-d, --debug', 'output extra debugging'],
    // options with defaults
    baseBranch: ['--base-branch <branch>', 'the source branch for the release', 'develop'],
    branchPrefix: ['--branch-prefix <prefix>', 'the prefix of the branch created for releasing', 'release'],
    origin: ['--origin <remotename>', 'the name of the remote repo', 'origin'],
    releaseBranch: ['--release-branch <branch>', 'the target branch for the release PR', 'master'],
    wwwUser: ['--www-user <user>', 'the user who runs php commands', 'www-data'],
    // options which fall back to user prompts if undefined
    pathToTao: ['--path-to-tao <path>', 'path to local TAO instance'],
    extensionToRelease: ['--extension-to-release <extension>', 'camelCase name of the extension to release'],
    versionToRelease: ['--version-to-release <version>', 'version of the extension to release'],
    updateTranslations: ['--update-translations', 'indicates if we need to update translations'],
    releaseComment: ['--release-comment <comment>', 'comment to add to github release']
};