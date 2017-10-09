module.exports = function github (token, repository) {

    const client = require('octonode').client(token);
    const ghrepo = client.repo(repository);

    return {

        createReleasePR(releasingBranch, releaseBranch, version) {
            const prBody = `Please check :
 - [ ] the manifest (versions and dependencies)
 - [ ] the update script
 - [ ] CSS and JavaScript bundles
`;
            return new Promise( (resolve, reject) => {

                ghrepo.pr({
                    title: `Release ${version}`,
                    body : prBody,
                    head: releasingBranch,
                    base: releaseBranch
                }, (err, data)  => {
                    if(err){
                        return reject(err);
                    }
                    return resolve(data);
                });
            });
        },

        closePR(id){
            return new Promise( (resolve, reject) => {
                const ghpr = client.pr(repository, id);
                ghpr.merge( (err, merged) => {
                    if(err){
                        return reject(err);
                    }
                    if(!merged){
                        return reject(new Error('I do not close an open PR'));
                    }
                    ghpr.close( closeErr => {
                        if(closeErr){
                            return reject(closeErr);
                        }
                        return resolve(true);

                    });
                });
            });
        },

        release(tag, comment = ''){
            return new Promise( (resolve, reject) => {
                ghrepo.release({
                    tag_name : tag,
                    name : tag,
                    body : comment
                }, (err, released) => {
                    if(err){
                        return reject(err);
                    }
                    return resolve(released);
                });
            });

        }
    };
};
