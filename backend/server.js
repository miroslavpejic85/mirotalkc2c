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
 * @version 1.0.5
 */

require('dotenv').config();

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
const logs = require('./logs');
const log = new logs('server');
const isHttps = process.env.HTTPS == 'true';
const port = process.env.PORT || 8080;
const queryJoin = '/join?room=test&name=test';
const queryRoom = '/?room=test';

let server;
if (isHttps) {
    const fs = require('fs');
    const options = {
        key: fs.readFileSync(path.join(__dirname, 'ssl/key.pem'), 'utf-8'),
        cert: fs.readFileSync(path.join(__dirname, 'ssl/cert.pem'), 'utf-8'),
    };
    server = https.createServer(options, app);
} else {
    server = http.createServer(app);
}
const domain = process.env.HOST || 'localhost';

const host = `http${isHttps ? 's' : ''}://${domain}:${port}`;

const io = new Server({ maxHttpBufferSize: 1e7, transports: ['websocket'] }).listen(server);

const ngrokEnabled = getEnvBoolean(process.env.NGROK_ENABLED);
const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;

let iceServers = [];
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

const redirectURL = process.env.REDIRECT_URL || false;

const frontendDir = path.join(__dirname, '../', 'frontend');
const htmlClient = path.join(__dirname, '../', 'frontend/html/client.html');
const htmlHome = path.join(__dirname, '../', 'frontend/html/home.html');

let channels = {};
let sockets = {};
let peers = {};

app.use(cors());
app.use(compression());
app.use(express.static(frontendDir));

app.get('/', (req, res) => {
    return res.sendFile(htmlHome);
});

app.get('/join/', (req, res) => {
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

function notFound(res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({ data: '404 not found' });
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
        // const data = JSON.parse(await api.get('api/tunnels')); // v3
        const data = await api.listTunnels(); // v4
        const pu0 = data.tunnels[0].public_url;
        const pu1 = data.tunnels[1].public_url;
        const tunnelHttps = pu0.startsWith('https') ? pu0 : pu1;
        log.debug('settings', {
            ngrokAuthToken: ngrokAuthToken,
            iceServers: iceServers,
            ngrokHome: tunnelHttps,
            ngrokRoom: tunnelHttps + queryRoom,
            ngrokJoin: tunnelHttps + queryJoin,
            redirectURL: redirectURL,
            nodeVersion: process.versions.node,
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
            iceServers: iceServers,
            home: host,
            room: host + queryRoom,
            join: host + queryJoin,
            redirectURL: redirectURL,
            nodeVersion: process.versions.node,
        });
    }
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

        log.debug('connected peers grp by roomId', peers);

        addPeerTo(channel);

        channels[channel][socket.id] = socket;
        socket.channels[channel] = channel;

        sendToPeer(socket.id, sockets, 'serverInfo', {
            roomPeersCount: Object.keys(peers[channel]).length,
            redirectURL: redirectURL,
        });
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
        log.debug('connected peers grp by roomId', peers);

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
});
