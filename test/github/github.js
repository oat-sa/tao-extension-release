const { assert } = require('chai');

const githubHelper = require('../../src/github');

context('Github helpers', () => {
    describe('getReleaseNotes', () => {

        // helper to build a github commit message from a branch name
        const commitMsgFromBranch = (branch) =>
            'Merge pull request #69 from oat-sa/'
            + branch
            + '\n\n'
            + branch.replace(/-/g, ' ');

        it('should build a commit message from a branch name', () => {
            assert.equal(
                commitMsgFromBranch('fix/TAO-6969-nasty-bug'),
                'Merge pull request #69 from oat-sa/fix/TAO-6969-nasty-bug\n\nfix/TAO 6969 nasty bug'
            );
        });

        // mock the github client
        let commitsData = [];
        const clientStub = {
            pr() {
                return {
                    commits: cb => {
                        cb(null, commitsData);
                    }
                };
            }
        };

        // Actual test
        const testCases = [
            {
                title: 'should parse a well formed commit message',
                commits: [{ sha: 'xxx', commit: { message: commitMsgFromBranch('fix/TAO-6969-nasty-bug') } }],
                expected: '- [fix] [TAO-6969](https://oat-sa.atlassian.net/browse/TAO-6969)  fix/TAO 6969 nasty bug ([commit](https://github.com/repo/commit/xxx))\n'
            },
            {
                title: 'should parse a commit message with prefix but no ticket number',
                commits: [{ sha: 'xxx', commit: { message: commitMsgFromBranch('fix/nasty-bug') } }],
                expected: 'xxxx\n'
            }
        ];

        testCases.forEach(testCase => {
            it(testCase.title, () => {
                commitsData = testCase.commits;
                return githubHelper.getReleaseNotes({ client: clientStub, repository: 'repo', id: 69 })
                    .then(notes => {
                        assert.equal(notes, testCase.expected);
                    });
            });
        });

    });
});
