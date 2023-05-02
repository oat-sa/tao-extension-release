import test from 'tape';
import config from '../../../src/config.js';

test('API', t => {
    t.plan(4);

    t.ok(typeof config === 'function', 'The module exports a function');
    t.ok(typeof config() === 'object', 'The module function creates an object');
    t.ok(typeof config().load === 'function', 'The created object has a load method');
    t.ok(typeof config().write === 'function', 'The created object has a write method');

    t.end();
});

