'use strict';

const xss = require('xss');
const logs = require('./logs');
const log = new logs('xss');

const checkXSS = (dataObject) => {
    const data = xss(JSON.stringify(dataObject));
    log.debug('Sanitization done');
    return JSON.parse(data);
};

module.exports = checkXSS;
