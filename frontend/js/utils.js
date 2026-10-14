'use strict';

function openURL(url, blank = false) {
    blank ? window.open(url, '_blank') : (window.location.href = url);
}

function checkWebRTCSupported() {
    let isWebRTCSupported = false;
    ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection', 'RTCIceGatherer'].forEach(function (item) {
        if (isWebRTCSupported) return;
        if (item in window) {
            isWebRTCSupported = true;
        }
    });
    return isWebRTCSupported;
}

function isMobile(userAgent) {
    return !!/Android|webOS|iPhone|iPad|iPod|BB10|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(userAgent || '');
}

function isTablet(userAgent) {
    return /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(
        userAgent
    );
}

function isIpad(userAgent) {
    return /macintosh/.test(userAgent) && 'ontouchend' in document;
}

function isDesktop() {
    return !isMobileDevice && !isTabletDevice && !isIPadDevice;
}

function handleMediaError(mediaType, err) {
    playSound('error');

    let errMessage = err;

    switch (err.name) {
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            errMessage = 'Required track is missing';
            break;
        case 'NotReadableError':
        case 'TrackStartError':
            errMessage = 'Already in use';
            break;
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
            errMessage = 'Constraints cannot be satisfied by available devices';
            break;
        case 'NotAllowedError':
        case 'PermissionDeniedError':
            errMessage = 'Permission denied in browser';
            break;
        case 'TypeError':
            errMessage = 'Empty constraints object';
            break;
        default:
            break;
    }

    const $html = `
        <ul style="text-align: left">
            <li>Media type: ${mediaType}</li>
            <li>Error name: ${err.name}</li>
            <li>Error message: <p style="color: red">${errMessage}<p></li>
            <li>Common: <a href="https://blog.addpipe.com/common-getusermedia-errors" target="_blank">getUserMedia errors</a></li>
        </ul>
    `;

    popupHtmlMessage(null, image.forbidden, 'Access denied', $html, 'center', '/');

    throw new Error(
        `Access denied for ${mediaType} device [${err.name}]: ${errMessage} check the common getUserMedia errors: https://blog.addpipe.com/common-getusermedia-errors/`
    );
}

function logStreamSettingsInfo(name, stream) {
    if (hasVideoTrack(stream)) {
        console.log(name, {
            video: {
                label: stream.getVideoTracks()[0].label,
                settings: stream.getVideoTracks()[0].getSettings(),
            },
        });
    }
    if (hasAudioTrack(stream)) {
        console.log(name, {
            audio: {
                label: stream.getAudioTracks()[0].label,
                settings: stream.getAudioTracks()[0].getSettings(),
            },
        });
    }
}

function detectCameraFacingMode(stream) {
    if (!stream || !stream.getVideoTracks().length) {
        console.warn("No video track found in the stream. Defaulting to 'user'.");
        return 'user';
    }
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    const capabilities = videoTrack.getCapabilities?.() || {};
    const facingMode = settings.facingMode || capabilities.facingMode?.[0] || 'user';
    return facingMode === 'environment' ? 'environment' : 'user';
}

function handleCameraMirror(video, camera) {
    if (!video) return;
    camera === 'environment' ? video.classList.remove('mirror') : video.classList.add('mirror');
}

function hasAudioTrack(mediaStream) {
    return mediaStream && mediaStream.getAudioTracks().length > 0;
}

function hasVideoTrack(mediaStream) {
    return mediaStream && mediaStream.getVideoTracks().length > 0;
}

function getEnabledTrack(stream, trackType) {
    if (trackType === 'video' && hasVideoTrack(stream)) {
        return stream.getVideoTracks()[0];
    }
    if (trackType === 'audio' && hasAudioTrack(stream)) {
        return stream.getAudioTracks()[0];
    }
    return null;
}

function enableAllAudioTracks(stream) {
    stream && stream.getAudioTracks().forEach((track) => (track.enabled = true));
}

function refreshTrackState(track) {
    if (track) track.enabled = true;
}

function safeXSS(input) {
    // Strict allowlist: escape ALL HTML tags/attributes so chat messages received
    // over the P2P DataChannel cannot inject <a> phishing links, autoplaying
    // <audio>/<video>, or event-handler attributes into other peers' chat panels.
    return typeof filterXSS === 'function' ? filterXSS(input, { whiteList: {}, css: false }) : input;
}

function removeAllChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
}

function removeElement(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

function stopMediaStream(stream) {
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
    }
}

function isDisplayStream(stream) {
    return (
        stream &&
        stream.getVideoTracks().some((track) => {
            const label = track.label.toLowerCase();
            return (
                label.includes('screen') ||
                label.includes('display') ||
                (track.kind === 'video' && track.getSettings && track.getSettings().displaySurface)
            );
        })
    );
}

function cleanupPeerMediaElements() {
    Object.values(peerMediaElements).forEach((el) => removeElement(el.parentNode));
    peerMediaElements = {};
}

function cleanupPeerConnections() {
    Object.values(peerConnections).forEach((pc) => pc.close());
    peerConnections = {};
    dataChannels = {};
}

function buildUniqueMediaStream(stream) {
    const tracks = [];
    const seenIds = new Set();
    stream.getTracks().forEach((track) => {
        if (!seenIds.has(track.id)) {
            tracks.push(track);
            seenIds.add(track.id);
        }
    });
    return new MediaStream(tracks);
}

async function getBestUserMedia(constraints) {
    try {
        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
        console.warn('[Warning] audio+video denied or not present', err);
    }

    // Request each device on its own so one busy or missing device does not take down the other
    const stream = new MediaStream();
    if (constraints.audio) {
        try {
            const audioStream = await getUserMediaWithDeviceFallback('audioinput', (deviceId) => ({
                audio: withDeviceId(constraints.audio, deviceId),
                video: false,
            }));
            audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
        } catch (err) {
            console.warn('[Warning] audio denied or not present', err);
            notifyBusyDevice('audio', err);
        }
    }
    if (constraints.video) {
        try {
            const videoStream = await getUserMediaWithDeviceFallback('videoinput', (deviceId) => ({
                audio: false,
                video: withDeviceId(constraints.video, deviceId),
            }));
            videoStream.getVideoTracks().forEach((track) => stream.addTrack(track));
        } catch (err) {
            console.warn('[Warning] video denied or not present', err);
            notifyBusyDevice('video', err);
        }
    }
    return stream;
}

function withDeviceId(constraint, deviceId) {
    if (!deviceId || !constraint) return constraint;
    return { ...(constraint === true ? {} : constraint), deviceId: { exact: deviceId } };
}

/**
 * Request a media stream with the given constraints; if the requested device is busy or broken
 * (e.g. held by OBS) try the other devices of the same kind before giving up.
 * @param {string} kind 'audioinput' or 'videoinput'
 * @param {function} getConstraints builds the constraints for a device id (undefined = requested device)
 * @returns {Promise<MediaStream>} the first stream that could be opened
 * @throws the error of the requested device when no device could be opened
 */
async function getUserMediaWithDeviceFallback(kind, getConstraints) {
    try {
        return await navigator.mediaDevices.getUserMedia(getConstraints());
    } catch (err) {
        // Other devices cannot help if the user denied the permission or the constraints are invalid
        if (['NotAllowedError', 'PermissionDeniedError', 'TypeError'].includes(err.name)) throw err;

        console.warn(`Requested ${kind} unavailable [${err.name}], trying the other devices`);
        let devices = [];
        try {
            devices = await navigator.mediaDevices.enumerateDevices();
        } catch (enumErr) {
            console.warn('Unable to enumerate devices', enumErr);
        }
        const candidates = devices.filter((d) => d.kind === kind && d.deviceId && d.deviceId !== 'default');
        for (const device of candidates) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(getConstraints(device.deviceId));
                console.log(`Using ${kind} fallback device`, device.label || device.deviceId);
                return stream;
            } catch (fallbackErr) {
                console.warn(`Fallback ${kind} unavailable`, device.label || device.deviceId, fallbackErr.name);
            }
        }
        throw err;
    }
}

/**
 * Get the id of the device behind the first audio or video track of a stream
 * @param {MediaStream} stream
 * @param {string} kind 'audio' or 'video'
 * @returns {string|undefined} device id
 */
function getStreamDeviceId(stream, kind) {
    const tracks = kind === 'audio' ? stream?.getAudioTracks?.() : stream?.getVideoTracks?.();
    return tracks?.[0]?.getSettings?.().deviceId;
}

/**
 * Select the device in the select element, if the option exists (does not fire onchange)
 * @param {HTMLSelectElement} select
 * @param {string} deviceId
 * @returns {boolean} true if the select was updated
 */
function selectDevice(select, deviceId) {
    if (!select || !deviceId) return false;
    const exists = Array.from(select.options).some((option) => option.value === deviceId);
    if (exists) select.value = deviceId;
    return exists;
}

/**
 * Tell the user that a device is busy or broken (not simply missing or denied)
 * @param {string} mediaType 'audio' or 'video'
 * @param {object} err
 */
function notifyBusyDevice(mediaType, err) {
    if (!['NotReadableError', 'TrackStartError', 'AbortError'].includes(err?.name)) return;
    const device = mediaType === 'audio' ? 'microphone' : 'camera';
    popupMessage(
        'toast',
        'Device busy',
        `The ${device} is busy or unavailable (maybe used by another app). Try another device.`,
        'top',
        6000
    );
}

async function getScreenWithMic(constraints) {
    const screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    let micStream = null;
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.warn('[Warning] Could not get mic for screen sharing', err);
    }

    const hasSystemAudio = screenStream.getAudioTracks().length > 0;
    const hasMicAudio = micStream && micStream.getAudioTracks().length > 0;

    if (hasSystemAudio) {
        // If system audio is present, use only system audio (browser will not allow mixing in most cases)
        // Optionally, you could warn the user that mic audio will not be sent
        return screenStream;
    } else if (hasMicAudio) {
        // Only mic audio, add to screen stream
        micStream.getAudioTracks().forEach((track) => screenStream.addTrack(track));
    }

    // else: only video, nothing to do
    return screenStream;
}

function setTippy(element, content, placement) {
    // Tooltip text doubles as the accessible name for icon-only buttons (also on mobile, where tooltips are off)
    if (element && element.tagName === 'BUTTON' && !element.getAttribute('aria-label')) {
        element.setAttribute('aria-label', content);
    }
    if (isMobileDevice) return;
    if (element) {
        if (element._tippy) {
            element._tippy.destroy();
        }
        try {
            tippy(element, {
                content: content,
                placement: placement,
            });
        } catch (err) {
            console.error('setTippy error', err.message);
        }
    } else {
        console.warn('setTippy element not found with content', content);
    }
}

function changeAspectRatio(aspectRatio) {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((video) => {
        video.style.objectFit = aspectRatio ? 'contain' : 'cover';
    });
}

function isFullScreen() {
    const elementFullScreen =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        null;
    if (elementFullScreen === null) return false;
    return true;
}

function isFullScreenSupported() {
    return (
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled
    );
}

function goInFullscreen(element) {
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
    else popupMessage('warning', 'Full screen', 'Full screen mode not supported by this browser on this device.');
}

function goOutFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
}

function copyRoom() {
    const tmpInput = document.createElement('input');
    document.body.appendChild(tmpInput);
    tmpInput.style.display = 'none';
    tmpInput.value = roomURL;
    tmpInput.select();
    tmpInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(tmpInput.value).then(() => {
        console.log('Copied to clipboard Join Link ', roomURL);
        document.body.removeChild(tmpInput);
        popupMessage(
            'html',
            'Room sharing',
            `<div id="qrRoomContainer">
                <canvas id="qrRoom"></canvas>
            </div>
            <br/>
            <p class="qr-room-heading">Join from your mobile device</p>
            <p class="qr-room-description">No app needed. Scan the QR code with your mobile camera or share the room link below.</p>
            <p class="qr-room-url">${roomURL}</p>`
        );
        makeRoomQR();
    });
}

async function shareRoom() {
    try {
        await navigator.share({ url: roomURL });
    } catch (err) {
        console.error('[Error] navigator share', err);
    }
}

function handleBodyEvents() {
    checkElements();
    document.body.onmousemove = () => {
        if (buttonsBar.style.display == 'none' && waitingDivContainer.style.display == 'none') {
            toggleClassElements('videoHeader', true);
            elemDisplay(buttonsBar, true, 'flex');
            animateCSS(buttonsBar, 'fadeInUp');
        }
    };
}

function checkElements() {
    if (buttonsBar.style.display != 'none') {
        toggleClassElements('videoHeader', false);
        animateCSS(buttonsBar, 'fadeOutDown').then((msg) => {
            elemDisplay(buttonsBar, false);
        });
    }
    setTimeout(checkElements, 20000);
}

function toggleClassElements(className, displayState) {
    const elements = document.getElementsByClassName(className);
    for (let i = 0; i < elements.length; i++) {
        elemDisplay(elements[i], displayState);
    }
}

function startSessionTime() {
    let sessionElapsedTime = 0;
    setInterval(function printTime() {
        sessionElapsedTime++;
        sessionTime.innerText = secondsToHms(sessionElapsedTime);
    }, 1000);
}

function secondsToHms(d) {
    d = Number(d);
    let h = Math.floor(d / 3600);
    let m = Math.floor((d % 3600) / 60);
    let s = Math.floor((d % 3600) % 60);
    let hDisplay = h > 0 ? h + 'h' : '';
    let mDisplay = m > 0 ? m + 'm' : '';
    let sDisplay = s > 0 ? s + 's' : '';
    return hDisplay + ' ' + mDisplay + ' ' + sDisplay;
}

function getTime(seconds = true) {
    const date = new Date();
    return date.getHours() + ':' + date.getMinutes() + (seconds ? ':' + date.getSeconds() : '');
}

function getDataTimeString() {
    const d = new Date();
    const date = d.toISOString().split('T')[0];
    const time = d.toTimeString().split(' ')[0];
    return `${date}-${time}`;
}

function escapeSpecialChars(regex) {
    return regex.replace(/([()[{*+.$^\\|?])/g, '\\$1');
}

function getLineBreaks(message) {
    return (message.match(/\n/g) || []).length;
}

function elemDisplay(element, display, mode = 'block') {
    if (element) element.style.display = display ? mode : 'none';
}

function elemDisable(element, disable) {
    if (element) element.disabled = disable;
}

function animateCSS(element, animation, prefix = 'animate__') {
    return new Promise((resolve, reject) => {
        const animationName = `${prefix}${animation}`;
        element.classList.add(`${prefix}animated`, animationName);
        function handleAnimationEnd(event) {
            event.stopPropagation();
            element.classList.remove(`${prefix}animated`, animationName);
            resolve('Animation ended');
        }
        element.addEventListener('animationend', handleAnimationEnd, { once: true });
    });
}

function handleClickOutside(targetElement, triggerElement, callback, minWidth = 0) {
    document.addEventListener('click', (e) => {
        if (minWidth && window.innerWidth > minWidth) return;
        let el = e.target;
        let shouldExclude = false;
        while (el) {
            if (el instanceof HTMLElement && (el === targetElement || el === triggerElement)) {
                shouldExclude = true;
                break;
            }
            el = el.parentElement;
        }
        if (!shouldExclude) callback();
    });
}

function makeDraggable(element, dragObj) {
    let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    if (dragObj) {
        dragObj.onmousedown = dragMouseDown;
    } else {
        element.onmousedown = dragMouseDown;
    }
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = element.offsetTop - pos2 + 'px';
        element.style.left = element.offsetLeft - pos1 + 'px';
    }
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function makeUnDraggable(element, dragObj) {
    if (dragObj) {
        dragObj.onmousedown = null;
    } else {
        element.onmousedown = null;
    }
    element.style.top = '';
    element.style.left = '';
}

function makeRoomQR() {
    const qr = new QRious({
        element: document.getElementById('qrRoom'),
        value: roomURL,
    });
    qr.set({
        size: 256,
    });
}

function setPeerVideoAvatarImgName(elem, peerName) {
    if (!elem) return;

    const fallbackSrc = elem.getAttribute('src');
    elem.classList.add('camera-off-avatar');

    if (!isValidEmail(peerName)) return;

    const profileImage = new Image();
    profileImage.onload = () => {
        elem.src = profileImage.src;
        elem.classList.remove('camera-off-avatar');
        elem.classList.add('profile-avatar');
    };
    profileImage.onerror = () => {
        elem.src = fallbackSrc;
    };
    profileImage.src = genGravatar(peerName);
}

function genGravatar(email, size = false) {
    const hash = md5(email.toLowerCase().trim());
    const params = new URLSearchParams({ s: size || 250, d: '404' });
    return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`;
    function md5(input) {
        return CryptoJS.MD5(input).toString();
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function getCurrentTimeString() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function playSound(name) {
    const sound = '../sounds/' + name + '.mp3';
    const audioToPlay = new Audio(sound);
    try {
        audioToPlay.volume = 0.5;
        await audioToPlay.play();
    } catch (err) {
        return false;
    }
}
