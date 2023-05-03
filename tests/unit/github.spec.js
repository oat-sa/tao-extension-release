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
 * Copyright (c) 2023 Open Assessment Technologies SA;
 */

import github from '../../src/github.js';
const token = 'ffaaffe5a8';
const repo  = 'foo-sa/bar-project';

jest.mock('octonode', () => {
    const originalModule = jest.requireActual('octonode');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: {
            client: jest.fn(() => ({
                repo() {
                    return {
                        pr(data, cb){
                            cb(null, { number : 12 });
                        }
                    };
            }}))
        }
    };
});
const commits = {
    repository: {
        pullRequest: {
            commits: {
                nodes: [
                    { commit: { oid: '1' } },
                    { commit: { oid: '2' } },
                ],
                pageInfo: {
                    hasNextPage: false,
                },
            },
        },
    },
};
jest.mock('../../src/githubApiClient.js', () => {
    const originalModule = jest.requireActual('conventional-changelog-core');
    //Mock the default export
    return {
        __esModule: true,
        ...originalModule,
        default: jest.fn(api => ({
            getPRCommits: jest.fn(() => commits),
            searchPullRequests: jest.fn(arg => ({
                search: {
                    nodes: [
                        {
                            assignee: {
                                nodes: [{
                                    login: 'login'
                                }]
                            },
                            commit: { oid: '1' },
                            user: { login: 'user'},
                            closedAt: 'Wed May 03 2023 15:26:48 GMT+0200 (Central European Summer Time)'

                        }
                    ]
                }
            })),
            ...api
        }))
    };
});

describe('src/github.js', () => {
    it('the module api', () => {
        expect(typeof github).toBe('function');
        expect(typeof github(token, repo)).toBe('object');
    });
    it('the github client factory', () => {
        try {
            github();
        } catch(err)  {
            expect(err instanceof TypeError).toBe(true);
            expect(err.message).toBe('The Github token is missing or not well formatted.');
        };
        try {
            github('');
        } catch(err)  {
            expect(err instanceof TypeError).toBe(true);
            expect(err.message).toBe('The Github token is missing or not well formatted.');
        };
        try {
            github('foo');
        } catch(err)  {
            expect(err instanceof TypeError).toBe(true);
            expect(err.message).toBe('The Github token is missing or not well formatted.');
        };
        try {
            github(token);
        } catch(err)  {
            expect(err instanceof TypeError).toBe(true);
            expect(err.message).toBe('The Github repository identifier is missing or not well formatted, we expect the short version org-name/repo-name.');
        };
        try {
            github(token, '');
        } catch(err)  {
            expect(err instanceof TypeError).toBe(true);
            expect(err.message).toBe('The Github repository identifier is missing or not well formatted, we expect the short version org-name/repo-name.');
        };
        try {
            github(token, 'bar');
        } catch(err)  {
            expect(err instanceof TypeError).toBe(true);
            expect(err.message).toBe('The Github repository identifier is missing or not well formatted, we expect the short version org-name/repo-name.');
        };
        expect(typeof github(token, repo)).toBe('object');
    });
    it('the createReleasePR method', async () => {
        let ghclient = github(token, repo);
        expect(typeof ghclient.createReleasePR).toBe('function');
        try {
            await ghclient.createReleasePR();
        } catch(err)  {
            expect(err instanceof TypeError).toBe(true);
            expect(err.message).toBe('Unable to create a release pull request when the branches are not defined');
        };
        try {
            await ghclient.createReleasePR('release-1.2.3');
        } catch(err)  {
            expect(err instanceof TypeError).toBe(true);
            expect(err.message).toBe('Unable to create a release pull request when the branches are not defined');
        };
        const r = await ghclient.createReleasePR('release-1.2.3', 'master', '1.2.3', '1.2.0');
        expect(r).toStrictEqual({ number: 12 })
    });
    it('the method formatReleaseNote', () => {
        let ghclient = github(token, repo);
        expect(typeof ghclient.formatReleaseNote).toBe('function');
        expect(ghclient.formatReleaseNote()).toBe('');
        expect(ghclient.formatReleaseNote({
            title:    'Feature/tao 9986 human brain UI driver',
            number:   '12001',
            url:      'https://github.com/oat-sa/tao-core/pull/12001',
            user:     'johndoe',
            assignee: 'janedoe',
            commit:   '123456a',
            body:     'Please enable to brain driver protocol in the browser first',
            branch:   'feature/TAO-9986_human-brain-UI-driver'
        })).toBe('_Feature_ [TAO-9986](https://oat-sa.atlassian.net/browse/TAO-9986) : human brain UI driver [#12001](https://github.com/oat-sa/tao-core/pull/12001) ( by [johndoe](https://github.com/johndoe) - validated by [janedoe](https://github.com/janedoe) )');

        expect(ghclient.formatReleaseNote({
            title:    'feature/tao 9986 human brain UI driver',
            number:   '12001',
            url:      'https://github.com/oat-sa/tao-core/pull/12001',
            commit:   '123456a',
        })).toBe('_Feature_ [TAO-9986](https://oat-sa.atlassian.net/browse/TAO-9986) : human brain UI driver [#12001](https://github.com/oat-sa/tao-core/pull/12001)');

        expect(ghclient.formatReleaseNote({
            title:    'backport/fix/tao 1984 fix big brother backdoor',
            number:   '109084',
            url:      'https://github.com/oat-sa/tao-core/pull/109084',
            user:     'winston',
            assignee: 'julia',
            commit:   '654987a',
            body:     '',
            branch:   'backport/fix/TAO-1984_fix-big-brother-backdoor'
        })).toBe('_Fix_ [TAO-1984](https://oat-sa.atlassian.net/browse/TAO-1984) : backport fix big brother backdoor [#109084](https://github.com/oat-sa/tao-core/pull/109084) ( by [winston](https://github.com/winston) - validated by [julia](https://github.com/julia) )');
    });
    it('the method formatReleaseNote', async () => {
        const prNumber = 1234;
        const ghclient = github(token, repo);
        expect(typeof ghclient.getPRCommitShas).toBe('function');
        const actual = await ghclient.getPRCommitShas(prNumber);
        expect(actual).toStrictEqual(commits.repository.pullRequest.commits.nodes.map(({ commit: { oid } }) => oid.slice(0, 8)));
    });
    it('the extractReleaseNotesFromReleasePR method', async () => {
        const prNumber = 1234;
        const ghclient = github(token, repo);
        expect(typeof ghclient.extractReleaseNotesFromReleasePR).toBe('function');
        const result = await ghclient.extractReleaseNotesFromReleasePR(prNumber);
        const expectResult = ' - ( by [user](https://github.com/user) - validated by [login](https://github.com/login) )\n';
        expect(typeof result).toEqual('string');
        expect(result).toBe(expectResult);
    });
});