import fs from 'fs-extra';
import config from '../../../src/config.js';
import path from 'path';

const workDir        =  path.resolve(__dirname, '../work');
const configFile     = '.test-file';
const configFilePath = `${workDir}/${configFile}`;

const setUp    = () => fs.emptyDirSync(workDir);
const tearDown = () => fs.removeSync(workDir);

afterAll(() => {
    tearDown();
    jest.restoreAllMocks();
    jest.clearAllMocks();
});

test('Load a config that does not exists', async () => {
    setUp();
    expect.assertions(2);

    expect(fs.existsSync(configFilePath)).toBe(false);
    const result = await config(workDir, configFile).load();
    expect(result).toStrictEqual({});
    tearDown();
});
test('Load an existing config', async() => {
    const expected = {
        foo : true,
        bar : [10, 11, 12]
    };
    setUp();
    expect.assertions(3);

    expect(fs.existsSync(configFilePath)).toBe(false);
    fs.writeJsonSync(configFilePath, expected);
    expect(fs.existsSync(configFilePath)).toBe(true);
    
    const data = await config(workDir, configFile).load();
    expect(data).toStrictEqual(expected);
    tearDown();
});

test('Save a new config', async() => {
    const expected = {
        foo : false,
        bar : {
            value : 11
        },
        list : ['a', 'b']
    };
    setUp();
    expect.assertions(3);
    expect(fs.existsSync(configFilePath)).toBe(false);
    await config(workDir, configFile).write(expected);
    expect(fs.existsSync(configFilePath)).toBe(true);
    const data = fs.readJsonSync(configFilePath);
    expect(data).toStrictEqual(expected);
    tearDown();
});
