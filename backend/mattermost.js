'use strict';

const { Client4 } = require('@mattermost/client');

const { v4: uuidV4 } = require('uuid');

const Logger = require('./logs');

const log = new Logger('Mattermost');

class mattermost {
    constructor(app) {
        const {
            MATTERMOST_ENABLED,
            MATTERMOST_TOKEN,
            MATTERMOST_SERVER_URL,
            MATTERMOST_USERNAME,
            MATTERMOST_PASSWORD,
        } = process.env;

        log.debug('Mattermost config', {
            enabled: MATTERMOST_ENABLED,
            token: MATTERMOST_TOKEN,
            server: MATTERMOST_SERVER_URL,
            username: MATTERMOST_USERNAME,
            password: MATTERMOST_PASSWORD,
        });

        if (MATTERMOST_ENABLED !== 'true') return;

        this.app = app;
        this.token = MATTERMOST_TOKEN;
        this.serverUrl = MATTERMOST_SERVER_URL;
        this.username = MATTERMOST_USERNAME;
        this.password = MATTERMOST_PASSWORD;

        this.client = new Client4();
        this.client.setUrl(this.serverUrl);
        this.authenticate();
        this.setupEventHandlers();
    }

    async authenticate() {
        try {
            const user = await this.client.login(this.username, this.password);
            log.debug('--------> Logged into Mattermost as', user.username);
        } catch (error) {
            log.error('Failed to log into Mattermost:', error);
        }
    }

    setupEventHandlers() {
        this.app.post('/mattermost', (req, res) => {
            //
            const { token, text, command, channel_id } = req.body;
            if (token !== this.token) {
                return res.status(403).send('Invalid token');
            }

            if (command.trim() === '/c2c' || text.trim() === '/c2c') {
                const meetingUrl = this.getMeetingURL(req);
                return res.json({
                    text: `Here is your meeting room: ${meetingUrl}`,
                    channel_id: channel_id,
                });
            }

            return res.status(200).send('Command not recognized');
        });
    }

    getMeetingURL(req) {
        const host = req.headers.host;
        const protocol = host.includes('localhost') ? 'http' : 'https';
        return `${protocol}://${host}/?room=${uuidV4()}`;
    }
}

module.exports = mattermost;
