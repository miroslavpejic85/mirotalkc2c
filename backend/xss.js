'use strict';

const xss = require('xss');
const logs = require('./logs');
const log = new logs('xss');

const checkXSS = (id, dataObject) => {
    if (typeof dataObject === 'object' && Object.keys(dataObject).length > 0) {
        const data = xss(JSON.stringify(dataObject));
        log.debug('[' + id + '] Sanitization done');
        return JSON.parse(data);
    }
    return xss(dataObject);
};

module.exports = checkXSS;
