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
 * @version 1.0.2
 */

require('dotenv').config();

const { Server } = require('socket.io');
const http = require('http');
const compression = require('compression');
const express = require('express');
const cors = require('cors');
const checkXSS = require('./xss.js');
const path = require('path');
const ngrok = require('ngrok');
const app = express();
const logs = require('./logs');
const log = new logs('server');
const port = process.env.PORT || 8080;
const queryJoin = '/join?room=test&name=test';
const queryRoom = '/?room=test';
const server = http.createServer(app);
const host = 'http://' + 'localhost' + ':' + port;

const io = new Server({ maxHttpBufferSize: 1e7, transports: ['websocket'] }).listen(server);

const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN || false;

const stunServerUrl = process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302';
const turnServerUrl = process.env.TURN_SERVER_URL;
const turnServerUsername = process.env.TURN_SERVER_USERNAME;
const turnServerCredential = process.env.TURN_SERVER_CREDENTIAL;
const iceServers = [
    { urls: stunServerUrl },
    { urls: turnServerUrl, username: turnServerUsername, credential: turnServerCredential },
];

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
        const roomId = req.query.room;
        const peerName = req.query.name;
        if (roomId && peerName) {
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

async function ngrokStart() {
    try {
        await ngrok.authtoken(ngrokAuthToken);
        await ngrok.connect(port);
        const api = ngrok.getApi();
        const data = JSON.parse(await api.get('api/tunnels')); // v3
        // const data = await api.listTunnels(); // v4
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
    if (ngrokAuthToken) {
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
        const config = checkXSS(cfg);

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
        const peerId = config.peerId;
        const sessionDescription = config.sessionDescription;

        sendToPeer(peerId, sockets, 'sessionDescription', {
            peerId: socket.id,
            sessionDescription: sessionDescription,
        });
        log.debug('[' + socket.id + '] relay SessionDescription to [' + peerId + '] ', {
            type: sessionDescription.type,
        });
    });

    socket.on('relayICE', (config) => {
        const peerId = config.peerId;
        const iceCandidate = config.iceCandidate;

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
        const config = checkXSS(cfg);

        const roomId = config.roomId;
        const peerName = config.peerName;
        const element = config.element;
        const active = config.active;

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
        sendToRoom(roomId, socket.id, 'peerStatus', {
            peerId: socket.id,
            peerName: peerName,
            element: element,
            active: active,
        });
        log.debug('[' + socket.id + '] emit peerStatus to [roomId: ' + roomId + ']', {
            peerName: peerName,
            element: element,
            active: active,
        });
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
