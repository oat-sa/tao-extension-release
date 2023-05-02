import test from 'tape';
import fs from 'fs-extra';
import config from '../../../src/config.js';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workDir        = path.join(__dirname, 'work');
const configFile     = '.test-file';
const configFilePath = `${workDir}/${configFile}`;


const setUp    = () => fs.emptyDirSync(workDir);
const tearDown = () => fs.removeSync(workDir);

test.onFinish( tearDown );
test.onFailure( tearDown );


test('Load a config that does not exists', t => {
    setUp();
    t.plan(2);

    t.notOk( fs.existsSync(configFilePath), 'The config file does not exists yet');

    config(workDir, configFile)
        .load()
        .then( data => {
            t.deepEqual(data, {}, 'An empty object is given');

            tearDown();
            t.end();
        })
        .catch( err => t.fail(err.message));
});

test('Load an existing config', t => {
    const expected = {
        foo : true,
        bar : [10, 11, 12]
    };
    setUp();
    t.plan(3);

    t.notOk( fs.existsSync(configFilePath), 'The config file does not exists yet');

    fs.writeJsonSync(configFilePath, expected);

    t.ok( fs.existsSync(configFilePath), 'The config file has been created');

    config(workDir, configFile)
        .load()
        .then( data => {
            t.deepEqual(data, expected, 'The config has been loaded');

            tearDown();
            t.end();
        })
        .catch( err => t.fail(err.message));
});

test('Save a new config', t => {
    const expected = {
        foo : false,
        bar : {
            value : 11
        },
        list : ['a', 'b']
    };
    setUp();
    t.plan(3);

    t.notOk( fs.existsSync(configFilePath), 'The config file does not exists yet');

    config(workDir, configFile)
        .write(expected)
        .then( () => {

            t.ok( fs.existsSync(configFilePath), 'The config file has been created');

            const data = fs.readJsonSync(configFilePath);
            t.deepEqual(data, expected, 'The correct config has been written');

            tearDown();
            t.end();
        })
        .catch( err => t.fail(err.message));
});
