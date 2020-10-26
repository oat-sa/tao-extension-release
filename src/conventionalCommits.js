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
 * Copyright (c) 2020 Open Assessment Technologies SA;
 */

/**
 * Helper module to work with conventional commits tool
 */
const conventionalChangelogCore = require('conventional-changelog-core');
const conventionalCommitsConfig = require('conventional-changelog-conventionalcommits');
const conventionalRecommendedBump = require('conventional-recommended-bump');
const semverParse = require('semver/functions/parse');
const semverInc = require('semver/functions/inc');

/**
 * Get the npmPackage
 *
 * @param {String} rootDir - the path of the TAO instance root
 * @param {Boolean} [quiet = true] - if we redirect stdout and stderr to the console
 * @return {NpmPackage}
 */
module.exports = function npmPackageFactory() {
    return {
        /**
         * Build change log
         *
         * @param {Object} context
         * @returns {Promise}
         */
        buildChangelog(context) {
            return new Promise((resolve, reject) => {
                const chunks = [];

                conventionalChangelogCore(
                    {
                        config: conventionalCommitsConfig(),
                    },
                    context
                )
                    .on('error', err => reject(err))
                    .on('data', chunk => chunks.push(chunk))
                    .on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            });
        },
        /**
         * Get next recomended version
         *
         * @param {String} lastTag
         * @returns {Promise}
         */
        async getNextVersion(lastTag) {
            const lastVersionObject = semverParse(lastTag);
            if (!lastVersionObject) {
                throw new Error('Unable to retrieve last version from tags');
            }

            const whatBump = (await conventionalCommitsConfig()).recommendedBumpOpts.whatBump;

            return new Promise((resolve, reject) => {
                conventionalRecommendedBump(
                    {
                        preset: {
                            name: 'conventionalcommits'
                        },
                        whatBump: (...args) => {
                            const [commits] = args;

                            return {
                                ...whatBump(...args),
                                hasNonConventionalCommits: commits.some(({ type }) => !type)
                            };
                        }
                    },
                    {},
                    (err, recommendation) => {
                        if (err) {
                            return reject(err);
                        }

                        const lastVersion = lastVersionObject.version;

                        //carefull inc mutate lastVersionObject
                        const version = semverInc(lastVersionObject, recommendation.releaseType);
                        resolve({ lastVersion, version, recommendation });
                    });
            });
        },
    };
};
