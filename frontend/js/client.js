'use strict';

/**
 * MiroTalk C2C - Client component
 *
 * @link    GitHub: https://github.com/miroslavpejic85/mirotalkc2c
 * @link    Live demo: https://c2c.mirotalk.com
 * @license For open source under AGPL-3.0
 * @license For private project or commercial purposes contact us at: license.mirotalk@gmail.com or purchase it directly via Code Canyon:
 * @license https://codecanyon.net/item/mirotalk-c2c-webrtc-real-time-cam-2-cam-video-conferences-and-screen-sharing/43383005
 * @author  Miroslav Pejic - miroslav.pejic.85@gmail.com
 * @version 1.1.76
 */

const roomId = new URLSearchParams(window.location.search).get('room');
const peerName = new URLSearchParams(window.location.search).get('name');

const loadingDivContainer = document.getElementById('loadingDivContainer');
const waitingDivContainer = document.getElementById('waitingDivContainer');
const copyRoomBtn = document.getElementById('copyRoomBtn');
const shareRoomBtn = document.getElementById('shareRoomBtn');
const initHideMeBtn = document.getElementById('initHideMeBtn');
const initAudioBtn = document.getElementById('initAudioBtn');
const initVideoBtn = document.getElementById('initVideoBtn');
const initScreenShareBtn = document.getElementById('initScreenShareBtn');
const initSettingsBtn = document.getElementById('initSettingsBtn');
const initLeaveBtn = document.getElementById('initLeaveBtn');
const buttonsBar = document.getElementById('buttonsBar');
const hideMeBtn = document.getElementById('hideMeBtn');
const audioBtn = document.getElementById('audioBtn');
const videoBtn = document.getElementById('videoBtn');
const swapCameraBtn = document.getElementById('swapCameraBtn');
const settingsBtn = document.getElementById('settingsBtn');
const screenShareBtn = document.getElementById('screenShareBtn');
const leaveBtn = document.getElementById('leaveBtn');
const settings = document.getElementById('settings');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
const audioSource = document.getElementById('audioSource');
const videoSource = document.getElementById('videoSource');
const videoQualitySelect = document.getElementById('videoQualitySelect');
const videoFpsDiv = document.getElementById('videoFpsDiv');
const videoFpsSelect = document.getElementById('videoFpsSelect');
const maxVideoQualityDiv = document.getElementById('maxVideoQualityDiv');
const pushToTalkDiv = document.getElementById('pushToTalkDiv');
const switchMaxVideoQuality = document.getElementById('switchMaxVideoQuality');
const switchKeepAspectRatio = document.getElementById('switchKeepAspectRatio');
const switchPushToTalk = document.getElementById('switchPushToTalk');
const sessionTime = document.getElementById('sessionTime');
const chat = document.getElementById('chat');
const chatOpenBtn = document.getElementById('chatOpenBtn');
const chatBody = document.getElementById('chatBody');
const chatSaveBtn = document.getElementById('chatSaveBtn');
const chatCleanBtn = document.getElementById('chatCleanBtn');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const chatInput = document.getElementById('chatInput');
const chatEmojiBtn = document.getElementById('chatEmojiBtn');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatEmoji = document.getElementById('chatEmoji');
const recordingLabel = document.getElementById('recordingLabel');
const recordingBtn = document.getElementById('recordingBtn');
const recordingTime = document.getElementById('recordingTime');

let chatMessages = []; // collect chat messages to save it later

const roomURL = window.location.origin + '/?room=' + roomId;

const LS = new LocalStorage();

const localStorageConfig = LS.getConfig() || LS.C2C_CONFIG;

console.log('Local Storage Config', localStorageConfig);

const image = {
    camOff: '../images/camOff.png',
    feedback: '../images/feedback.png',
    forbidden: '../images/forbidden.png',
    poster: '../images/loader.gif',
};

const className = {
    user: 'fas fa-user',
    userOff: 'fas fa-user-slash',
    clock: 'fas fa-clock',
    audioOn: 'fas fa-microphone',
    audioOff: 'fas fa-microphone-slash',
    videoOn: 'fas fa-video',
    videoOff: 'fas fa-video-slash',
    screenOn: 'fas fa-desktop',
    screenOff: 'fas fa-stop-circle',
    draggable: 'fas fa-up-down-left-right',
    fullScreenOn: 'fas fa-expand',
    fullScreenOff: 'fas fa-compress',
    pip: 'fas fa-images',
    rotate: 'fas fa-rotate-right',
};

const swal = {
    background: '#202123',
    textColor: '#ffffff',
};

const chatInputEmoji = {
    '<3': '❤️',
    '</3': '💔',
    ':D': '😀',
    ':)': '😃',
    ';)': '😉',
    ':(': '😒',
    ':p': '😛',
    ';p': '😜',
    ":'(": '😢',
    ':+1:': '👍',
    ':*': '😘',
    ':O': '😲',
    ':|': '😐',
    ':*(': '😭',
    XD: '😆',
    ':B': '😎',
    ':P': '😜',
    '<(': '👎',
    '>:(': '😡',
    ':S': '😟',
    ':X': '🤐',
    ';(': '😥',
    ':T': '😖',
    ':@': '😠',
    ':$': '🤑',
    ':&': '🤗',
    ':#': '🤔',
    ':!': '😵',
    ':W': '😷',
    ':%': '🤒',
    ':*!': '🤩',
    ':G': '😬',
    ':R': '😋',
    ':M': '🤮',
    ':L': '🥴',
    ':C': '🥺',
    ':F': '🥳',
    ':Z': '🤢',
    ':^': '🤓',
    ':K': '🤫',
    ':D!': '🤯',
    ':H': '🧐',
    ':U': '🤥',
    ':V': '🤪',
    ':N': '🥶',
    ':J': '🥴',
};

const isVideoPIPSupported = document.pictureInPictureEnabled;
const isWebRTCSupported = checkWebRTCSupported();
const userAgent = navigator.userAgent;
const parser = new UAParser(userAgent);
const result = parser.getResult();
const deviceType = result.device.type || 'desktop';
const isMobileDevice = deviceType === 'mobile';
const isTabletDevice = deviceType === 'tablet';
const isIPadDevice = result.device.model?.toLowerCase() === 'ipad';
const isDesktopDevice = deviceType === 'desktop';
const osName = result.os.name;
const osVersion = result.os.version;
const browserName = result.browser.name;
const browserVersion = result.browser.version;
const isFirefox = browserName.toLowerCase().includes('firefox');

let isCamMirrored = false;
let myVideoChange = false;
let isVideoStreaming = true;
let isAudioStreaming = true;
let isScreenStreaming = false;
let isPushToTalkActive = false;
let isSpaceDown = false;
let isMyAudioActiveBefore = false;
let isMyVideoActiveBefore = false;
let camera = 'user';
let thisPeerId;
let signalingSocket;
let localMediaStream;
let remoteMediaStream;
let recording = null;
let recordingTimer = null;
let roomPeersCount = 0;
let peerDevice = {};
let peerConnections = {};
let peerMediaElements = {};
let dataChannels = {};

let myVideo;
let myVideoWrap;
let myVideoAvatarImage;
let myAudioStatusIcon;

let videoQualitySelectedIndex = 0;
let videoFpsSelectedIndex = 0;

let surveyURL = false;
let redirectURL = false;

const tooltips = [
    { element: shareRoomBtn, text: 'Share room URL', position: 'top' },
    { element: copyRoomBtn, text: 'Copy and share room URL', position: 'top' },
    { element: initHideMeBtn, text: 'Hide myself', position: 'top' },
    { element: initVideoBtn, text: 'Toggle video', position: 'top' },
    { element: initAudioBtn, text: 'Toggle audio', position: 'top' },
    { element: initScreenShareBtn, text: 'Toggle screen sharing', position: 'top' },
    { element: initSettingsBtn, text: 'Toggle settings', position: 'top' },
    { element: initLeaveBtn, text: 'Leave room', position: 'top' },
    { element: hideMeBtn, text: 'Hide myself', position: 'top' },
    { element: videoBtn, text: 'Toggle video', position: 'top' },
    { element: audioBtn, text: 'Toggle audio', position: 'top' },
    { element: swapCameraBtn, text: 'Swap camera', position: 'top' },
    { element: screenShareBtn, text: 'Toggle screen sharing', position: 'top' },
    { element: recordingBtn, text: 'Toggle recording', position: 'top' },
    { element: chatOpenBtn, text: 'Toggle chat', position: 'top' },
    { element: settingsBtn, text: 'Toggle settings', position: 'top' },
    { element: leaveBtn, text: 'Leave room', position: 'top' },
    //...
];

function getDocumentElementsById() {
    myVideo = document.getElementById('myVideo');
    myVideoWrap = document.getElementById('myVideoWrap');
    myVideoAvatarImage = document.getElementById('myVideoAvatarImage');
    myAudioStatusIcon = document.getElementById('myAudioStatusIcon');
}

function thereIsPeerConnections() {
    if (Object.keys(peerConnections).length === 0) return false;
    return true;
}

document.addEventListener('DOMContentLoaded', function () {
    initClient();
    handleChatEmojiPicker();
});

function initClient() {
    console.log('RoomURL', roomURL);
    console.log('Location', window.location);

    if (!isWebRTCSupported) {
        return popupMessage('warning', 'WebRTC', 'This browser seems not supported WebRTC!');
    }

    tooltips.forEach(({ element, text, position }) => {
        setTippy(element, text, position);
    });

    console.log('Connecting to signaling server');
    signalingSocket = io({ transports: ['websocket'] });

    signalingSocket.on('connect', handleConnect);
    signalingSocket.on('error', handleError);
    signalingSocket.on('serverInfo', handleServerInfo);
    signalingSocket.on('addPeer', handleAddPeer);
    signalingSocket.on('sessionDescription', handleSessionDescription);
    signalingSocket.on('iceCandidate', handleIceCandidate);
    signalingSocket.on('peerStatus', handlePeerStatus);
    signalingSocket.on('disconnect', handleDisconnect);
    signalingSocket.on('removePeer', handleRemovePeer);
}

async function sendToServer(msg, config = {}) {
    await signalingSocket.emit(msg, config);
}

function handleConnect() {
    console.log('Connected to signaling server');
    thisPeerId = signalingSocket.id;
    console.log('This peer id: ' + thisPeerId);
    if (localMediaStream) {
        joinToChannel();
    } else {
        setupLocalMedia(async () => {
            await enumerateDevices();
            handleVideoWrapSize();
            getDocumentElementsById();
            handleEvents();
            loadLocalStorageConfig();
            showWaitingUser();
            joinToChannel();
        });
    }
}

function handleError(error) {
    console.error('WebSocket connection error:', error);
}

function joinToChannel() {
    console.log('Join to channel', roomId);
    sendToServer('join', {
        channel: roomId,
        peerInfo: {
            peerName: peerName,
            peerVideo: isVideoStreaming,
            peerAudio: isAudioStreaming,
            peerScreen: isScreenStreaming,
            osName: osName,
            osVersion: osVersion,
            browserName: browserName,
            browserVersion: browserVersion,
        },
        peerDevice: {
            userAgent: userAgent,
            isWebRTCSupported: isWebRTCSupported,
            isMobileDevice: isMobileDevice,
            isTabletDevice: isTabletDevice,
            isIPadDevice: isIPadDevice,
            isDesktopDevice: isDesktopDevice,
        },
    });
    playSound('join');
}

function handleServerInfo(config) {
    console.log('Server info', config);
    roomPeersCount = config.roomPeersCount;
    redirectURL = config.redirectURL;
    surveyURL = config.surveyURL;
}

function handleAddPeer(config) {
    if (roomPeersCount > 2) {
        return roomIsBusy();
    }
    const { peers, peerId, shouldCreateOffer, iceServers } = config;

    console.log('Add peer', peers);

    if (peerId in peerConnections) {
        return console.warn('Peer already connected', peerId);
    }

    elemDisplay(buttonsBar, true);
    animateCSS(buttonsBar, 'fadeInUp');

    const peerConnection = new RTCPeerConnection({ iceServers: iceServers });
    peerConnections[peerId] = peerConnection;

    handlePeersConnectionStatus(peerId);
    handleOnIceCandidate(peerId);
    handleRTCDataChannels(peerId);
    handleOnTrack(peerId, peers);
    handleAddTracks(peerId);

    if (shouldCreateOffer) {
        handleRtcOffer(peerId);
    }
    if (thereIsPeerConnections()) {
        elemDisplay(waitingDivContainer, false);
    }
    handleBodyEvents();
    playSound('join');
}

function roomIsBusy() {
    signalingSocket.disconnect();
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        position: 'center',
        icon: 'info',
        title: 'Room is busy',
        text: 'Please try with another one',
        showDenyButton: false,
        confirmButtonText: `OK`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) {
            openURL('/');
        }
    });
}

function handlePeersConnectionStatus(peerId) {
    peerConnections[peerId].onconnectionstatechange = function (event) {
        const connectionStatus = event.currentTarget.connectionState;
        console.log('Connection', { peerId: peerId, connectionStatus: connectionStatus });
    };
}

function handleOnIceCandidate(peerId) {
    peerConnections[peerId].onicecandidate = (event) => {
        if (!event.candidate) return;
        sendToServer('relayICE', {
            peerId: peerId,
            iceCandidate: {
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                candidate: event.candidate.candidate,
            },
        });
    };
}

async function handleRTCDataChannels(peerId) {
    peerConnections[peerId].ondatachannel = (event) => {
        console.log('Datachannel event peerId: ' + peerId, event);
        event.channel.onmessage = (msg) => {
            let config = {};
            try {
                config = JSON.parse(filterXSS(msg.data));
                handleIncomingDataChannelMessage(config);
            } catch (err) {
                console.log('Datachannel error', err);
            }
        };
    };
    dataChannels[peerId] = peerConnections[peerId].createDataChannel('mt_c2c_dc');
    dataChannels[peerId].onopen = (event) => {
        console.log('DataChannels created for peerId: ' + peerId, event);
    };
}

function handleOnTrack(peerId, peers) {
    peerConnections[peerId].ontrack = (event) => {
        console.log('Handle on track event', event);
        if (event.track.kind === 'video') {
            setRemoteMedia(event.streams[0], peers, peerId);
        }
    };
}

function handleAddTracks(peerId) {
    localMediaStream.getTracks().forEach((track) => {
        peerConnections[peerId].addTrack(track, localMediaStream);
    });
}

function handleRtcOffer(peerId) {
    peerConnections[peerId].onnegotiationneeded = () => {
        console.log('Creating RTC offer to', peerId);
        peerConnections[peerId]
            .createOffer()
            .then((localDescription) => {
                console.log('Local offer description is', localDescription);
                peerConnections[peerId]
                    .setLocalDescription(localDescription)
                    .then(() => {
                        sendToServer('relaySDP', {
                            peerId: peerId,
                            sessionDescription: localDescription,
                        });
                        console.log('Offer setLocalDescription done!');
                    })
                    .catch((err) => {
                        console.error('[Error] offer setLocalDescription', err);
                    });
            })
            .catch((err) => {
                console.error('[Error] sending offer', err);
            });
    };
}

function handleSessionDescription(config) {
    console.log('Remote Session Description', config);
    const { peerId, sessionDescription } = config;
    const remoteDescription = new RTCSessionDescription(sessionDescription);
    peerConnections[peerId]
        .setRemoteDescription(remoteDescription)
        .then(() => {
            console.log('Set remote description done!');
            if (sessionDescription.type == 'offer') {
                console.log('Creating answer');
                peerConnections[peerId]
                    .createAnswer()
                    .then((localDescription) => {
                        console.log('Answer description is: ', localDescription);
                        peerConnections[peerId]
                            .setLocalDescription(localDescription)
                            .then(() => {
                                sendToServer('relaySDP', {
                                    peerId: peerId,
                                    sessionDescription: localDescription,
                                });
                                console.log('Answer setLocalDescription done!');
                            })
                            .catch((err) => {
                                console.error('[Error] answer setLocalDescription', err);
                            });
                    })
                    .catch((err) => {
                        console.error('[Error] creating answer', err);
                    });
            }
        })
        .catch((err) => {
            console.error('[Error] setRemoteDescription', err);
        });
}

function handleIceCandidate(config) {
    const { peerId, iceCandidate } = config;
    peerConnections[peerId].addIceCandidate(new RTCIceCandidate(iceCandidate)).catch((err) => {
        console.error('[Error] addIceCandidate', err);
    });
}

function handleDisconnect() {
    console.log('Disconnected from signaling server');
    for (let peerId in peerMediaElements) {
        document.body.removeChild(peerMediaElements[peerId].parentNode);
    }
    for (let peerId in peerConnections) {
        peerConnections[peerId].close();
    }
    peerConnections = {};
    peerMediaElements = {};
    dataChannels = {};

    saveLocalStorageConfig();
}

function handleRemovePeer(config) {
    console.log('Signaling server said to remove peer:', config);
    const { peerId } = config;

    if (peerId in peerMediaElements) document.body.removeChild(peerMediaElements[peerId].parentNode);
    if (peerId in peerConnections) peerConnections[peerId].close();

    delete dataChannels[peerId];
    delete peerConnections[peerId];
    delete peerMediaElements[peerId];

    if (!thereIsPeerConnections()) {
        elemDisplay(waitingDivContainer, true);
        elemDisplay(buttonsBar, false);
        elemDisplay(settings, false);
        elemDisplay(chat, false);
    }

    console.log('Peers count: ' + Object.keys(peerConnections).length);
    playSound('leave');
}

function setupLocalMedia(callback, errorBack) {
    if (localMediaStream != null) {
        if (callback) callback();
        return;
    }
    console.log('Requesting access to local audio/video inputs');

    const audioDeviceId = localStorageConfig.audio.devices.select.id || audioSource.value;
    const videoDeviceId = localStorageConfig.video.devices.select.id || videoSource.value;

    const audioConstraints = getAudioConstraints(audioDeviceId);
    const videoConstraints = getVideoConstraints(videoDeviceId);

    navigator.mediaDevices
        .getUserMedia({
            audio: audioConstraints,
            video: videoConstraints,
        })
        .then((stream) => {
            setLocalMedia(stream);
            if (callback) callback();
        })
        .catch((err) => {
            console.error('[Error] access denied for audio/video', err);
            handleMediaError('audio/video', err);
            if (errorBack) errorBack();
        });
}

async function enumerateDevices() {
    await navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
            const videoDevices = devices.filter(
                (device) => device.kind === 'videoinput' && device.deviceId !== 'default',
            );
            const audioDevices = devices.filter(
                (device) => device.kind === 'audioinput' && device.deviceId !== 'default',
            );
            console.log('Devices', {
                audioDevices: audioDevices,
                videoDevices: videoDevices,
            });
            audioDevices.forEach(async (device) => {
                await addChild(audioSource, device);
                LS.DEVICES_COUNT.audio++;
            });
            videoDevices.forEach(async (device) => {
                await addChild(videoSource, device);
                LS.DEVICES_COUNT.video++;
            });
        })
        .catch((err) => {
            playSound('error');
            console.error('[Error] enumerate devices audio/video', err);
            popupMessage('error', 'Enumerate Devices', 'Unable to enumerate devices ' + err);
        });
}

async function addChild(source, device) {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.text = device.label;
    source.appendChild(option);
}

function setLocalMedia(stream) {
    console.log('Access granted to audio/video');
    localMediaStream = stream;
    const myVideoWrap = document.createElement('div');
    const myLocalMedia = document.createElement('video');
    const myVideoHeader = document.createElement('div');
    const myVideoFooter = document.createElement('div');
    const myVideoPeerName = document.createElement('h4');
    const myVideoDraggableBtn = document.createElement('button');
    const myFullScreenBtn = document.createElement('button');
    const myVideoPiPBtn = document.createElement('button');
    const myVideoRotateBtn = document.createElement('button');
    const myAudioStatusIcon = document.createElement('button');
    const myVideoAvatarImage = document.createElement('img');
    myVideoDraggableBtn.id = 'myVideoDraggable';
    myVideoDraggableBtn.className = className.draggable;
    myVideoDraggableBtn.style.cursor = 'move';
    myFullScreenBtn.id = 'myFullScreen';
    myFullScreenBtn.className = className.fullScreenOn;
    myVideoPiPBtn.id = 'myVideoPIP';
    myVideoPiPBtn.className = className.pip;
    myVideoRotateBtn.id = 'myVideoRotate';
    myVideoRotateBtn.className = className.rotate;
    myVideoHeader.id = 'myVideoHeader';
    myVideoHeader.className = 'videoHeader animate__animated animate__fadeInDown animate__faster';
    myVideoFooter.id = 'myVideoFooter';
    myVideoFooter.className = 'videoFooter';
    myVideoPeerName.id = 'myVideoPeerName';
    myVideoPeerName.innerText = peerName + ' (me)';
    myAudioStatusIcon.id = 'myAudioStatusIcon';
    myAudioStatusIcon.className = className.audioOn;
    myVideoAvatarImage.id = 'myVideoAvatarImage';
    myVideoAvatarImage.setAttribute('src', image.camOff);
    myVideoAvatarImage.className = 'videoAvatarImage';
    if (!isMobileDevice) myVideoHeader.appendChild(myVideoDraggableBtn);
    myVideoHeader.appendChild(myFullScreenBtn);
    myVideoHeader.appendChild(myVideoPiPBtn);
    myVideoHeader.appendChild(myVideoRotateBtn);
    myVideoHeader.appendChild(myAudioStatusIcon);
    myVideoFooter.appendChild(myVideoPeerName);
    myLocalMedia.id = 'myVideo';
    myLocalMedia.className = 'mirror';
    myLocalMedia.playsInline = true;
    myLocalMedia.autoplay = true;
    myLocalMedia.muted = true;
    myLocalMedia.volume = 0;
    myLocalMedia.controls = false;
    myLocalMedia.style.objectFit = localStorageConfig.video.settings.aspect_ratio ? 'contain' : 'cover';
    myLocalMedia.poster = image.poster;
    myVideoWrap.id = 'myVideoWrap';
    myVideoWrap.className = 'myVideoWrap';
    myVideoWrap.appendChild(myVideoHeader);
    myVideoWrap.appendChild(myVideoFooter);
    myVideoWrap.appendChild(myVideoAvatarImage);
    myVideoWrap.appendChild(myLocalMedia);
    document.body.appendChild(myVideoWrap);
    logStreamSettingsInfo('localMediaStream', localMediaStream);
    attachMediaStream(myLocalMedia, localMediaStream);
    handlePictureInPicture(myVideoPiPBtn, myLocalMedia);
    handleVideoRotate(myVideoRotateBtn, myLocalMedia);
    handleFullScreen(myFullScreenBtn, myVideoWrap, myLocalMedia);
    setPeerVideoAvatarImgName(myVideoAvatarImage, peerName);
    setTippy(myFullScreenBtn, 'Toggle full screen', 'bottom');
    setTippy(myVideoPiPBtn, 'Toggle picture in picture', 'bottom');
    setTippy(myVideoRotateBtn, 'Rotate video', 'bottom');
    setTippy(myAudioStatusIcon, 'Audio status', 'bottom');
    setTippy(myVideoPeerName, 'Username', 'top');
    startSessionTime();
    if (!isMobileDevice) {
        makeDraggable(myVideoWrap, myVideoDraggableBtn);
    }
}

function setRemoteMedia(stream, peers, peerId) {
    remoteMediaStream = stream;
    const peerName = peers[peerId]['peerName'];
    const peerVideo = peers[peerId]['peerVideo'];
    const peerAudio = peers[peerId]['peerAudio'];
    const peerScreen = peers[peerId]['peerScreen'];
    const remoteVideoWrap = document.createElement('div');
    const remoteMedia = document.createElement('video');
    const remoteVideoHeader = document.createElement('div');
    const remoteVideoFooter = document.createElement('div');
    const remoteVideoPeerName = document.createElement('h4');
    const remoteFullScreenBtn = document.createElement('button');
    const remoteVideoPiPBtn = document.createElement('button');
    const remoteVideoRotateBtn = document.createElement('button');
    const remoteAudioStatusIcon = document.createElement('button');
    const remoteVideoAvatarImage = document.createElement('img');
    remoteVideoHeader.id = peerId + '_remoteVideoHeader';
    remoteVideoHeader.className = 'videoHeader animate__animated animate__fadeInDown animate__faster';
    remoteVideoFooter.id = peerId + '_remoteVideoFooter';
    remoteVideoFooter.className = 'remoteVideoFooter';
    remoteVideoPeerName.id = peerId + '_remotePeerName';
    remoteVideoPeerName.innerText = peerName;
    remoteFullScreenBtn.id = peerId + '_remoteFullScreen';
    remoteFullScreenBtn.className = className.fullScreenOn;
    remoteVideoPiPBtn.id = '_remoteVideoPIP';
    remoteVideoPiPBtn.className = className.pip;
    remoteVideoRotateBtn.id = '_remoteVideoRotate';
    remoteVideoRotateBtn.className = className.rotate;
    remoteAudioStatusIcon.id = peerId + '_remoteAudioStatus';
    remoteAudioStatusIcon.className = className.audioOn;
    remoteVideoAvatarImage.id = peerId + '_remoteVideoAvatar';
    remoteVideoAvatarImage.src = image.camOff;
    remoteVideoAvatarImage.className = 'videoAvatarImage';
    remoteVideoHeader.appendChild(remoteFullScreenBtn);
    remoteVideoHeader.appendChild(remoteVideoPiPBtn);
    remoteVideoHeader.appendChild(remoteVideoRotateBtn);
    remoteVideoHeader.appendChild(remoteAudioStatusIcon);
    remoteVideoFooter.appendChild(remoteVideoPeerName);
    remoteMedia.id = peerId + '_remoteVideo';
    remoteMedia.playsInline = true;
    remoteMedia.autoplay = true;
    remoteMedia.controls = false;
    remoteMedia.style.objectFit = localStorageConfig.video.settings.aspect_ratio ? 'contain' : 'cover';
    remoteMedia.poster = image.poster;
    peerMediaElements[peerId] = remoteMedia;
    remoteVideoWrap.id = peerId + '_remoteVideoWrap';
    remoteVideoWrap.className = 'remoteVideoWrap';
    remoteVideoWrap.appendChild(remoteVideoHeader);
    remoteVideoWrap.appendChild(remoteVideoFooter);
    remoteVideoWrap.appendChild(remoteVideoAvatarImage);
    remoteVideoWrap.appendChild(remoteMedia);
    document.body.appendChild(remoteVideoWrap);
    attachMediaStream(remoteMedia, remoteMediaStream);
    handleFullScreen(remoteFullScreenBtn, remoteVideoWrap, remoteMedia);
    handlePictureInPicture(remoteVideoPiPBtn, remoteMedia);
    handleVideoRotate(remoteVideoRotateBtn, remoteMedia);
    handleVideoZoom(remoteMedia, remoteVideoWrap, remoteVideoAvatarImage);
    setPeerVideoStatus(peerId, peerVideo);
    setPeerAudioStatus(peerId, peerAudio);
    setPeerVideoAvatarImgName(remoteVideoAvatarImage, peerName);
    if (peerVideo && peerScreen) setPeerScreenStatus(peerId, peerScreen);
    setTippy(remoteFullScreenBtn, 'Toggle full screen', 'bottom');
    setTippy(remoteVideoPiPBtn, 'Toggle picture in picture', 'bottom');
    setTippy(remoteVideoRotateBtn, 'Rotate video', 'bottom');
    setTippy(remoteAudioStatusIcon, 'Audio status', 'bottom');
    setTippy(remoteVideoPeerName, 'Username', 'top');
}

function handleIncomingDataChannelMessage(config) {
    switch (config.type) {
        case 'chat':
            handleMessage(config);
            break;
        default:
            break;
    }
}

function handleEvents() {
    initLeaveBtn.onclick = () => {
        endCall();
    };
    copyRoomBtn.onclick = () => {
        copyRoom();
    };
    if (navigator.share) {
        shareRoomBtn.onclick = () => {
            shareRoom();
        };
    } else {
        elemDisplay(shareRoomBtn, false);
    }
    initHideMeBtn.onclick = () => {
        toggleHideMe();
    };
    initAudioBtn.onclick = (e) => {
        setAudioStatus(!localMediaStream.getAudioTracks()[0].enabled, e);
    };
    initVideoBtn.onclick = (e) => {
        setVideoStatus(!localMediaStream.getVideoTracks()[0].enabled, e);
    };
    initSettingsBtn.onclick = () => {
        settingsBtn.click();
    };
    hideMeBtn.onclick = () => {
        toggleHideMe();
    };
    audioBtn.onclick = (e) => {
        setAudioStatus(!localMediaStream.getAudioTracks()[0].enabled, e);
    };
    videoBtn.onclick = (e) => {
        setVideoStatus(!localMediaStream.getVideoTracks()[0].enabled, e);
    };
    if (!isMobileDevice && (navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia)) {
        initScreenShareBtn.onclick = async () => {
            await toggleScreenSharing();
        };
        screenShareBtn.onclick = async () => {
            await toggleScreenSharing();
        };
    } else {
        elemDisplay(initScreenShareBtn, false);
        elemDisplay(screenShareBtn, false);
    }
    navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInput = devices.filter((device) => device.kind === 'videoinput');
        if (videoInput.length > 1 && isMobileDevice) {
            swapCameraBtn.onclick = () => {
                swapCamera();
            };
        } else {
            elemDisplay(swapCameraBtn, false);
        }
    });
    recordingBtn.onclick = () => {
        toggleRecording();
    };
    settingsBtn.onclick = () => {
        toggleSettings();
    };
    settingsCloseBtn.onclick = () => {
        toggleSettings();
    };
    audioSource.onchange = (e) => {
        setLocalStorageAudioConfig(e.target);
        saveLocalStorageConfig();
        changeMicrophone(e.target.value);
    };
    videoSource.onchange = (e) => {
        resetVideoConstraints();
        setLocalStorageCameraConfig(e.target);
        saveLocalStorageConfig();
        changeCamera(e.target.value);
    };
    videoQualitySelect.onchange = (e) => {
        refreshVideoConstraints();
    };
    if (isFirefox) {
        elemDisplay(videoFpsDiv, false);
    }
    videoFpsSelect.onchange = (e) => {
        refreshVideoConstraints();
    };
    //switchMaxVideoQuality.checked = localStorageConfig.video.settings.best_quality;
    switchMaxVideoQuality.onchange = (e) => {
        localStorageConfig.video.settings.best_quality = e.currentTarget.checked;
        saveLocalStorageConfig();
        refreshVideoConstraints();
        if (localStorageConfig.video.settings.best_quality) {
            popupMessage(
                'toast',
                'Max video quality and fps',
                'If Active, The video resolution will be forced up to 8k and 60fps! (Very High bandwidth is required)',
                'top',
                6000,
            );
        }
        playSound('switch');
    };
    //switchKeepAspectRatio.checked = localStorageConfig.video.settings.aspect_ratio;
    switchKeepAspectRatio.onchange = (e) => {
        localStorageConfig.video.settings.aspect_ratio = e.currentTarget.checked;
        saveLocalStorageConfig();
        changeAspectRatio(localStorageConfig.video.settings.aspect_ratio);
        playSound('switch');
    };
    if (isMobileDevice) {
        elemDisplay(maxVideoQualityDiv, false);
        elemDisplay(pushToTalkDiv, false);
    } else {
        switchPushToTalk.onchange = (e) => {
            isPushToTalkActive = e.currentTarget.checked;
            if (isPushToTalkActive) {
                popupMessage(
                    'toast',
                    'Push to talk',
                    'If Active, When SpaceBar keydown the microphone will be activated, otherwise will be deactivated, like a walkie-talkie.',
                    'top',
                    6000,
                );
            }
            playSound('switch');
        };
        document.onkeydown = (e) => {
            if (!isPushToTalkActive) return;
            if (e.code === 'Space') {
                if (isSpaceDown) return;
                setAudioStatus(true, audioBtn.event);
                isSpaceDown = true;
                console.log('Push-to-talk: audio ON');
            }
        };
        document.onkeyup = (e) => {
            e.preventDefault();
            if (!isPushToTalkActive) return;
            if (e.code === 'Space') {
                setAudioStatus(false, audioBtn.event);
                isSpaceDown = false;
                console.log('Push-to-talk: audio OFF');
            }
        };
    }
    chatOpenBtn.onclick = () => {
        toggleChat();
    };
    chatSaveBtn.onclick = () => {
        saveChat();
    };
    chatCleanBtn.onclick = () => {
        cleanChat();
    };
    chatCloseBtn.onclick = () => {
        toggleChat();
    };
    chatEmojiBtn.onclick = () => {
        toggleChatEmoji();
    };
    chatSendBtn.onclick = () => {
        sendMessage();
    };
    chatInput.onkeydown = (e) => {
        if (e.code === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatSendBtn.click();
        }
    };
    chatInput.oninput = function () {
        for (let i in chatInputEmoji) {
            let regex = new RegExp(i.replace(/([()[{*+.$^\\|?])/g, '\\$1'), 'gim');
            this.value = this.value.replace(regex, chatInputEmoji[i]);
        }
        checkLineBreaks();
    };
    leaveBtn.onclick = () => {
        endCall();
    };
}

function showWaitingUser() {
    elemDisplay(loadingDivContainer, false);
    elemDisplay(waitingDivContainer, true);
}

function toggleHideMe() {
    const isVideoWrapHidden = myVideoWrap.style.display == 'none';
    hideMeBtn.className = isVideoWrapHidden ? className.user : className.userOff;
    initHideMeBtn.className = isVideoWrapHidden ? className.user : className.userOff;
    if (isVideoWrapHidden) {
        elemDisplay(myVideoWrap, true);
        animateCSS(myVideoWrap, 'fadeInLeft');
    } else {
        animateCSS(myVideoWrap, 'fadeOutLeft').then((msg) => {
            elemDisplay(myVideoWrap, false);
        });
    }
    localStorageConfig.video.init.hide = !isVideoWrapHidden;
    saveLocalStorageConfig();
}

function toggleSettings() {
    if (settings.style.display == 'none' || settings.style.display == '') {
        elemDisplay(chat, false);
        elemDisplay(settings, true);
        animateCSS(settings, 'fadeInRight');
    } else {
        animateCSS(settings, 'fadeOutRight').then((ok) => {
            elemDisplay(settings, false);
        });
    }
}

function swapCamera() {
    camera = camera == 'user' ? 'environment' : 'user';
    const camVideo = camera == 'user' ? true : { facingMode: { exact: camera } };
    navigator.mediaDevices
        .getUserMedia({ video: camVideo })
        .then((camStream) => {
            localMediaStream.getVideoTracks()[0].stop();
            refreshMyLocalVideoStream(camStream);
            refreshMyVideoStreamToPeers(camStream);
            setVideoStatus(true);
            if (!isCamMirrored) {
                myVideo.classList.toggle('mirror');
                isCamMirrored = true;
            }
        })
        .catch((err) => {
            console.error('[Error] to swapping camera', err);
            popupMessage('error', 'Swap camera', 'Error to swapping the camera ' + err);
        });
}

async function toggleScreenSharing() {
    const constraints = {
        audio: true,
        video: true,
    };
    let screenMediaPromise = null;
    try {
        if (!isScreenStreaming) {
            isMyAudioActiveBefore = localMediaStream.getAudioTracks()[0].enabled;
            isMyVideoActiveBefore = localMediaStream.getVideoTracks()[0].enabled;
            console.log('My audio/video status before screen sharing ', {
                isMyAudioActiveBefore,
                isMyVideoActiveBefore,
            });
        }
        screenMediaPromise = isScreenStreaming
            ? await navigator.mediaDevices.getUserMedia(constraints)
            : await navigator.mediaDevices.getDisplayMedia(constraints);
        if (screenMediaPromise) {
            localMediaStream.getVideoTracks()[0].stop();
            isScreenStreaming = !isScreenStreaming;
            refreshMyAndPeersAudioVideoStream(screenMediaPromise);
            setAudioStatus(isScreenStreaming);
            setVideoStatus(isScreenStreaming);
            setScreenStatus(isScreenStreaming);
            myVideo.classList.toggle('mirror');
            myVideo.style.objectFit =
                isScreenStreaming || localStorageConfig.video.settings.aspect_ratio ? 'contain' : 'cover';
            initScreenShareBtn.className = isScreenStreaming ? className.screenOff : className.screenOn;
            screenShareBtn.className = isScreenStreaming ? className.screenOff : className.screenOn;
            if (!isScreenStreaming) {
                if (isMyAudioActiveBefore) setAudioStatus(true);
                if (isMyVideoActiveBefore) setVideoStatus(true);
            }
        }
    } catch (err) {
        console.error('[Error] unable to share the screen', err);
        popupMessage('error', 'Screen sharing', 'Unable to share the screen ' + err);
    }
}

function changeCamera(deviceId = false) {
    const videoConstraints = getVideoConstraints(deviceId);

    navigator.mediaDevices
        .getUserMedia({
            video: videoConstraints,
        })
        .then((camStream) => {
            localMediaStream.getVideoTracks()[0].stop();
            refreshMyLocalVideoStream(camStream);
            refreshMyVideoStreamToPeers(camStream);
            setVideoStatus(true);
        })
        .catch((err) => {
            console.error('[Error] changeCamera', err);
            popupMessage('error', 'Change camera', 'Error while swapping camera' + err);
        });
}

function changeMicrophone(deviceId = false) {
    const audioConstraints = getAudioConstraints(deviceId);

    navigator.mediaDevices
        .getUserMedia({ audio: audioConstraints })
        .then((micStream) => {
            localMediaStream.getAudioTracks()[0].stop();
            refreshMyLocalAudioStream(micStream);
            refreshMyLocalAudioStreamToPeers(micStream);
            setAudioStatus(true);
        })
        .catch((err) => {
            console.error('[Error] changeMicrophone', err);
            popupMessage('error', 'Change microphone', 'Error while swapping microphone' + err);
        });
}

function getAudioConstraints(deviceId = false) {
    let audioConstraints = true;
    if (deviceId) audioConstraints = { deviceId: deviceId };
    console.log('Audio constraints', audioConstraints);
    return audioConstraints;
}

function getVideoConstraints(deviceId = false) {
    let videoConstraints = true;

    elemDisable(videoQualitySelect, localStorageConfig.video.settings.best_quality);
    elemDisable(videoFpsSelect, localStorageConfig.video.settings.best_quality);

    if (localStorageConfig.video.settings.best_quality) {
        resetVideoConstraints();
        videoConstraints = {
            width: { ideal: 7680 },
            height: { ideal: 4320 },
            frameRate: { ideal: 60 },
        };
    } else {
        const videoQuality = videoQualitySelect.value;
        const videoFrameRate = videoFpsSelect.value === 'default' ? 30 : parseInt(videoFpsSelect.value, 10);

        const qualityMap = {
            default: { width: { ideal: 1280 }, height: { ideal: 720 } },
            qvga: { width: { exact: 320 }, height: { exact: 240 } },
            vga: { width: { exact: 640 }, height: { exact: 480 } },
            hd: { width: { exact: 1280 }, height: { exact: 720 } },
            fhd: { width: { exact: 1920 }, height: { exact: 1080 } },
            '2k': { width: { exact: 2560 }, height: { exact: 1440 } },
            '4k': { width: { exact: 3840 }, height: { exact: 2160 } },
            '6k': { width: { exact: 6144 }, height: { exact: 3456 } },
            '8k': { width: { exact: 7680 }, height: { exact: 4320 } },
        };

        videoConstraints = qualityMap[videoQuality] || true;

        if (videoQuality === 'default') {
            videoFpsSelect.disabled = true;
            videoFpsSelect.selectedIndex = 0;
        } else if (videoConstraints !== true) {
            videoConstraints.frameRate = videoFrameRate;
            videoFpsSelect.disabled = false;
        }
    }

    if (deviceId) {
        videoConstraints = {
            ...videoConstraints,
            deviceId,
        };
    }

    if (isFirefox) {
        delete videoConstraints.frameRate;
    }

    console.log('Video constraints', videoConstraints);
    return videoConstraints;
}

function setLocalStorageCameraConfig(target) {
    localStorageConfig.video.devices.select.index = target.selectedIndex;
    localStorageConfig.video.devices.select.label = target.options[target.selectedIndex].text;
    localStorageConfig.video.devices.select.id = target.value;
}

function setLocalStorageAudioConfig(target) {
    localStorageConfig.audio.devices.select.index = target.selectedIndex;
    localStorageConfig.audio.devices.select.label = target.options[target.selectedIndex].text;
    localStorageConfig.audio.devices.select.id = target.value;
}

function saveLocalStorageConfig() {
    localStorageConfig.video.devices.count = LS.DEVICES_COUNT.video;
    localStorageConfig.audio.devices.count = LS.DEVICES_COUNT.audio;
    LS.setConfig(localStorageConfig);
}

function loadLocalStorageConfig() {
    videoSource.selectedIndex = localStorageConfig.video.devices.select.index;
    videoQualitySelect.selectedIndex = localStorageConfig.video.settings.quality_index;
    videoFpsSelect.selectedIndex = localStorageConfig.video.settings.fps_index;
    audioSource.selectedIndex = localStorageConfig.audio.devices.select.index;
    switchMaxVideoQuality.checked = localStorageConfig.video.settings.best_quality;
    switchKeepAspectRatio.checked = localStorageConfig.video.settings.aspect_ratio;
    if (localStorageConfig.video.init.hide) initHideMeBtn.click();
    if (!localStorageConfig.video.init.active) initVideoBtn.click();
    if (!localStorageConfig.audio.init.active) initAudioBtn.click();
    if (
        !localStorageConfig.video.settings.best_quality &&
        (localStorageConfig.video.settings.quality_index || localStorageConfig.video.settings.fps_index) !== 0
    ) {
        refreshVideoConstraints();
    }
}

function endCall() {
    saveLocalStorageConfig();
    signalingSocket.disconnect();
    if (surveyURL) {
        giveMeFeedback();
    } else {
        redirectOnLeave();
    }
}

function giveMeFeedback() {
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        showDenyButton: true,
        background: swal.background,
        imageUrl: image.feedback,
        title: 'Leave a feedback',
        text: 'Do you want to rate your MiroTalk experience?',
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) {
            redirectToSurvey();
        } else {
            redirectOnLeave();
        }
    });
}

function redirectToSurvey() {
    surveyURL ? openURL(surveyURL) : openURL('/');
}

function redirectOnLeave() {
    redirectURL ? openURL(redirectURL) : openURL('/');
}

function attachMediaStream(element, stream) {
    element.srcObject = stream;
    console.log('Success, media stream attached');
}

function setAudioStatus(active = true, e = false) {
    console.log(`This PeerId ${thisPeerId} audio status`, active);
    isAudioStreaming = active;
    setAudioButtons(active, e);
    emitPeerStatus('audio', active);
    localStorageConfig.audio.init.active = active;
    saveLocalStorageConfig();
}

function setVideoStatus(active = true, e = false) {
    console.log(`This PeerId ${thisPeerId} video status`, active);
    isVideoStreaming = active;
    setVideoButtons(active, e);
    emitPeerStatus('video', active);
    localStorageConfig.video.init.active = active;
    saveLocalStorageConfig();
}

function setScreenStatus(active = false, e = false) {
    console.log(`This PeerId ${thisPeerId} screen status`, active);
    isScreenStreaming = active;
    setVideoButtons(active, e);
    emitPeerStatus('screen', active);
}

function setAudioButtons(active, e = false) {
    localMediaStream.getAudioTracks()[0].enabled = active;
    if (e) e.target.className = active ? className.audioOn : className.audioOff;
    myAudioStatusIcon.className = active ? className.audioOn : className.audioOff;
    audioBtn.className = active ? className.audioOn : className.audioOff;
    initAudioBtn.className = active ? className.audioOn : className.audioOff;
}

function setVideoButtons(active, e = false) {
    localMediaStream.getVideoTracks()[0].enabled = active;
    if (e) e.target.className = active ? className.videoOn : className.videoOff;
    videoBtn.className = active ? className.videoOn : className.videoOff;
    initVideoBtn.className = active ? className.videoOn : className.videoOff;
    elemDisplay(myVideoAvatarImage, active ? false : true);
}

function resetVideoConstraints() {
    videoQualitySelect.selectedIndex = 0;
    videoFpsSelect.selectedIndex = 0;
    localStorageConfig.video.settings.quality_index = 0;
    localStorageConfig.video.settings.fps_index = 0;
    saveLocalStorageConfig();
}

function refreshVideoConstraints() {
    localMediaStream
        .getVideoTracks()[0]
        .applyConstraints(getVideoConstraints(videoSource.value))
        .then(() => {
            logStreamSettingsInfo('refreshVideoConstraints', localMediaStream);
            refreshMyVideoStreamToPeers(localMediaStream);
            videoQualitySelectedIndex = videoQualitySelect.selectedIndex;
            videoFpsSelectedIndex = videoFpsSelect.selectedIndex;
            localStorageConfig.video.settings.quality_index = videoQualitySelectedIndex;
            localStorageConfig.video.settings.fps_index = videoFpsSelectedIndex;
            saveLocalStorageConfig();
        })
        .catch((err) => {
            videoQualitySelect.selectedIndex = videoQualitySelectedIndex;
            videoFpsSelect.selectedIndex = videoFpsSelectedIndex;
            localStorageConfig.video.settings.quality_index = videoQualitySelectedIndex;
            localStorageConfig.video.settings.fps_index = videoFpsSelectedIndex;
            saveLocalStorageConfig();
            console.error('refreshVideoConstraints', err);
            popupMessage(
                'warning',
                'Video quality/fps',
                "Your device doesn't support the selected video quality and fps, please select the another one.",
            );
        });
}

function refreshMyLocalVideoStream(stream) {
    stream.getVideoTracks()[0].enabled = true;
    const newStream = new MediaStream([stream.getVideoTracks()[0], localMediaStream.getAudioTracks()[0]]);
    localMediaStream = newStream;
    attachMediaStream(myVideo, localMediaStream);
    logStreamSettingsInfo('refreshMyLocalVideoStream', localMediaStream);
}

function refreshMyVideoStreamToPeers(stream) {
    if (!thereIsPeerConnections()) return;
    for (let peerId in peerConnections) {
        let videoSender = peerConnections[peerId]
            .getSenders()
            .find((s) => (s.track ? s.track.kind === 'video' : false));
        if (videoSender) videoSender.replaceTrack(stream.getVideoTracks()[0]);
    }
}

function refreshMyLocalAudioStream(stream) {
    stream.getAudioTracks()[0].enabled = true;
    const newStream = new MediaStream([localMediaStream.getVideoTracks()[0], stream.getAudioTracks()[0]]);
    localMediaStream = newStream;
    attachMediaStream(myVideo, localMediaStream);
    logStreamSettingsInfo('refreshMyLocalAudioStream', localMediaStream);
}

function refreshMyLocalAudioStreamToPeers(stream) {
    if (!thereIsPeerConnections()) return;
    for (let peerId in peerConnections) {
        let audioSender = peerConnections[peerId]
            .getSenders()
            .find((s) => (s.track ? s.track.kind === 'audio' : false));
        if (audioSender) audioSender.replaceTrack(stream.getAudioTracks()[0]);
    }
}

function refreshMyAndPeersAudioVideoStream(stream) {
    const videoTrack = getEnabledTrack(stream, 'video');
    const audioTabTrack = getEnabledTrack(stream, 'audio');
    const audioTrack = getEnabledTrack(localMediaStream, 'audio');

    refreshTrackState(videoTrack);
    refreshTrackState(audioTabTrack);
    refreshTrackState(audioTrack);

    const tracksToInclude = [videoTrack, audioTabTrack, audioTrack].filter((track) => track !== null);

    const newStream = new MediaStream(tracksToInclude);
    localMediaStream = newStream;

    attachMediaStream(myVideo, localMediaStream);
    refreshMyVideoStreamToPeers(localMediaStream);
    refreshMyLocalAudioStreamToPeers(localMediaStream);
    logStreamSettingsInfo('refreshMyAndPeersAudioVideoStream', localMediaStream);
}

function handlePictureInPicture(pipBtn, videoMedia) {
    if (isVideoPIPSupported) {
        pipBtn.onclick = () => {
            if (videoMedia.pictureInPictureElement) {
                videoMedia.exitPictureInPicture().catch((error) => {
                    console.error('Failed to exit Picture-in-Picture mode:', error);
                });
            } else if (!videoMedia.disablePictureInPicture && document.pictureInPictureEnabled) {
                videoMedia.requestPictureInPicture().catch((error) => {
                    console.error('Failed to enter Picture-in-Picture mode:', error);
                    popupMessage('warning', 'PIP', error.message);
                    elemDisplay(pipBtn, false);
                });
            }
        };
        if (videoMedia) {
            videoMedia.addEventListener('leavepictureinpicture', (event) => {
                console.log('Exited PiP mode');
                if (videoMedia.paused) {
                    videoMedia.play().catch((error) => {
                        console.error('Error playing video after exit PIP mode:', error);
                    });
                }
            });
        }
    } else {
        elemDisplay(pipBtn, false);
    }
}

function handleVideoRotate(rotateBtn, videoMedia) {
    let currentRotation = 0;
    rotateBtn.onclick = () => {
        currentRotation += 90;
        videoMedia.style.transform = `rotate(${currentRotation}deg)`;
    };
}

function handleFullScreen(fullScreenBtn, videoWrap, videoMedia) {
    if (!isFullScreenSupported()) {
        return elemDisplay(fullScreenBtn, false);
    }

    fullScreenBtn.onclick = () => {
        if (isFullScreen()) {
            goOutFullscreen();
            fullScreenBtn.className = className.fullScreenOn;
        } else {
            goInFullscreen(videoWrap);
            fullScreenBtn.className = className.fullScreenOff;
        }
    };
    videoMedia.onclick = () => {
        if (isDesktopDevice) fullScreenBtn.click();
    };
}

function handleVideoZoom(videoMedia, videoWrap, videoAvatarImage) {
    const zoom_center_mode = false;
    const zoom_in_factor = 1.1;
    const zoom_out_factor = 0.9;
    const max_zoom = 15;
    const min_zoom = 1;

    let zoom = 1;

    if (!isMobileDevice) {
        if (zoom_center_mode) {
            videoMedia.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (isVideoOf()) return;
                const delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;
                const zoomDirection = e.deltaY > 0 ? 'zoom-out' : 'zoom-in';
                delta > 0 ? (zoom *= 1.2) : (zoom /= 1.2);
                zoom = Math.max(min_zoom, Math.min(max_zoom, zoom));
                videoMedia.style.transform = `scale(${zoom})`;
                videoMedia.style.cursor = zoom === 1 ? 'pointer' : zoomDirection;
            });
        } else {
            videoMedia.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (isVideoOf()) return;
                const rect = videoWrap.getBoundingClientRect();
                const cursorX = e.clientX - rect.left;
                const cursorY = e.clientY - rect.top;
                const zoomDirection = e.deltaY > 0 ? 'zoom-out' : 'zoom-in';
                const scaleFactor = zoomDirection === 'zoom-out' ? zoom_out_factor : zoom_in_factor;
                zoom *= scaleFactor;
                zoom = Math.max(min_zoom, Math.min(max_zoom, zoom));
                videoMedia.style.transformOrigin = `${cursorX}px ${cursorY}px`;
                videoMedia.style.transform = `scale(${zoom})`;
                videoMedia.style.cursor = zoom === 1 ? 'pointer' : zoomDirection;
            });
            videoWrap.addEventListener('mouseleave', () => {
                videoMedia.style.cursor = 'pointer';
            });
            videoMedia.addEventListener('mouseleave', () => {
                videoMedia.style.cursor = 'pointer';
            });
        }
    }
    function isVideoOf() {
        return videoAvatarImage.style.display == 'block';
    }
}

function resetVideoZoom() {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((video) => {
        video.style.transform = '';
        video.style.transformOrigin = 'center';
    });
}

function handleVideoWrapSize() {
    if (isMobileDevice && !isTabletDevice && !isIPadDevice) {
        document.documentElement.style.setProperty('--my-video-wrap-width', '130px');
        document.documentElement.style.setProperty('--my-video-wrap-height', '205px'); // Safari
    }
}

function toggleChat() {
    if (chat.style.display == 'none' || chat.style.display == '') {
        elemDisplay(chat, true);
        animateCSS(chat, 'fadeInRight');
    } else {
        animateCSS(chat, 'fadeOutRight').then((ok) => {
            elemDisplay(chat, false);
        });
    }
}

function saveChat() {
    if (chatMessages.length === 0) {
        return popupMessage('toast', 'Chat', 'No chat messages to save', 'top-end');
    }
    let a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(chatMessages, null, 1));
    a.download = getDataTimeString() + '-chat.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playSound('download');
}

function cleanChat() {
    if (chatMessages.length === 0) {
        return popupMessage('toast', 'Chat', 'No chat messages to delete', 'top-end');
    }
    Swal.fire({
        position: 'top',
        title: 'Chat',
        text: 'Clean up chat messages?',
        showDenyButton: true,
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) {
            const chatBodyMessages = chatBody.firstChild;
            while (chatBody.firstChild) {
                chatBody.removeChild(chatBody.firstChild);
            }
            chatMessages = [];
            playSound('delete');
        }
    });
}

function toggleChatEmoji() {
    chatEmoji.classList.toggle('show');
}

function handleChatEmojiPicker() {
    const pickerOptions = {
        theme: 'dark',
        perLine: 8,
        onEmojiSelect: addEmojiToMsg,
    };
    const emojiPicker = new EmojiMart.Picker(pickerOptions);
    chatEmoji.appendChild(emojiPicker);

    function addEmojiToMsg(data) {
        chatInput.value += data.native;
        toggleChatEmoji();
    }
}

function sendMessage() {
    console.log(typeof chatInput.value);
    if (!chatInput.value) return;
    chatInput.value = filterXSS(chatInput.value);
    emitDcMsg(chatInput.value);
    chatInput.value = '';
    checkLineBreaks();
}

function emitDcMsg(msg) {
    if (msg) {
        console.log('Send msg: ' + msg);
        appendMessage(peerName, msg);
        Object.keys(dataChannels).map((peerId) =>
            dataChannels[peerId].send(
                JSON.stringify({
                    type: 'chat',
                    roomId: roomId,
                    peerName: peerName,
                    msg: msg,
                }),
            ),
        );
    }
}

function appendMessage(name, msg) {
    const div = document.createElement('div');
    const span = document.createElement('span');
    const p = document.createElement('pre');
    const messageClass = name === peerName ? 'sent' : 'received';
    div.className = `msg ${messageClass}`;
    span.className = 'from';
    span.innerText = name;
    p.className = 'text';
    p.innerHTML = processMessage(msg);
    div.appendChild(span);
    div.appendChild(p);
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    chatMessages.push({
        from: name,
        message: msg,
    });
    hljs.highlightAll();
}

function processMessage(message) {
    const codeBlockRegex = /```([a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
    let parts = [];
    let lastIndex = 0;

    message.replace(codeBlockRegex, (match, lang, code, offset) => {
        if (offset > lastIndex) {
            parts.push({ type: 'text', value: message.slice(lastIndex, offset) });
        }
        parts.push({ type: 'code', lang, value: code });
        lastIndex = offset + match.length;
    });

    if (lastIndex < message.length) {
        parts.push({ type: 'text', value: message.slice(lastIndex) });
    }

    return parts
        .map((part) => {
            if (part.type === 'text') {
                return part.value;
            } else if (part.type === 'code') {
                return `<pre><code class="language-${part.lang || ''}">${part.value}</code></pre>`;
            }
        })
        .join('');
}

function handleMessage(config) {
    playSound('message');
    const name = filterXSS(config.peerName);
    const msg = filterXSS(config.msg);
    console.log('Receive msg: ' + msg);
    if (chat.style.display == 'none' || chat.style.display == '') {
        elemDisplay(chat, true);
        animateCSS(chat, 'fadeInRight');
    }
    appendMessage(name, msg);
}

function checkLineBreaks() {
    chatInput.style.height = '';
    if (getLineBreaks(chatInput.value) > 0 || chatInput.value.length > 50) {
        chatInput.style.height = '150px';
    }
}

function emitPeerStatus(element, active) {
    sendToServer('peerStatus', {
        roomId: roomId,
        peerName: peerName,
        element: element,
        active: active,
    });
}

function handlePeerStatus(config) {
    const { element, peerId, active } = config;
    switch (element) {
        case 'video':
            setPeerVideoStatus(peerId, active);
            break;
        case 'audio':
            setPeerAudioStatus(peerId, active);
            break;
        case 'screen':
            setPeerScreenStatus(peerId, active);
            break;
        default:
            break;
    }
}

function setPeerVideoStatus(peerId, active) {
    console.log(`Remote PeerId ${peerId} video status`, active);
    const peerVideoAvatarImage = document.getElementById(peerId + '_remoteVideoAvatar');
    elemDisplay(peerVideoAvatarImage, active ? false : true);
}

function setPeerAudioStatus(peerId, active) {
    console.log(`Remote PeerId ${peerId} audio status`, active);
    const peerAudioStatus = document.getElementById(peerId + '_remoteAudioStatus');
    if (peerAudioStatus) peerAudioStatus.className = active ? className.audioOn : className.audioOff;
}

function setPeerScreenStatus(peerId, active) {
    console.log(`Remote PeerId ${peerId} screen status`, active);
    const peerVideo = document.getElementById(peerId + '_remoteVideo');
    const peerVideoAvatarImage = document.getElementById(peerId + '_remoteVideoAvatar');
    peerVideo.style.objectFit = active ? 'contain' : 'cover';
    elemDisplay(peerVideoAvatarImage, active ? false : true);
}

// =====================================================
// Handle recording
// =====================================================

function toggleRecording() {
    recording && recording.isStreamRecording() ? stopRecording() : startRecording();
}

function startRecording() {
    if (!isVideoStreaming && !isAudioStreaming) {
        return popupMessage('toast', 'Video', "There isn't a video/audio stream to recording", 'top');
    } else {
        recording = new Recording(
            myVideo.srcObject,
            recordingLabel,
            recordingTime,
            recordingBtn,
            audioSource,
            audioSource,
        );
        recording.start();
    }
}

function stopRecording() {
    recording.stop();
}

function saveRecording() {
    if (recording && recording.isStreamRecording()) stopRecording();
}

function startRecordingTimer() {
    let recElapsedTime = 0;
    recordingTimer = setInterval(function printTime() {
        if (recording.isStreamRecording()) {
            recElapsedTime++;
            recordingTime.innerText = secondsToHms(recElapsedTime);
        }
    }, 1000);
}

function stopRecordingTimer() {
    clearInterval(recordingTimer);
}

// =====================================================
// Handle window
// =====================================================

window.addEventListener(
    'load',
    function (event) {
        resetVideoZoom();
        window.onresize = resetVideoZoom;
    },
    false,
);

window.onbeforeunload = confirmExit;
function confirmExit(e) {
    console.log('onbeforeunload', e);
    saveLocalStorageConfig();
    saveRecording();
}
