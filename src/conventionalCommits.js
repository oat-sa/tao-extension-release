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
 * Copyright (c) 2020-2024 Open Assessment Technologies SA;
 */

/**
 * Helper module to work with conventional commits tool.
 *
 * Conventional commits 3th party packages work under the root of current process
 * and there is not way to pass path to the target repository.
 * To work around the problem mentioned above the root of the process changed
 * to release target during traget select
 */
import conventionalChangelogCore from 'conventional-changelog-core';
import conventionalPresetConfig from '@oat-sa/conventional-changelog-tao';
import conventionalRecommendedBump from 'conventional-recommended-bump';
import semverInc from 'semver/functions/inc.js';
import semverCoerce from 'semver/functions/coerce.js';


/**
 * `semver` release types, can be used to specify version increment
 */
export const conventionalBumpTypes = Object.freeze({
    none: 'none', //do nothing
    patch: 'patch', //1.2.3 -> 1.2.4
    minor: 'minor', //1.2.3 -> 1.3.0
    major: 'major' //1.2.3 -> 2.0.0
});

export default {
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
     * Extract version from semver-like release tag
     * (v1.2.3 -> 1.2.3)
     * @param {String} lastTag
     * @returns {String}
     */
    async getVersionFromTag(lastTag) {
        const lastVersionObject = semverCoerce(lastTag);
        if (!lastVersionObject) {
            throw new Error('Unable to retrieve last version from tags or the last tag is not semver compliant');
        }
        return lastVersionObject.version;
    },

    /**
     * Get next recommended version
     *
     * @param {String} lastVersion
     * @param {String?} pathInMonorepo
     * @returns {Promise}
     */
    async getNextVersion(lastVersion, pathInMonorepo = null) {
        const lastVersionObject = semverCoerce(lastVersion);
        if (!lastVersionObject) {
            throw new Error('Last version is not semver compliant');
        }

        return new Promise((resolve, reject) => {
            conventionalRecommendedBump(
                {
                    preset: {
                        name: '@oat-sa/tao'
                    },
                    path: pathInMonorepo
                },
                {},
                (err, recommendation) => {
                    if (err) {
                        return reject(err);
                    }

                    //carefull inc mutate lastVersionObject
                    const version = semverInc(lastVersionObject, recommendation.releaseType);
                    resolve({ version, recommendation });
                });
        });
    },


    /**
     * Get next version, incremented by specified release-type
     *
     * @param {String} lastVersion
     * @param {String} releaseType
     * @returns {String}
     */
    incrementVersion(lastVersion, releaseType) {
        const lastVersionObject = semverCoerce(lastVersion);
        if (!lastVersionObject) {
            throw new Error(`Can not increment version: ${lastVersion} is not semver compliant`);
        }
        return semverInc(lastVersionObject, releaseType);
    }
};
