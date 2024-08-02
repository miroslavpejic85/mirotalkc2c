'use strict';

/**
 * MiroTalk C2C - Server component
 *
 * @link    GitHub: https://github.com/miroslavpejic85/mirotalkc2c
 * @link    Live demo: https://c2c.mirotalk.com
 * @license For open source under AGPL-3.0
 * @license For private project or commercial purposes contact us at: license.mirotalk@gmail.com or purchase it directly via Code Canyon:
 * @license https://codecanyon.net/item/mirotalk-c2c-webrtc-real-time-cam-2-cam-video-conferences-and-screen-sharing/43383005
 * @author  Miroslav Pejic - miroslav.pejic.85@gmail.com
 * @version 1.1.24
 */

require('dotenv').config();

const { auth, requiresAuth } = require('express-openid-connect');
const { Server } = require('socket.io');
const http = require('http');
const https = require('https');
const compression = require('compression');
const express = require('express');
const cors = require('cors');
const checkXSS = require('./xss.js');
const path = require('path');
const ngrok = require('ngrok');
const app = express();
const fs = require('fs');
const logs = require('./logs');
const log = new logs('server');
const isHttps = process.env.HTTPS == 'true';
const port = process.env.PORT || 8080;
const ServerApi = require('./api');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, '/api/swagger.yaml'), 'utf8'));
const queryJoin = '/join?room=test&name=test';
const queryRoom = '/?room=test';
const packageJson = require('../package.json');

// Email alerts and notifications
const nodemailer = require('./lib/nodemailer');

let server;

if (isHttps) {
    const keyPath = path.join(__dirname, 'ssl/key.pem');
    const certPath = path.join(__dirname, 'ssl/cert.pem');

    if (!fs.existsSync(keyPath)) {
        log.error('SSL key file not found.');
        process.exit(1);
    }
    if (!fs.existsSync(certPath)) {
        log.error('SSL certificate file not found.');
        process.exit(1);
    }
    const options = {
        key: fs.readFileSync(keyPath, 'utf-8'),
        cert: fs.readFileSync(certPath, 'utf-8'),
    };
    server = https.createServer(options, app);
} else {
    server = http.createServer(app);
}

const domain = process.env.HOST || 'localhost';

const host = `http${isHttps ? 's' : ''}://${domain}:${port}`;

const apiKeySecret = process.env.API_KEY_SECRET || 'mirotalkc2c_default_secret';
const apiBasePath = '/api/v1'; // api endpoint path
const apiDocs = host + apiBasePath + '/docs'; // api docs

// Cors
const cors_origin = process.env.CORS_ORIGIN;
const cors_methods = process.env.CORS_METHODS;

let corsOrigin = '*';
let corsMethods = ['GET', 'POST'];

if (cors_origin && cors_origin !== '*') {
    try {
        corsOrigin = JSON.parse(cors_origin);
    } catch (error) {
        log.error('Error parsing CORS_ORIGIN', error.message);
    }
}

if (cors_methods && cors_methods !== '') {
    try {
        corsMethods = JSON.parse(cors_methods);
    } catch (error) {
        log.error('Error parsing CORS_METHODS', error.message);
    }
}

const corsOptions = {
    origin: corsOrigin,
    methods: corsMethods,
};

const io = new Server({
    maxHttpBufferSize: 1e7,
    transports: ['websocket'],
    cors: corsOptions,
}).listen(server);

const ngrokEnabled = getEnvBoolean(process.env.NGROK_ENABLED);
const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;

const iceServers = [];
const stunServerUrl = process.env.STUN_SERVER_URL;
const turnServerUrl = process.env.TURN_SERVER_URL;
const turnServerUsername = process.env.TURN_SERVER_USERNAME;
const turnServerCredential = process.env.TURN_SERVER_CREDENTIAL;
const stunServerEnabled = getEnvBoolean(process.env.STUN_SERVER_ENABLED);
const turnServerEnabled = getEnvBoolean(process.env.TURN_SERVER_ENABLED);
if (stunServerEnabled && stunServerUrl) iceServers.push({ urls: stunServerUrl });
if (turnServerEnabled && turnServerUrl && turnServerUsername && turnServerCredential) {
    iceServers.push({ urls: turnServerUrl, username: turnServerUsername, credential: turnServerCredential });
}

const surveyURL = process.env.SURVEY_URL || false;
const redirectURL = process.env.REDIRECT_URL || false;

const OIDC = {
    enabled: process.env.OIDC_ENABLED ? getEnvBoolean(process.env.OIDC_ENABLED) : false,
    config: {
        issuerBaseURL: process.env.OIDC_ISSUER_BASE_URL,
        clientID: process.env.OIDC_CLIENT_ID,
        clientSecret: process.env.OIDC_CLIENT_SECRET,
        baseURL: process.env.OIDC_BASE_URL,
        secret: process.env.SESSION_SECRET,
        authorizationParams: {
            response_type: 'code',
            scope: 'openid profile email',
        },
        authRequired: process.env.OIDC_AUTH_REQUIRED ? getEnvBoolean(process.env.OIDC_AUTH_REQUIRED) : false,
        auth0Logout: true,
        routes: {
            callback: '/auth/callback',
            login: false,
            logout: '/logout',
        },
    },
};

const OIDCAuth = function (req, res, next) {
    if (OIDC.enabled) {
        requiresAuth()(req, res, next);
    } else {
        next();
    }
};

const frontendDir = path.join(__dirname, '../', 'frontend');
const htmlClient = path.join(__dirname, '../', 'frontend/html/client.html');
const htmlHome = path.join(__dirname, '../', 'frontend/html/home.html');

const channels = {};
const sockets = {};
const peers = {};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json()); // Api parse body data as json
app.use(express.static(frontendDir));
app.use(apiBasePath + '/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // api docs

// Logs requests
app.use((req, res, next) => {
    log.debug('New request:', {
        body: req.body,
        method: req.method,
        path: req.originalUrl,
    });
    next();
});

app.post('*', function (next) {
    next();
});

app.get('*', function (next) {
    next();
});

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError || err.status === 400 || 'body' in err) {
        log.error('Request Error', {
            header: req.headers,
            body: req.body,
            error: err.message,
        });
        return res.status(400).send({ status: 404, message: err.message }); // Bad request
    }
    if (req.path.substr(-1) === '/' && req.path.length > 1) {
        let query = req.url.slice(req.path.length);
        res.redirect(301, req.path.slice(0, -1) + query);
    } else {
        next();
    }
});

// OpenID Connect
if (OIDC.enabled) {
    try {
        app.use(auth(OIDC.config));
    } catch (err) {
        log.error(err);
        process.exit(1);
    }
}

app.get('/profile', OIDCAuth, (req, res) => {
    if (OIDC.enabled) {
        return res.json(req.oidc.user); // Send user information as JSON
    }
    res.sendFile(htmlHome);
});

app.get('/auth/callback', (req, res, next) => {
    next(); // Let express-openid-connect handle this route
});

app.get('/logout', (req, res) => {
    if (OIDC.enabled) req.logout();
    res.redirect('/'); // Redirect to the home page after logout
});

app.get('/', OIDCAuth, (req, res) => {
    return res.sendFile(htmlHome);
});

app.get('/join/', OIDCAuth, (req, res) => {
    if (Object.keys(req.query).length > 0) {
        //http://localhost:3000/join?room=test&name=test
        log.debug('[' + req.headers.host + ']' + ' request query', req.query);
        const { room, name } = checkXSS('join', req.query);
        if (room && name) {
            return res.sendFile(htmlClient);
        }
        return notFound(res);
    }
    return notFound(res);
});

app.get('*', (req, res) => {
    return notFound(res);
});

// API request meeting room endpoint
app.post([`${apiBasePath}/meeting`], (req, res) => {
    const { host, authorization } = req.headers;
    const api = new ServerApi(host, authorization, apiKeySecret);
    if (!api.isAuthorized()) {
        log.debug('MiroTalk get meeting - Unauthorized', {
            header: req.headers,
            body: req.body,
        });
        return res.status(403).json({ error: 'Unauthorized!' });
    }
    const meetingURL = api.getMeetingURL();
    res.json({ meeting: meetingURL });
    log.debug('MiroTalk get meeting - Authorized', {
        header: req.headers,
        body: req.body,
        meeting: meetingURL,
    });
});

// API request join room endpoint
app.post([`${apiBasePath}/join`], (req, res) => {
    const { host, authorization } = req.headers;
    const api = new ServerApi(host, authorization, apiKeySecret);
    if (!api.isAuthorized()) {
        log.debug('MiroTalk get join - Unauthorized', {
            header: req.headers,
            body: req.body,
        });
        return res.status(403).json({ error: 'Unauthorized!' });
    }
    const joinURL = api.getJoinURL(req.body);
    res.json({ join: joinURL });
    log.debug('MiroTalk get join - Authorized', {
        header: req.headers,
        body: req.body,
        join: joinURL,
    });
});

function notFound(res) {
    res.json({ data: '404 not found' });
}

function getEnvBoolean(key, force_true_if_undefined = false) {
    if (key == undefined && force_true_if_undefined) return true;
    return key == 'true' ? true : false;
}

async function ngrokStart() {
    try {
        await ngrok.authtoken(ngrokAuthToken);
        await ngrok.connect(port);
        const api = ngrok.getApi();
        const list = await api.listTunnels();
        const tunnelHttps = list.tunnels[0].public_url;
        log.debug('settings', {
            ngrokAuthToken: ngrokAuthToken,
            iceServers: iceServers,
            cors: corsOptions,
            ngrokHome: tunnelHttps,
            ngrokRoom: tunnelHttps + queryRoom,
            ngrokJoin: tunnelHttps + queryJoin,
            apiDocs: apiDocs,
            apiKeySecret: apiKeySecret,
            redirectURL: redirectURL,
            nodeVersion: process.versions.node,
            app_version: packageJson.version,
        });
    } catch (err) {
        log.warn('[Error] ngrokStart', err);
        process.exit(1);
    }
}

server.listen(port, null, () => {
    if (!isHttps && ngrokEnabled && ngrokAuthToken) {
        ngrokStart();
    } else {
        log.debug('settings', {
            oidc: OIDC.enabled ? OIDC : false,
            iceServers: iceServers,
            cors: corsOptions,
            home: host,
            room: host + queryRoom,
            join: host + queryJoin,
            apiDocs: apiDocs,
            apiKeySecret: apiKeySecret,
            redirectURL: redirectURL,
            surveyURL: surveyURL,
            nodeVersion: process.versions.node,
            app_version: packageJson.version,
        });
    }
});

io.on('error', (error) => {
    log.error('Socket.IO error:', error);
});

io.sockets.on('connect', (socket) => {
    log.debug('[' + socket.id + '] connection accepted');
    socket.channels = {};
    sockets[socket.id] = socket;

    socket.on('join', (cfg) => {
        const config = checkXSS(socket.id, cfg);

        log.debug('[' + socket.id + '] join ', config);

        const channel = config.channel;

        if (channel in socket.channels) {
            return log.debug('[' + socket.id + '] [Warning] already joined', channel);
        }
        if (!(channel in channels)) channels[channel] = {};
        if (!(channel in peers)) peers[channel] = {};

        peers[channel][socket.id] = config.peerInfo;

        const activeRooms = getActiveRooms();

        log.info('[Join] - active rooms and peers count', activeRooms);

        log.debug('[Join] - connected peers grp by roomId', peers);

        addPeerTo(channel);

        channels[channel][socket.id] = socket;
        socket.channels[channel] = channel;

        const peerCounts = Object.keys(peers[channel]).length;

        sendToPeer(socket.id, sockets, 'serverInfo', {
            roomPeersCount: peerCounts,
            redirectURL: redirectURL,
            surveyURL: surveyURL,
        });

        // SCENARIO: Notify when the first user join room and is awaiting assistance...
        if (peerCounts === 1) {
            const { peerName, osName, osVersion, browserName, browserVersion } = config.peerInfo;
            nodemailer.sendEmailAlert('join', {
                room_id: channel,
                peer_name: peerName,
                domain: socket.handshake.headers.host.split(':')[0],
                os: osName ? `${osName} ${osVersion}` : '',
                browser: browserName ? `${browserName} ${browserVersion}` : '',
            }); // .env EMAIL_ALERT=true
        }
    });

    socket.on('relaySDP', (config) => {
        const { peerId, sessionDescription } = config;

        sendToPeer(peerId, sockets, 'sessionDescription', {
            peerId: socket.id,
            sessionDescription: sessionDescription,
        });
        log.debug('[' + socket.id + '] relay SessionDescription to [' + peerId + '] ', {
            type: sessionDescription.type,
        });
    });

    socket.on('relayICE', (config) => {
        const { peerId, iceCandidate } = config;

        sendToPeer(peerId, sockets, 'iceCandidate', {
            peerId: socket.id,
            iceCandidate: iceCandidate,
        });
    });

    socket.on('disconnect', (reason) => {
        for (let channel in socket.channels) {
            removePeerFrom(channel);
        }
        log.debug('[' + socket.id + '] disconnected', { reason: reason });
        delete sockets[socket.id];
    });

    socket.on('peerStatus', (cfg) => {
        const config = checkXSS(socket.id, cfg);

        const { roomId, peerName, element, active } = config;

        for (let peerId in peers[roomId]) {
            if (peers[roomId][peerId]['peerName'] == peerName) {
                switch (element) {
                    case 'video':
                        peers[roomId][peerId]['peerVideo'] = active;
                        break;
                    case 'audio':
                        peers[roomId][peerId]['peerAudio'] = active;
                        break;
                    case 'screen':
                        peers[roomId][peerId]['peerScreen'] = active;
                        break;
                }
            }
        }

        const data = {
            peerId: socket.id,
            peerName: peerName,
            element: element,
            active: active,
        };
        sendToRoom(roomId, socket.id, 'peerStatus', data);

        log.debug('[' + socket.id + '] emit peerStatus to [roomId: ' + roomId + ']', data);
    });

    async function addPeerTo(channel) {
        for (let id in channels[channel]) {
            await channels[channel][id].emit('addPeer', {
                peerId: socket.id,
                peers: peers[channel],
                shouldCreateOffer: false,
                iceServers: iceServers,
            });
            socket.emit('addPeer', {
                peerId: id,
                peers: peers[channel],
                shouldCreateOffer: true,
                iceServers: iceServers,
            });
            log.debug('[' + socket.id + '] emit addPeer [' + id + ']');
        }
    }

    async function removePeerFrom(channel) {
        if (!(channel in socket.channels)) {
            log.debug('[' + socket.id + '] [Warning] not in ', channel);
            return;
        }

        delete socket.channels[channel];
        delete channels[channel][socket.id];
        delete peers[channel][socket.id];

        if (Object.keys(peers[channel]).length == 0) {
            delete peers[channel];
        }

        const activeRooms = getActiveRooms();

        log.info('[RemovePeer] - active rooms and peers count', activeRooms);

        log.debug('[RemovePeer] - connected peers grp by roomId', peers);

        for (let id in channels[channel]) {
            await channels[channel][id].emit('removePeer', { peerId: socket.id });
            socket.emit('removePeer', { peerId: id });
            log.debug('[' + socket.id + '] emit removePeer [' + id + ']');
        }
    }

    async function sendToRoom(roomId, socketId, msg, config = {}) {
        for (let peerId in channels[roomId]) {
            if (peerId != socketId) {
                await channels[roomId][peerId].emit(msg, config);
            }
        }
    }

    async function sendToPeer(peerId, sockets, msg, config = {}) {
        if (peerId in sockets) {
            await sockets[peerId].emit(msg, config);
        }
    }

    function getActiveRooms() {
        const roomPeersArray = [];
        for (const roomId in peers) {
            if (peers.hasOwnProperty(roomId)) {
                const peersCount = Object.keys(peers[roomId]).length;
                roomPeersArray.push({
                    roomId: roomId,
                    peersCount: peersCount,
                });
            }
        }
        return roomPeersArray;
    }
});
