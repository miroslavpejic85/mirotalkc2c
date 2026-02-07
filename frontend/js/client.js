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
 * @version 1.2.70
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
const initChatOpenBtn = document.getElementById('initChatOpenBtn');
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
const switchNoiseSuppression = document.getElementById('switchNoiseSuppression');
const switchMaxVideoQuality = document.getElementById('switchMaxVideoQuality');
const switchKeepAspectRatio = document.getElementById('switchKeepAspectRatio');
const switchPushToTalk = document.getElementById('switchPushToTalk');
const sessionTime = document.getElementById('sessionTime');
const chat = document.getElementById('chat');
const chatOpenBtn = document.getElementById('chatOpenBtn');
const chatBody = document.getElementById('chatBody');
const chatEmptyNotice = document.getElementById('chatEmptyNotice');
const chatSaveBtn = document.getElementById('chatSaveBtn');
const chatCleanBtn = document.getElementById('chatCleanBtn');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const chatInput = document.getElementById('chatInput');
const chatEmojiBtn = document.getElementById('chatEmojiBtn');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatFileBtn = document.getElementById('chatFileBtn');
const chatFileInput = document.getElementById('chatFileInput');
const chatEmoji = document.getElementById('chatEmoji');
const recordingLabel = document.getElementById('recordingLabel');
const recordingBtn = document.getElementById('recordingBtn');
const recordingTime = document.getElementById('recordingTime');

let chatMessages = []; // collect chat messages to save it later

const roomURL = window.location.origin + '/?room=' + roomId;

const LS = new LocalStorage();

const localStorageConfig = LS.getConfig();

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
    screenOff: 'fas fa-stop-circle orange',
    draggable: 'fas fa-up-down-left-right',
    fullScreenOn: 'fas fa-expand',
    fullScreenOff: 'fas fa-compress',
    pip: 'fas fa-images',
    focus: 'fas fa-eye',
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
const isSafari = browserName.toLowerCase().includes('safari');

let isVideoStreaming = false;
let isAudioStreaming = false;
let isScreenStreaming = false;
let isPushToTalkActive = false;
let isSpaceDown = false;
let isMyAudioActiveBefore = false;
let isMyVideoActiveBefore = false;
let isChatPasteTxt = false;
let noiseProcessor = null;
let localMediaStream = null;
let remoteMediaStream = null;
let camera = 'user';
let thisPeerId;
let signalingSocket;
let recording = null;
let audioRecorder = null;
let recordingTimer = null;
let roomPeersCount = 0;
let peersInfo = {};
let peerDevice = {};
let peerConnections = {};
let peerMediaElements = {};
let dataChannels = {};

let incomingFileMeta = null;
let incomingFileBuffer = [];
let incomingFileReceived = 0;

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
    { element: initChatOpenBtn, text: 'Toggle chat', position: 'top' },
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

function thereIsPeerConnections() {
    if (Object.keys(peerConnections).length === 0) return false;
    return true;
}

document.addEventListener('DOMContentLoaded', function () {
    initClient();
    handleChatEmojiPicker();
    handleChatFileSharing();
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
            handleCameraMirror(window.myVideo, camera);
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

    peersInfo = peers;

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
    handleOnTrack(peerId);
    handleAddTracks(peerId);

    if (shouldCreateOffer) {
        handleRtcOffer(peerId);
    }

    if (thereIsPeerConnections()) {
        elemDisplay(waitingDivContainer, false);
    }
    handleBodyEvents();

    if (chatInput.value !== '') {
        setTimeout(() => {
            sendMessage();
            toggleChat();
        }, 2000);
    }

    startSessionTime();
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
    // Handle incoming datachannels (created by remote peer)
    peerConnections[peerId].ondatachannel = (event) => {
        console.log('Datachannel event peerId: ' + peerId, event);
        const channel = event.channel;
        channel.onmessage = (msg) => {
            if (typeof msg.data === 'string') {
                try {
                    handleIncomingDataChannelMessage(msg.data);
                } catch (err) {
                    console.log('Datachannel error', err);
                }
            } else if (msg.data instanceof ArrayBuffer) {
                handleIncomingDataChannelMessage(msg.data);
            }
        };
        channel.onopen = (event) => {
            console.log('Remote DataChannel open for peerId: ' + peerId, event);
        };
        dataChannels[peerId] = channel;
    };

    // Create our own datachannel for sending
    const dc = peerConnections[peerId].createDataChannel('mt_c2c_dc');
    dc.binaryType = 'arraybuffer';

    dc.onmessage = (msg) => {
        if (typeof msg.data === 'string') {
            try {
                handleIncomingDataChannelMessage(msg.data);
            } catch (err) {
                console.log('Datachannel error', err);
            }
        } else if (msg.data instanceof ArrayBuffer) {
            handleIncomingDataChannelMessage(msg.data);
        }
    };
    dc.onopen = (event) => {
        console.log('DataChannels created for peerId: ' + peerId, event);
    };
    dataChannels[peerId] = dc;
}

function handleOnTrack(peerId) {
    peerConnections[peerId].ontrack = (event) => {
        console.log('Handle on track event', event);
        setRemoteMedia(event.streams[0], peersInfo, peerId);
    };
}

function getSilentAudioTrack() {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    track.enabled = false;
    return track;
}

function getBlackVideoTrack({ width = 640, height = 480 } = {}) {
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    const track = stream.getVideoTracks()[0];
    track.enabled = false;
    return track;
}

function handleAddTracks(peerId) {
    if (!localMediaStream) return;

    const pc = peerConnections[peerId];

    // Always add video track (real or dummy) if not already added
    let videoTrack = localMediaStream.getVideoTracks()[0];
    const hasVideoSender = pc.getSenders().some((s) => s.track && s.track.kind === 'video');
    if (!hasVideoSender) {
        if (!videoTrack) {
            videoTrack = getBlackVideoTrack();
        }
        pc.addTrack(videoTrack, localMediaStream);
    }

    // Always add audio track (real or dummy) if not already added
    let audioTrack = localMediaStream.getAudioTracks()[0];
    const hasAudioSender = pc.getSenders().some((s) => s.track && s.track.kind === 'audio');
    if (!hasAudioSender) {
        if (!audioTrack) {
            audioTrack = getSilentAudioTrack();
        }
        pc.addTrack(audioTrack, localMediaStream);
    }
}

function handleRtcOffer(peerId) {
    peerConnections[peerId].onnegotiationneeded = async () => {
        try {
            const offer = await peerConnections[peerId].createOffer();
            await peerConnections[peerId].setLocalDescription(offer);
            sendToServer('relaySDP', {
                peerId: peerId,
                sessionDescription: offer,
            });
        } catch (err) {
            console.error('Offer creation error:', err);
        }
    };
}

function handleSessionDescription(config) {
    const { peerId, sessionDescription } = config;
    const pc = peerConnections[peerId];
    const remoteDescription = new RTCSessionDescription(sessionDescription);

    // Only set remote description if in correct state
    if (
        (sessionDescription.type === 'offer' && pc.signalingState === 'stable') ||
        (sessionDescription.type === 'answer' && pc.signalingState === 'have-local-offer')
    ) {
        pc.setRemoteDescription(remoteDescription)
            .then(() => {
                if (sessionDescription.type == 'offer') {
                    pc.createAnswer().then((localDescription) => {
                        pc.setLocalDescription(localDescription).then(() => {
                            sendToServer('relaySDP', {
                                peerId: peerId,
                                sessionDescription: localDescription,
                            });
                        });
                    });
                }
            })
            .catch((err) => {
                console.error('[Error] setRemoteDescription', err);
            });
    } else {
        console.warn(`[SDP] Ignoring remote ${sessionDescription.type} in state ${pc.signalingState}`);
    }
}

function handleIceCandidate(config) {
    const { peerId, iceCandidate } = config;
    peerConnections[peerId].addIceCandidate(new RTCIceCandidate(iceCandidate)).catch((err) => {
        console.error('[Error] addIceCandidate', err);
    });
}

function handleDisconnect() {
    stopMediaStream(localMediaStream);
    localMediaStream = null;
    cleanupPeerConnections();
    cleanupPeerMediaElements();
    saveLocalStorageConfig();
}

function handleRemovePeer(config) {
    const { peerId } = config;
    removeElement(peerMediaElements[peerId]?.parentNode);
    if (peerConnections[peerId]) peerConnections[peerId].close();
    delete dataChannels[peerId];
    delete peerConnections[peerId];
    delete peerMediaElements[peerId];

    if (!thereIsPeerConnections()) {
        elemDisplay(waitingDivContainer, true);
        elemDisplay(buttonsBar, false);
        elemDisplay(settings, false);
        elemDisplay(chat, false);
    }
    playSound('leave');
}

async function setupLocalMedia(callback, errorBack) {
    localMediaStream = null;

    console.log('Requesting access to local audio/video inputs');

    const audioDeviceId = localStorageConfig.audio.devices.select.id || (audioSource && audioSource.value);
    const videoDeviceId = localStorageConfig.video.devices.select.id || (videoSource && videoSource.value);

    const audioConstraints = getAudioConstraints(audioDeviceId);
    const videoConstraints = getVideoConstraints(videoDeviceId);
    const constraints = { audio: audioConstraints, video: videoConstraints };

    try {
        let stream = await getBestUserMedia(constraints);

        // Apply noise suppression to the stream if enabled
        const originalStream = stream;
        stream = await applyNoiseSuppressionToLocalStream(stream);

        // Check if noise suppression was applied and if we have peer connections
        const noiseSuppressionWasApplied = stream !== originalStream;
        const hasPeerConnections = thereIsPeerConnections();

        setLocalMedia(stream);

        // If noise suppression was applied and we have peer connections, refresh stream to peers
        if (noiseSuppressionWasApplied && hasPeerConnections) {
            refreshMyAudioStreamToPeers(stream);
            console.log('Noise suppression applied during setup and stream updated to peers');
        }

        if (hasVideoTrack(stream)) camera = detectCameraFacingMode(stream);
        if (callback) callback();
    } catch (err) {
        console.error('[Error] setting up local media', err);
        if (errorBack) errorBack();
    }
}

async function enumerateDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === 'videoinput' && device.deviceId !== 'default');
        const audioDevices = devices.filter((device) => device.kind === 'audioinput' && device.deviceId !== 'default');
        removeAllChildren(audioSource);
        removeAllChildren(videoSource);
        LS.DEVICES_COUNT.audio = 0;
        LS.DEVICES_COUNT.video = 0;
        for (const device of audioDevices) {
            await addChild(audioSource, device);
            LS.DEVICES_COUNT.audio++;
        }
        for (const device of videoDevices) {
            await addChild(videoSource, device);
            LS.DEVICES_COUNT.video++;
        }
    } catch (err) {
        playSound('error');
        console.error('[Error] enumerate devices audio/video', err);
        popupMessage('error', 'Enumerate Devices', 'Unable to enumerate devices ' + err);
    }
}

async function addChild(source, device) {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.text = device.label;
    source.appendChild(option);
}

function createVideoElement(id, stream, muted = false) {
    const video = document.createElement('video');
    video.id = id;
    video.playsInline = true;
    video.autoplay = true;
    video.controls = false;
    video.muted = muted;
    video.volume = muted ? 0 : 1;
    video.poster = image.poster;
    attachMediaStream(video, stream);
    video.play().catch(() => {});
    return video;
}

function createAudioElement(id, stream, muted = false) {
    const audio = document.createElement('audio');
    audio.id = id;
    audio.autoplay = true;
    audio.controls = false;
    audio.muted = muted;
    audio.volume = muted ? 0 : 1;
    attachMediaStream(audio, stream);
    audio.play().catch(() => {});
    return audio;
}

function setLocalMedia(stream) {
    localMediaStream = stream;

    const hasVideo = hasVideoTrack(stream);
    const hasAudio = hasAudioTrack(stream);

    // Remove previous local video wrap if exists
    const oldWrap = document.getElementById('myVideoWrap');
    if (oldWrap && oldWrap.parentNode) {
        oldWrap.parentNode.removeChild(oldWrap);
    }

    // Create elements
    const myVideoWrap = document.createElement('div');
    const myVideoHeader = document.createElement('div');
    const myVideoFooter = document.createElement('div');
    const myVideoPeerName = document.createElement('h4');
    const myVideoDraggableBtn = document.createElement('button');
    const myFullScreenBtn = document.createElement('button');
    const myVideoPiPBtn = document.createElement('button');
    const myVideoFocusBtn = document.createElement('button');
    const myVideoRotateBtn = document.createElement('button');
    const myAudioStatusIcon = document.createElement('button');
    const myVideoAvatarImage = document.createElement('img');

    // Set attributes/classes
    myVideoWrap.id = 'myVideoWrap';
    myVideoWrap.className = 'myVideoWrap';
    myVideoHeader.id = 'myVideoHeader';
    myVideoHeader.className = 'videoHeader animate__animated animate__fadeInDown animate__faster';
    myVideoFooter.id = 'myVideoFooter';
    myVideoFooter.className = 'videoFooter';
    myVideoPeerName.id = 'myVideoPeerName';
    myVideoPeerName.innerText = peerName + ' (me)';
    myVideoDraggableBtn.id = 'myVideoDraggable';
    myVideoDraggableBtn.className = className.draggable;
    myVideoDraggableBtn.style.cursor = 'move';
    myFullScreenBtn.id = 'myFullScreen';
    myFullScreenBtn.className = className.fullScreenOn;
    myVideoPiPBtn.id = 'myVideoPIP';
    myVideoPiPBtn.className = className.pip;
    myVideoFocusBtn.id = 'myVideoFocus';
    myVideoFocusBtn.className = className.focus;
    myVideoRotateBtn.id = 'myVideoRotate';
    myVideoRotateBtn.className = className.rotate;
    myAudioStatusIcon.id = 'myAudioStatusIcon';
    myAudioStatusIcon.className = hasAudio ? className.audioOn : className.audioOff;
    myVideoAvatarImage.id = 'myVideoAvatarImage';
    myVideoAvatarImage.setAttribute('src', image.camOff);
    myVideoAvatarImage.className = 'videoAvatarImage';

    // Header buttons
    if (!isMobileDevice) myVideoHeader.appendChild(myVideoDraggableBtn);
    if (hasVideo) {
        myVideoHeader.appendChild(myVideoFocusBtn);
        myVideoHeader.appendChild(myFullScreenBtn);
        if (isVideoPIPSupported) {
            myVideoHeader.appendChild(myVideoPiPBtn);
        }
        myVideoHeader.appendChild(myVideoRotateBtn);
    }
    myVideoHeader.appendChild(myAudioStatusIcon);
    myVideoFooter.appendChild(myVideoPeerName);

    // Media element
    let myLocalMedia;
    if (hasVideo) {
        myLocalMedia = createVideoElement('myVideo', stream, true);
        myLocalMedia.className = isScreenStreaming ? '' : 'mirror';
        myLocalMedia.style.objectFit = localStorageConfig.video.settings.aspect_ratio ? 'contain' : 'cover';
        myLocalMedia.style.display = 'block';
        myVideoAvatarImage.style.display = 'none';
    } else if (hasAudio) {
        myLocalMedia = createAudioElement('myAudio', stream, true);
        myLocalMedia.style.display = 'block';
        myVideoAvatarImage.style.display = 'block';
    } else {
        myLocalMedia = document.createElement('div');
        myLocalMedia.style.display = 'none';
        myVideoAvatarImage.style.display = 'block';
    }

    // Assemble
    myVideoWrap.appendChild(myVideoHeader);
    myVideoWrap.appendChild(myVideoFooter);
    myVideoWrap.appendChild(myVideoAvatarImage);
    myVideoWrap.appendChild(myLocalMedia);
    document.body.appendChild(myVideoWrap);

    // Update references for later use
    window.myVideo = myLocalMedia;
    window.myVideoWrap = myVideoWrap;
    window.myVideoAvatarImage = myVideoAvatarImage;
    window.myAudioStatusIcon = myAudioStatusIcon;

    logStreamSettingsInfo('localMediaStream', localMediaStream);

    // Feature handlers
    if (hasVideo) {
        handleVideoFocusMode(myVideoFocusBtn, myVideoWrap, myLocalMedia);
        handlePictureInPicture(myVideoPiPBtn, myLocalMedia);
        handleVideoRotate(myVideoRotateBtn, myLocalMedia);
        handleFullScreen(myFullScreenBtn, myVideoWrap, myLocalMedia);
    }
    setPeerVideoAvatarImgName(myVideoAvatarImage, peerName);

    // Tooltips
    if (hasVideo) {
        setTippy(myVideoPiPBtn, 'Toggle picture in picture', 'bottom');
        setTippy(myVideoFocusBtn, 'Toggle Focus mode', 'bottom');
        setTippy(myVideoRotateBtn, 'Rotate video', 'bottom');
        setTippy(myFullScreenBtn, 'Toggle full screen', 'bottom');
    }
    setTippy(myAudioStatusIcon, 'Audio status', 'bottom');
    setTippy(myVideoPeerName, 'Username', 'top');

    if (!isMobileDevice) {
        makeDraggable(myVideoWrap, myVideoDraggableBtn);
    }

    setLocalAudioStatus(hasAudio && localStorageConfig.audio.init.active ? stream.getAudioTracks()[0].enabled : false);
    setLocalVideoStatus(hasVideo && localStorageConfig.video.init.active ? stream.getVideoTracks()[0].enabled : false);
}

function setRemoteMedia(stream, peers, peerId) {
    remoteMediaStream = stream;

    console.log('Remote media stream tracks', remoteMediaStream.getTracks());
    console.log('Remote peer ID', peerId);
    console.log('Remote peers', peers);

    // Remove previous remote video wrap if exists
    const oldWrap = document.getElementById(peerId + '_remoteVideoWrap');
    if (oldWrap && oldWrap.parentNode) {
        oldWrap.parentNode.removeChild(oldWrap);
    }

    const peerName = peers[peerId]['peerName'];
    const peerVideo = peers[peerId]['peerVideo'];
    const peerAudio = peers[peerId]['peerAudio'];
    const peerScreen = peers[peerId]['peerScreen'];

    // Check for actual tracks
    const videoTrack = stream.getVideoTracks().find((track) => track.enabled);
    const audioTrack = stream.getAudioTracks().find((track) => track.enabled);

    const hasVideo = !!videoTrack || !!peerVideo || !!peerScreen;
    const hasAudio = !!audioTrack || !!peerAudio;

    // UI elements
    const remoteVideoWrap = document.createElement('div');
    const remoteVideoHeader = document.createElement('div');
    const remoteVideoFooter = document.createElement('div');
    const remoteVideoPeerName = document.createElement('h4');
    const remoteFullScreenBtn = document.createElement('button');
    const remoteVideoFocusBtn = document.createElement('button');
    const remoteVideoPiPBtn = document.createElement('button');
    const remoteVideoRotateBtn = document.createElement('button');
    const remoteAudioStatusIcon = document.createElement('button');
    const remoteVideoAvatarImage = document.createElement('img');

    remoteVideoWrap.id = peerId + '_remoteVideoWrap';
    remoteVideoWrap.className = 'remoteVideoWrap';
    remoteVideoHeader.id = peerId + '_remoteVideoHeader';
    remoteVideoHeader.className = 'videoHeader animate__animated animate__fadeInDown animate__faster';
    remoteVideoFooter.id = peerId + '_remoteVideoFooter';
    remoteVideoFooter.className = 'remoteVideoFooter';
    remoteVideoPeerName.id = peerId + '_remotePeerName';
    remoteVideoPeerName.innerText = peerName;
    remoteFullScreenBtn.id = peerId + '_remoteFullScreen';
    remoteFullScreenBtn.className = className.fullScreenOn;
    remoteVideoFocusBtn.id = peerId + '_remoteVideoFocus';
    remoteVideoFocusBtn.className = className.focus;
    remoteVideoPiPBtn.id = peerId + '_remoteVideoPIP';
    remoteVideoPiPBtn.className = className.pip;
    remoteVideoRotateBtn.id = peerId + '_remoteVideoRotate';
    remoteVideoRotateBtn.className = className.rotate;
    remoteAudioStatusIcon.id = peerId + '_remoteAudioStatus';
    remoteAudioStatusIcon.className = hasAudio ? className.audioOn : className.audioOff;
    remoteVideoAvatarImage.id = peerId + '_remoteVideoAvatar';
    remoteVideoAvatarImage.src = image.camOff;
    remoteVideoAvatarImage.className = 'videoAvatarImage';

    // Header buttons
    if (hasVideo) {
        remoteVideoHeader.appendChild(remoteVideoFocusBtn);
        remoteVideoHeader.appendChild(remoteFullScreenBtn);
        remoteVideoHeader.appendChild(remoteVideoPiPBtn);
        remoteVideoHeader.appendChild(remoteVideoRotateBtn);
    }
    remoteVideoHeader.appendChild(remoteAudioStatusIcon);
    remoteVideoFooter.appendChild(remoteVideoPeerName);

    // Media element
    let remoteVideoElem = null;
    let remoteAudioElem = null;

    // Video element (if video track or screen sharing)
    if (hasVideo) {
        remoteVideoElem = createVideoElement(peerId + '_remoteVideo', stream, false);
        remoteVideoElem.style.display = 'block';
        remoteVideoAvatarImage.style.display = 'none';
    }

    // Audio element (if audio track)
    if (hasAudio) {
        remoteAudioElem = createAudioElement(peerId + '_remoteAudio', stream, false);
        remoteAudioElem.style.display = hasVideo ? 'none' : 'block';
    }

    // If neither, show avatar only
    if (!hasVideo && !hasAudio) {
        remoteVideoAvatarImage.style.display = 'block';
    }

    // Assemble
    remoteVideoWrap.appendChild(remoteVideoHeader);
    remoteVideoWrap.appendChild(remoteVideoFooter);
    remoteVideoWrap.appendChild(remoteVideoAvatarImage);
    if (remoteVideoElem) remoteVideoWrap.appendChild(remoteVideoElem);
    if (remoteAudioElem && !hasVideo) remoteVideoWrap.appendChild(remoteAudioElem);
    document.body.appendChild(remoteVideoWrap);

    peerMediaElements[peerId] = hasVideo ? remoteVideoElem : hasAudio ? remoteAudioElem : remoteVideoAvatarImage;

    // Feature handlers
    if (hasVideo && remoteVideoElem) {
        handleVideoFocusMode(remoteVideoFocusBtn, remoteVideoWrap, remoteVideoElem);
        handleFullScreen(remoteFullScreenBtn, remoteVideoWrap, remoteVideoElem);
        handlePictureInPicture(remoteVideoPiPBtn, remoteVideoElem);
        handleVideoRotate(remoteVideoRotateBtn, remoteVideoElem);
        handleVideoZoom(remoteVideoElem, remoteVideoWrap, remoteVideoAvatarImage);
    }

    setPeerVideoAvatarImgName(remoteVideoAvatarImage, peerName);
    setPeerVideoStatus(peerId, peerVideo);
    setPeerAudioStatus(peerId, peerAudio);

    if (hasVideo) {
        setTippy(remoteVideoFocusBtn, 'Focus video', 'bottom');
        setTippy(remoteFullScreenBtn, 'Toggle full screen', 'bottom');
        setTippy(remoteVideoPiPBtn, 'Toggle picture in picture', 'bottom');
        setTippy(remoteVideoRotateBtn, 'Rotate video', 'bottom');
    }
    setTippy(remoteAudioStatusIcon, 'Audio status', 'bottom');
    setTippy(remoteVideoPeerName, 'Username', 'top');
}

function handleIncomingDataChannelMessage(config) {
    // If receiving file meta (JSON string)
    if (typeof config === 'string') {
        try {
            const meta = JSON.parse(config);
            if (meta.type === 'file') {
                incomingFileMeta = meta;
                incomingFileBuffer = [];
                incomingFileReceived = 0;
                return;
            }
            // If it's a chat message
            if (meta.type === 'chat') {
                handleMessage(meta);
                return;
            }
        } catch (e) {
            // Not JSON, ignore
        }
    }

    // If receiving file data (ArrayBuffer or Blob)
    if (incomingFileMeta && (config instanceof ArrayBuffer || config instanceof Blob)) {
        // Convert Blob to ArrayBuffer
        if (config instanceof Blob) {
            if (config.size === 0) return;
            blobToArrayBuffer(config)
                .then((arrayBuffer) => {
                    handleFileChunk(arrayBuffer);
                })
                .catch((error) => {
                    console.error('Error converting Blob to ArrayBuffer', error);
                });
            return;
        } else if (config instanceof ArrayBuffer) {
            if (config.byteLength === 0) return;
            handleFileChunk(config);
            return;
        }
    }
}

// Assemble file chunks and display when complete
function handleFileChunk(arrayBuffer) {
    incomingFileBuffer.push(arrayBuffer);
    incomingFileReceived += arrayBuffer.byteLength;
    if (incomingFileReceived >= incomingFileMeta.fileSize) {
        const blob = new Blob(incomingFileBuffer, { type: incomingFileMeta.fileType });
        appendFileMessage(
            incomingFileMeta.peerName,
            incomingFileMeta.fileName,
            incomingFileMeta.fileSize,
            incomingFileMeta.fileType,
            blob
        );
        incomingFileMeta = null;
        incomingFileBuffer = [];
        incomingFileReceived = 0;
    }
}

function blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result;
            resolve(arrayBuffer);
        };
        reader.onerror = () => {
            reject(new Error('Error reading Blob as ArrayBuffer'));
        };
        reader.readAsArrayBuffer(blob);
    });
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
        if (hasAudioTrack(localMediaStream)) setLocalAudioStatus(!localMediaStream.getAudioTracks()[0].enabled, e);
    };
    initVideoBtn.onclick = (e) => {
        if (hasVideoTrack(localMediaStream)) setLocalVideoStatus(!localMediaStream.getVideoTracks()[0].enabled, e);
    };
    initChatOpenBtn.onclick = () => {
        toggleChat();
    };
    initSettingsBtn.onclick = () => {
        settingsBtn.click();
    };
    hideMeBtn.onclick = () => {
        toggleHideMe();
    };
    audioBtn.onclick = (e) => {
        if (hasAudioTrack(localMediaStream)) setLocalAudioStatus(!localMediaStream.getAudioTracks()[0].enabled, e);
    };
    videoBtn.onclick = (e) => {
        if (hasVideoTrack(localMediaStream)) setLocalVideoStatus(!localMediaStream.getVideoTracks()[0].enabled, e);
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
                6000
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
                    6000
                );
            }
            playSound('switch');
        };
        document.onkeydown = (e) => {
            if (!isPushToTalkActive) return;
            if (e.code === 'Space') {
                if (isSpaceDown) return;
                setLocalAudioStatus(true, audioBtn.event);
                isSpaceDown = true;
                console.log('Push-to-talk: audio ON');
            }
        };
        document.onkeyup = (e) => {
            e.preventDefault();
            if (!isPushToTalkActive) return;
            if (e.code === 'Space') {
                setLocalAudioStatus(false, audioBtn.event);
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
        if (isChatPasteTxt) return;
        for (let i in chatInputEmoji) {
            let regex = new RegExp(i.replace(/([()[{*+.$^\\|?])/g, '\\$1'), 'gim');
            this.value = this.value.replace(regex, chatInputEmoji[i]);
        }
        checkLineBreaks();
    };
    chatInput.onpaste = () => {
        isChatPasteTxt = true;
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
    const isVideoWrapHidden = window.myVideoWrap.style.display == 'none';
    hideMeBtn.className = isVideoWrapHidden ? className.user : className.userOff;
    initHideMeBtn.className = isVideoWrapHidden ? className.user : className.userOff;
    if (isVideoWrapHidden) {
        elemDisplay(window.myVideoWrap, true);
        animateCSS(window.myVideoWrap, 'fadeInLeft');
    } else {
        animateCSS(window.myVideoWrap, 'fadeOutLeft').then((msg) => {
            elemDisplay(window.myVideoWrap, false);
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
            if (hasVideoTrack(localMediaStream)) {
                localMediaStream.getVideoTracks()[0].stop();
            }
            refreshMyLocalVideoStream(camStream);
            refreshMyVideoStreamToPeers(camStream);
            setLocalVideoStatus(true);
            camera = detectCameraFacingMode(camStream);
            handleCameraMirror(window.myVideo, camera);
        })
        .catch((err) => {
            console.error('[Error] to swapping camera', err);
            popupMessage('error', 'Swap camera', 'Error to swapping the camera ' + err);
        });
}

async function toggleScreenSharing() {
    const constraints = { audio: true, video: true };
    try {
        let newStream;
        if (!isScreenStreaming) {
            isMyAudioActiveBefore = localMediaStream?.getAudioTracks()[0]?.enabled ?? false;
            isMyVideoActiveBefore = localMediaStream?.getVideoTracks()[0]?.enabled ?? false;
            newStream = await getScreenWithMic(constraints);
            newStream = await applyNoiseSuppressionWithLogging(
                newStream,
                '✅ Noise suppression applied to screen sharing audio'
            );
        } else {
            newStream = await getBestUserMedia(constraints);
            newStream = await applyNoiseSuppressionWithLogging(
                newStream,
                '✅ Noise suppression restored after screen sharing'
            );
        }

        if (newStream) {
            isScreenStreaming = !isScreenStreaming;
            refreshMyAudioAndVideoStreamToPeers(newStream);
            setLocalScreenStatus(isScreenStreaming);

            // UI updates...
            if (window.myVideo) {
                window.myVideo.className = isScreenStreaming ? '' : 'mirror';
                window.myVideo.style.objectFit =
                    isScreenStreaming || localStorageConfig.video.settings.aspect_ratio ? 'contain' : 'cover';
            }
            if (initScreenShareBtn)
                initScreenShareBtn.className = isScreenStreaming ? className.screenOff : className.screenOn;
            if (screenShareBtn) screenShareBtn.className = isScreenStreaming ? className.screenOff : className.screenOn;

            if (!isScreenStreaming) {
                setLocalAudioStatus(isMyAudioActiveBefore);
                setLocalVideoStatus(isMyVideoActiveBefore);
            }
        }
    } catch (err) {
        console.error('[Error] toggleScreenSharing', err);
        isScreenStreaming = false;
    }
}

function changeCamera(deviceId = false) {
    const videoConstraints = getVideoConstraints(deviceId);

    navigator.mediaDevices
        .getUserMedia({
            video: videoConstraints,
        })
        .then((camStream) => {
            // Remove all existing video tracks from localMediaStream
            if (localMediaStream) {
                localMediaStream.getVideoTracks().forEach((track) => {
                    track.stop();
                    localMediaStream.removeTrack(track);
                });
            }
            // Add the new video track to localMediaStream
            const newVideoTrack = camStream.getVideoTracks()[0];
            if (localMediaStream && newVideoTrack) {
                localMediaStream.addTrack(newVideoTrack);
            } else if (!localMediaStream && newVideoTrack) {
                localMediaStream = new MediaStream([newVideoTrack]);
            }
            refreshMyLocalVideoStream(localMediaStream);
            refreshMyVideoStreamToPeers(localMediaStream);
            camera = detectCameraFacingMode(camStream);
            handleCameraMirror(window.myVideo, camera);
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
        .then(async (micStream) => {
            // Apply noise suppression to the new microphone stream
            const processedMicStream = await applyNoiseSuppressionToLocalStream(micStream);

            // Remove all existing audio tracks from localMediaStream
            if (localMediaStream) {
                localMediaStream.getAudioTracks().forEach((track) => {
                    track.stop();
                    localMediaStream.removeTrack(track);
                });
            }
            // Add the new processed audio track to localMediaStream
            const newAudioTrack = processedMicStream.getAudioTracks()[0];
            if (localMediaStream && newAudioTrack) {
                localMediaStream.addTrack(newAudioTrack);
            } else if (!localMediaStream && newAudioTrack) {
                localMediaStream = new MediaStream([newAudioTrack]);
            }

            refreshMyLocalAudioStream(localMediaStream);

            // Send updated stream to all connected peers
            const hasPeerConnections = thereIsPeerConnections();
            if (hasPeerConnections) {
                refreshMyAudioStreamToPeers(localMediaStream);
                console.log('Microphone changed and stream updated to', Object.keys(peerConnections).length, 'peers');
            } else {
                console.log('Microphone changed (no peers connected)');
            }
        })
        .catch((err) => {
            console.error('[Error] changeMicrophone', err);
            popupMessage('error', 'Change microphone', 'Error while swapping microphone' + err);
        });
}

function getAudioConstraints(deviceId = null) {
    const audioConstraints = {
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: false, // Use RNNoise instead
        sampleRate: 48000,
        channelCount: 2,
    };
    // Safari and Firefox work better with 'ideal' instead of 'exact'
    if (deviceId) {
        audioConstraints.deviceId = isSafari || isFirefox ? { ideal: deviceId } : { exact: deviceId };
    }
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

        // Define base quality dimensions
        const qualityDimensions = {
            default: { width: 1280, height: 720 },
            qvga: { width: 320, height: 240 },
            vga: { width: 640, height: 480 },
            hd: { width: 1280, height: 720 },
            fhd: { width: 1920, height: 1080 },
            '2k': { width: 2560, height: 1440 },
            '4k': { width: 3840, height: 2160 },
            '6k': { width: 6144, height: 3456 },
            '8k': { width: 7680, height: 4320 },
        };

        // Helper function to create constraint type based on browser
        const createConstraintType = (value) => ({
            [isFirefox || isSafari || videoQuality === 'default' ? 'ideal' : 'exact']: value,
        });

        // Build video constraints from dimensions
        const dimensions = qualityDimensions[videoQuality];
        if (dimensions) {
            videoConstraints = {
                width: createConstraintType(dimensions.width),
                height: createConstraintType(dimensions.height),
            };
        }

        // Handle FPS and UI state
        if (videoQuality === 'default') {
            videoFpsSelect.disabled = true;
            videoFpsSelect.selectedIndex = 0;
        } else if (videoConstraints !== true) {
            // Only add frameRate for non-Firefox and non-Safari browsers
            if (!isFirefox && !isSafari) {
                videoConstraints.frameRate = createConstraintType(videoFrameRate);
            }
            videoFpsSelect.disabled = false;
        }
    }

    // Add device constraint if specified
    if (deviceId) {
        videoConstraints = {
            ...videoConstraints,
            deviceId: isSafari || isFirefox ? { ideal: deviceId } : { exact: deviceId },
        };
    }

    // Firefox and Safari-specific constraint cleanup
    if (isFirefox || isSafari) {
        // Remove frameRate constraint as Firefox and Safari have inconsistent support
        if (videoConstraints && typeof videoConstraints === 'object') {
            delete videoConstraints.frameRate;
        }
        console.log(
            `${isSafari ? 'Safari' : 'Firefox'}: Using ideal constraints instead of exact for better compatibility`
        );
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
    switchNoiseSuppression.checked = localStorageConfig?.audio?.settings?.noise_suppression ?? true;
    switchMaxVideoQuality.checked = localStorageConfig.video.settings.best_quality;
    switchKeepAspectRatio.checked = localStorageConfig.video.settings.aspect_ratio;
    if (localStorageConfig.video.init.hide) initHideMeBtn.click();
    if (
        !localStorageConfig.video.settings.best_quality &&
        (localStorageConfig.video.settings.quality_index !== 0 || localStorageConfig.video.settings.fps_index !== 0)
    ) {
        refreshVideoConstraints();
    }
}

function endCall() {
    saveLocalStorageConfig();
    surveyURL ? giveMeFeedback() : redirectOnLeave();
}

function giveMeFeedback() {
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonColor: 'green',
        denyButtonColor: 'red',
        cancelButtonColor: 'gray',
        background: swal.background,
        imageUrl: image.feedback,
        position: 'top',
        title: 'Leave a feedback',
        text: 'Do you want to rate your MiroTalk experience?',
        confirmButtonText: `Yes`,
        denyButtonText: `No`,
        cancelButtonText: `Cancel`,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) {
            redirectToSurvey();
        } else if (result.isDenied) {
            redirectOnLeave();
        }
    });
}

function redirectToSurvey() {
    signalingSocket.disconnect();
    surveyURL ? openURL(surveyURL) : openURL('/');
}

function redirectOnLeave() {
    signalingSocket.disconnect();
    redirectURL ? openURL(redirectURL) : openURL('/');
}

function attachMediaStream(element, stream) {
    element.srcObject = stream;
    console.log('Success, media stream attached');
}

function setLocalAudioStatus(active = true, e = false) {
    console.log(`This PeerId ${thisPeerId} audio status`, active);
    isAudioStreaming = active;
    setAudioButtons(active, e);
    emitPeerStatus('audio', active);
    localStorageConfig.audio.init.active = active;
    saveLocalStorageConfig();
}

function setLocalVideoStatus(active = true, e = false) {
    console.log(`This PeerId ${thisPeerId} video status`, active);
    isVideoStreaming = active;
    setVideoButtons(active, e);
    emitPeerStatus('video', active);
    localStorageConfig.video.init.active = active;
    saveLocalStorageConfig();
    elemDisable(videoQualitySelect, !active || localStorageConfig.video.settings.best_quality);
}

function setLocalScreenStatus(active = false, e = false) {
    console.log(`This PeerId ${thisPeerId} screen status`, active);
    isScreenStreaming = active;
    setVideoButtons(active, e);
    emitPeerStatus('screen', active);
}

function setAudioButtons(active, e = false) {
    if (localMediaStream.getAudioTracks()[0]) {
        localMediaStream.getAudioTracks()[0].enabled = active;
    }
    if (e) e.target.className = active ? className.audioOn : className.audioOff;
    if (window.myAudioStatusIcon) window.myAudioStatusIcon.className = active ? className.audioOn : className.audioOff;
    if (audioBtn) audioBtn.className = active ? className.audioOn : className.audioOff;
    if (initAudioBtn) initAudioBtn.className = active ? className.audioOn : className.audioOff;
}

function setVideoButtons(active, e = false) {
    if (localMediaStream.getVideoTracks()[0]) {
        localMediaStream.getVideoTracks()[0].enabled = active;
    }
    if (e) e.target.className = active ? className.videoOn : className.videoOff;
    if (videoBtn) videoBtn.className = active ? className.videoOn : className.videoOff;
    if (initVideoBtn) initVideoBtn.className = active ? className.videoOn : className.videoOff;
    if (window.myVideoAvatarImage) elemDisplay(window.myVideoAvatarImage, active ? false : true);
}

function resetVideoConstraints() {
    videoQualitySelect.selectedIndex = 0;
    videoFpsSelect.selectedIndex = 0;
    localStorageConfig.video.settings.quality_index = 0;
    localStorageConfig.video.settings.fps_index = 0;
    saveLocalStorageConfig();
}

function refreshVideoConstraints() {
    // Check if localMediaStream exists and has video tracks
    if (!localMediaStream || !hasVideoTrack(localMediaStream)) {
        console.warn('Cannot refresh video constraints: no video track available');
        return;
    }

    const videoTrack = localMediaStream.getVideoTracks()[0];
    if (!videoTrack) {
        console.warn('Cannot refresh video constraints: video track is undefined');
        return;
    }

    videoTrack
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
                "Your device doesn't support the selected video quality and fps, please select the another one."
            );
        });
}

function refreshMyLocalVideoStream(stream) {
    localMediaStream = buildUniqueMediaStream(stream);
    setLocalMedia(localMediaStream);
    logStreamSettingsInfo('refreshMyLocalVideoStream', localMediaStream);
}

function refreshMyLocalAudioStream(stream) {
    localMediaStream = buildUniqueMediaStream(stream);
    setLocalMedia(localMediaStream);
    logStreamSettingsInfo('refreshMyLocalAudioStream', localMediaStream);
}

function replaceOrAddTrack(pc, kind, track, stream) {
    let sender = pc.getSenders().find((s) => s.track && s.track.kind === kind);
    if (sender) {
        sender.replaceTrack(track);
    } else if (track) {
        pc.addTrack(track, stream);
        if (typeof pc.onnegotiationneeded === 'function') pc.onnegotiationneeded();
    }
}

function refreshMyVideoStreamToPeers(stream) {
    if (!thereIsPeerConnections()) return;
    const videoTrack = hasVideoTrack(stream) ? stream.getVideoTracks()[0] : null;
    for (let peerId in peerConnections) {
        replaceOrAddTrack(peerConnections[peerId], 'video', videoTrack, localMediaStream);
    }
}

function refreshMyAudioStreamToPeers(stream) {
    if (!thereIsPeerConnections()) return;
    const audioTrack = hasAudioTrack(stream) ? stream.getAudioTracks()[0] : null;
    for (let peerId in peerConnections) {
        replaceOrAddTrack(peerConnections[peerId], 'audio', audioTrack, localMediaStream);
    }
}

function refreshMyAudioAndVideoStreamToPeers(stream) {
    localMediaStream = buildUniqueMediaStream(stream);
    setLocalMedia(localMediaStream);
    refreshMyVideoStreamToPeers(localMediaStream);
    refreshMyAudioStreamToPeers(localMediaStream);
    logStreamSettingsInfo('refreshMyAudioAndVideoStreamToPeers', localMediaStream);
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

function handleVideoFocusMode(videoFocusBtn, videoWrap, media) {
    if (videoFocusBtn) {
        const allVideoWraps = document.querySelectorAll('.myVideoWrap, .remoteVideoWrap');
        let isFocusMode = false;
        videoFocusBtn.addEventListener('click', (e) => {
            isFocusMode = !isFocusMode;
            e.target.style.color = isFocusMode ? 'lime' : 'white';
            if (isFocusMode) {
                videoWrap.style.position = 'fixed';
                videoWrap.style.top = '0';
                videoWrap.style.left = '0';
                videoWrap.style.width = '100%';
                videoWrap.style.height = '100%';
                videoWrap.style.zIndex = '9999';
                media.setAttribute('focus-mode', 'true');
                allVideoWraps.forEach((wrap) => {
                    if (wrap.id !== videoWrap.id) {
                        wrap.style.display = 'none';
                    }
                });
            } else {
                videoWrap.style.position = '';
                videoWrap.style.top = '';
                videoWrap.style.left = '';
                videoWrap.style.width = '';
                videoWrap.style.height = '';
                videoWrap.style.zIndex = '';
                media.removeAttribute('focus-mode');
                allVideoWraps.forEach((wrap) => {
                    if (wrap.id !== videoWrap.id) {
                        wrap.style.display = 'block';
                    }
                });
            }
        });
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
            const messages = chatBody.querySelectorAll('.msg');
            messages.forEach((msg) => chatBody.removeChild(msg));

            chatMessages = [];

            showChatEmptyNoticeIfNoMessages();
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

    handleClickOutside(emojiPicker, chatEmojiBtn, () => {
        if (chatEmoji && chatEmoji.classList.contains('show')) {
            chatEmoji.classList.remove('show');
        }
    });
}

function handleChatFileSharing() {
    // File sharing button logic
    if (chatFileBtn && chatFileInput) {
        chatFileBtn.onclick = () => chatFileInput.click();
        chatFileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            // Read file as ArrayBuffer
            const reader = new FileReader();
            reader.onload = function (event) {
                const arrayBuffer = event.target.result;
                // Send file meta first
                const meta = {
                    type: 'file',
                    peerName: peerName,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                };
                Object.keys(dataChannels).forEach((peerId) => {
                    if (dataChannels[peerId].readyState === 'open') {
                        dataChannels[peerId].send(JSON.stringify(meta));
                        // Send file in chunks (64KB)
                        const chunkSize = 64 * 1024;
                        for (let offset = 0; offset < arrayBuffer.byteLength; offset += chunkSize) {
                            const chunk = arrayBuffer.slice(offset, offset + chunkSize);
                            dataChannels[peerId].send(chunk);
                        }
                    }
                });
                // Show file in own chat
                appendFileMessage(peerName, file.name, file.size, file.type, arrayBuffer);
            };
            reader.readAsArrayBuffer(file);
            // Reset input
            chatFileInput.value = '';
        };
    }
}

function appendFileMessage(name, fileName, fileSize, fileType, fileData) {
    if (name !== peerName) showChat();
    const div = document.createElement('div');
    const span = document.createElement('span');
    const a = document.createElement('a');
    const messageClass = name === peerName ? 'sent' : 'received';
    const timeNow = getCurrentTimeString();
    div.className = `msg ${messageClass}`;
    span.className = 'from';
    span.innerText = name + ' - ' + timeNow;
    a.className = 'file-link';
    a.innerText = `📎 ${fileName} (${Math.round(fileSize / 1024)} KB)`;
    a.style.color = '#3391FF';
    if (fileData instanceof Blob) {
        a.href = URL.createObjectURL(fileData);
        a.download = fileName;
    } else {
        // ArrayBuffer
        const blob = new Blob([fileData], { type: fileType });
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
    }
    div.appendChild(span);
    div.appendChild(a);
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    showChatEmptyNoticeIfNoMessages();
}

function sendMessage() {
    if (!thereIsPeerConnections()) {
        popupMessage(
            'info',
            'Chat',
            'No peer is connected to the meeting. The message will be sent when a peer connects',
            'top'
        );
        toggleChat();
        return;
    }
    if (!chatInput.value) return;
    const safeMsg = safeXSS(chatInput.value);
    emitDcMsg(safeMsg);
    chatInput.value = '';
    checkLineBreaks();
}

function emitDcMsg(msg) {
    if (msg) {
        isChatPasteTxt = false;
        console.log('Send msg: ' + msg);
        appendMessage(peerName, msg);
        Object.keys(dataChannels).map((peerId) =>
            dataChannels[peerId].send(
                JSON.stringify({
                    type: 'chat',
                    roomId: roomId,
                    peerName: peerName,
                    msg: msg,
                })
            )
        );
    }
}

function appendMessage(name, msg) {
    const div = document.createElement('div');
    const span = document.createElement('span');
    const p = document.createElement('pre');
    const messageClass = name === peerName ? 'sent' : 'received';
    const timeNow = getCurrentTimeString();
    div.className = `msg ${messageClass}`;
    span.className = 'from';
    span.innerText = name + ' - ' + timeNow;
    p.className = 'text';
    p.innerHTML = processMessage(msg);
    div.appendChild(span);
    div.appendChild(p);
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    chatMessages.push({
        from: name,
        message: msg,
        time: timeNow,
    });
    hljs.highlightAll();
    showChatEmptyNoticeIfNoMessages();
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
    const name = safeXSS(config.peerName);
    const msg = safeXSS(config.msg);
    showChat();
    appendMessage(name, msg);
}

function showChat() {
    playSound('message');
    if (chat.style.display == 'none' || chat.style.display == '') {
        elemDisplay(chat, true);
        animateCSS(chat, 'fadeInRight');
    }
}

function checkLineBreaks() {
    chatInput.style.height = '';
    if (getLineBreaks(chatInput.value) > 0 || chatInput.value.length > 50) {
        chatInput.style.height = '150px';
    }
}

function showChatEmptyNoticeIfNoMessages() {
    const messages = chatBody.querySelectorAll('.msg');
    messages.length === 0 ? chatEmptyNotice.classList.remove('hidden') : chatEmptyNotice.classList.add('hidden');
}

// =====================================================
// Handle Peer status
// =====================================================

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
        case 'audio':
            setPeerAudioStatus(peerId, active);
            break;
        case 'video':
            setPeerVideoStatus(peerId, active);
            break;
        case 'screen':
            setPeerScreenStatus(peerId, active);
            break;
        case 'recording':
            popupMessage(
                'html',
                'Recording',
                `<div style="text-align: left;">
                    🔴 &nbsp;The participant has 
                    <span style="color: ${active ? 'green' : 'red'}">
                        ${active ? 'started' : 'stopped'}
                    </span> 
                    recording the current session
                </div>`,
                'top'
            );
            break;
        default:
            break;
    }
}

function setPeerAudioStatus(peerId, active) {
    console.log(`Remote PeerId ${peerId} audio status`, active);
    if (peersInfo[peerId]) {
        peersInfo[peerId]['peerAudio'] = active;
    }
    const peerAudioStatus = document.getElementById(peerId + '_remoteAudioStatus');
    if (peerAudioStatus) peerAudioStatus.className = active ? className.audioOn : className.audioOff;
}

function setPeerVideoStatus(peerId, active) {
    console.log(`Remote PeerId ${peerId} video status`, active);
    if (peersInfo[peerId]) {
        peersInfo[peerId]['peerVideo'] = active;
    }
    updatePeerMediaDisplay(peerId, active, 'video');
}

function setPeerScreenStatus(peerId, active) {
    console.log(`Remote PeerId ${peerId} screen status`, active);
    if (peersInfo[peerId]) {
        peersInfo[peerId]['peerScreen'] = active;
    }
    updatePeerMediaDisplay(peerId, active, 'screen');
}

function updatePeerMediaDisplay(peerId, active, type) {
    const peerVideo = document.getElementById(peerId + '_remoteVideo');
    const peerVideoAvatarImage = document.getElementById(peerId + '_remoteVideoAvatar');
    if (peerVideoAvatarImage) elemDisplay(peerVideoAvatarImage, !active);
    if (peerVideo) {
        peerVideo.style.display = active ? 'block' : 'none';
        peerVideo.style.objectFit =
            type === 'screen' ? 'contain' : localStorageConfig.video.settings.aspect_ratio ? 'contain' : 'cover';
    }
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
        try {
            audioRecorder = new MixedAudioRecorder();

            const audioStreamFromVideoElements = getAudioStreamFromVideoElements();
            const audioStreamFromAudioElements = getAudioStreamFromAudioElements();
            const audioStreams =
                audioStreamFromVideoElements.getTracks().length > 0
                    ? audioStreamFromVideoElements
                    : audioStreamFromAudioElements;

            console.log('Recording Audio streams tracks --->', audioStreams.getTracks());

            const audioMixerStreams = audioRecorder.getMixedAudioStream(
                audioStreams
                    .getTracks()
                    .filter((track) => track.kind === 'audio')
                    .map((track) => new MediaStream([track]))
            );

            const audioMixerTracks = audioMixerStreams.getTracks();
            console.log('Recording Audio mixer tracks --->', audioMixerTracks);

            const recordingStream = getRecordingStream(audioMixerTracks);

            recording = new Recording(
                recordingStream,
                recordingLabel,
                recordingTime,
                recordingBtn,
                videoSource,
                audioSource
            );
            recording.start();

            // Notice for recording
            emitPeerStatus('recording', true);
        } catch (err) {
            popupMessage('error', 'Recording', 'Exception while creating MediaRecorder: ' + err);
        }
    }
}

function getAudioStreamFromVideoElements() {
    const videoElements = document.querySelectorAll('video');
    const audioStream = new MediaStream();
    videoElements.forEach((video) => {
        if (video.srcObject) {
            const audioTracks = video.srcObject.getAudioTracks();
            if (audioTracks.length > 0) {
                audioStream.addTrack(audioTracks[0]);
            }
        }
    });
    return audioStream;
}

function getAudioStreamFromAudioElements() {
    const audioElements = document.querySelectorAll('audio');
    const audioStream = new MediaStream();
    audioElements.forEach((audio) => {
        if (audio.srcObject) {
            const audioTracks = audio.srcObject.getAudioTracks();
            if (audioTracks.length > 0) {
                audioStream.addTrack(audioTracks[0]);
            }
        }
    });
    return audioStream;
}

function getRecordingStream(audioMixerTracks) {
    try {
        const combinedTracks = [];

        if (Array.isArray(audioMixerTracks)) {
            combinedTracks.push(...audioMixerTracks);
        }

        if (localMediaStream !== null) {
            const videoTracks = localMediaStream.getVideoTracks();
            console.log('Recording video tracks --->', videoTracks);
            if (Array.isArray(videoTracks)) {
                combinedTracks.push(...videoTracks);
            }
        }

        const recordingStream = new MediaStream(combinedTracks);
        console.log('New Recording Media Stream tracks  --->', recordingStream.getTracks());
        return recordingStream;
    } catch (err) {
        popupMessage('error', 'Recording', 'Unable to recording video + all participants audio: ' + err.message);
        return localMediaStream;
    }
}

function stopRecording() {
    recording.stop();
    if (audioRecorder) {
        audioRecorder.stopMixedAudioStream();
    }
    emitPeerStatus('recording', false);
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
    recordingTimer = null;
}

// =====================================================
// Noise Suppression Processor
// =====================================================

function stopNoiseProcessor() {
    if (noiseProcessor) {
        noiseProcessor.stopProcessing();
        noiseProcessor = null;
        console.log('Noise processor stopped and cleaned up');
    } else {
        console.log('No noise processor to stop');
    }
}

function initNoiseProcessor() {
    if (!noiseProcessor) {
        const enabled = localStorageConfig?.audio?.settings?.noise_suppression ?? true;
        noiseProcessor = new RNNoiseProcessor(enabled);
        noiseProcessor.updateUI();
        console.log('Noise processor initialized with enabled state:', noiseProcessor.noiseSuppressionEnabled);
    }
}

async function applyNoiseSuppressionToLocalStream(stream) {
    if (!stream || !stream.getAudioTracks().length) return stream;
    initNoiseProcessor();
    if (!noiseProcessor?.noiseSuppressionEnabled) return stream;
    try {
        return await noiseProcessor.applyNoiseSuppressionToStream(stream);
    } catch (err) {
        console.error('Noise suppression error:', err);
        return stream;
    }
}

async function applyNoiseSuppressionWithLogging(stream, logMessage) {
    if (!stream || !stream.getAudioTracks().length) {
        return stream;
    }

    const originalStream = stream;
    const processedStream = await applyNoiseSuppressionToLocalStream(stream);

    // If noise suppression was applied, log it
    if (processedStream !== originalStream) {
        console.log(logMessage);
    }

    return processedStream;
}

async function toggleNoiseSuppressionForLocalStream() {
    if (!localMediaStream || !localMediaStream.getAudioTracks().length) {
        console.warn('No audio tracks in local media stream');
        return;
    }

    initNoiseProcessor();
    noiseProcessor.toggleNoiseSuppression();

    const enabled = noiseProcessor.noiseSuppressionEnabled;
    console.log(enabled ? '✅ Enabling noise suppression...' : '❌ Disabling noise suppression...');

    const audioDeviceId = localStorageConfig.audio.devices.select.id || (audioSource && audioSource.value);
    const audioConstraints = getAudioConstraints(audioDeviceId);
    const hasPeers = thereIsPeerConnections();

    try {
        const newMicStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        const processedStream = enabled ? await applyNoiseSuppressionToLocalStream(newMicStream) : newMicStream;

        // Replace audio tracks in localMediaStream
        if (localMediaStream) {
            localMediaStream.getAudioTracks().forEach((track) => {
                track.stop();
                localMediaStream.removeTrack(track);
            });
        }
        const newAudioTrack = processedStream.getAudioTracks()[0];
        if (localMediaStream && newAudioTrack) {
            localMediaStream.addTrack(newAudioTrack);
        }

        refreshMyLocalAudioStream(localMediaStream);

        if (hasPeers) {
            refreshMyAudioStreamToPeers(localMediaStream);
            console.log(
                `Noise suppression ${enabled ? 'enabled' : 'disabled'} and stream updated to`,
                Object.keys(peerConnections).length,
                'peers'
            );
        } else {
            console.log(`Noise suppression ${enabled ? 'enabled' : 'disabled'} (no peers connected)`);
        }
    } catch (error) {
        console.error(`Error ${enabled ? 'enabling' : 'disabling'} noise suppression:`, error);
    }
}

// =====================================================
// Handle window
// =====================================================

window.addEventListener(
    'load',
    function (event) {
        resetVideoZoom();
        let resizeTimeout;
        window.addEventListener('resize', () => {
            if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
            resizeTimeout = requestAnimationFrame(function () {
                resetVideoZoom();
            });
        });
    },
    false
);

window.onbeforeunload = function (e) {
    saveLocalStorageConfig();
    saveRecording();
    stopMediaStream(localMediaStream);
    cleanupPeerConnections();
    cleanupPeerMediaElements();
    stopNoiseProcessor();
};
