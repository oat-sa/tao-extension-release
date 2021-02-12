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
 * Helper module to work with conventional commits tool.
 *
 * Conventional commits 3th party packages work under the root of current process
 * and there is not way to pass path to the target repository.
 * To work around the problem mentioned above the root of the process changed
 * to release target during traget select
 */
const conventionalChangelogCore = require('conventional-changelog-core');
const conventionalPresetConfig = require('@oat-sa/conventional-changelog-tao');
const conventionalRecommendedBump = require('conventional-recommended-bump');
const semverParse = require('semver/functions/parse');
const semverInc = require('semver/functions/inc');

module.exports = {
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
                    config: conventionalPresetConfig(),
                },
                context
            )
                .on('error', err => reject(err))
                .on('data', chunk => chunks.push(chunk))
                .on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
    },
    /**
     * Get next recommended version
     *
     * @param {String} lastTag
     * @returns {Promise}
     */
    async getNextVersion(lastTag) {
        const lastVersionObject = semverParse(lastTag);
        if (!lastVersionObject) {
            throw new Error('Unable to retrieve last version from tags');
        }

        return new Promise((resolve, reject) => {
            conventionalRecommendedBump(
                {
                    preset: {
                        name: '@oat-sa/tao'
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
    }
};
