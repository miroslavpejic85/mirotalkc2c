'use strict';

const { v4: uuidV4 } = require('uuid');

module.exports = class ServerApi {
    constructor(host = null, authorization = null, api_key_secret = null) {
        this._host = host;
        this._authorization = authorization;
        this._api_key_secret = api_key_secret;
    }

    isAuthorized() {
        if (this._authorization != this._api_key_secret) return false;
        return true;
    }

    getMeetingURL() {
        return this.getProtocol() + this._host + '/?room=' + uuidV4();
    }

    getJoinURL(data) {
        return this.getProtocol() + this._host + '/join?room=' + data.room + '&name=' + data.name;
    }

    getProtocol() {
        return 'http' + (this._host.includes('localhost') ? '' : 's') + '://';
    }
};
