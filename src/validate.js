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
 * Copyright (c) 2018 Open Assessment Technologies SA;
 */

/**
 * Validation helper collection
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 *
 * @typedef {Object} validate
 */
const validate = {

    /**
     * Expects a Github token
     * @param {String} token - the token to validate
     * @param {String} errorMsg - the error message
     * @returns {validate} chains
     * @throws {TypeError} when invalid
     */
    githubToken(token, errorMsg = 'The Github token is missing or not well formatted, we expect a long hexa string.'){
        if(typeof token !== 'string' || !/[0-9A-Fa-f]{6,}/g.test(token)){
            throw new TypeError(errorMsg);
        }
        return this;
    },

    /**
     * Expects a Github repository identifier, the short version (org/repo)
     * @param {String} repoId - the repository identifier
     * @param {String} errorMsg - the error message
     * @returns {validate} chains
     * @throws {TypeError} when invalid
     */
    githubRepository(repoId, errorMsg = 'The Github repository identifier is missing or not well formatted, we expect the short version org-name/repo-name.'){
        if(typeof repoId !== 'string' || !/\S*\/\S*/g.test(repoId)){
            throw new TypeError(errorMsg);
        }
        return this;
    },

    /**
     * Expects a valid Pull Request number (a positive integer)
     * @param {String} repoId - the repository identifier
     * @param {String} errorMsg - the error message
     * @returns {validate} chains
     * @throws {TypeError} when invalid
     */
    prNumber(number, errorMsg = 'The given number is missing or not a valid Pull Request number') {
        let numericValue = Number(number);
        if(numericValue <= 0 || !Number.isInteger(numericValue)){
            throw new TypeError(errorMsg);
        }
        return this;
    }
};

module.exports = validate;
