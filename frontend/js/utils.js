'use strict';

function openURL(url, blank = false) {
    blank ? window.open(url, '_blank') : (window.location.href = url);
}

function IsSupportedWebRTC() {
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
        userAgent,
    );
}

function isIpad(userAgent) {
    return /macintosh/.test(userAgent) && 'ontouchend' in document;
}

function isDesktop() {
    return !isMobileDevice && !isTabletDevice && !isIPadDevice;
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

function goInFullscreen(element) {
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
    else popupMessage('warning', 'Full screen mode not supported by this browser on this device.');
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
    tmpInput.value = roomURL;
    tmpInput.select();
    tmpInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(tmpInput.value).then(() => {
        console.log('Copied to clipboard Join Link ', roomURL);
        document.body.removeChild(tmpInput);
        popupMessage(
            'info',
            `Meeting link copied to clipboard
            <p style="color: green">${roomURL}</p>
            Share the meeting link with the user you want to join.`,
        );
    });
}

async function shareRoom() {
    try {
        await navigator.share({ url: roomURL });
    } catch (err) {
        console.error('[Error] navigator share', err);
    }
}

function pasteAndSendMsg() {
    navigator.clipboard
        .readText()
        .then((text) => {
            const msg = sanitizeMsg(text);
            document.getElementsByClassName('swal2-textarea').value = msg;
            emitDcMsg(msg);
        })
        .catch((err) => {
            popupMessage('error', err);
        });
}

function copyToClipboard(text) {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            popupMessage('toast', 'Message copied!');
        })
        .catch((err) => {
            popupMessage('error', err);
        });
}

function handleBodyEvents() {
    checkElements();
    document.body.onmousemove = () => {
        if (buttonsBar.style.display == 'none' && waitingDivContainer.style.display == 'none') {
            toggleClassElements('videoHeader', 'inline');
            buttonsBar.style.display = 'block';
        }
    };
}

function checkElements() {
    if (buttonsBar.style.display != 'none') {
        toggleClassElements('videoHeader', 'none');
        buttonsBar.style.display = 'none';
    }
    setTimeout(checkElements, 20000);
}

function toggleClassElements(className, displayState) {
    const elements = document.getElementsByClassName(className);
    for (let i = 0; i < elements.length; i++) {
        elements[i].style.display = displayState;
    }
}

function sanitizeMsg(text) {
    if (text.trim().length == 0) return;
    if (isHtml(text)) return sanitizeHtml(text);
    return text;
}

function isHtml(str) {
    const a = document.createElement('div');
    a.innerHTML = str;
    for (let c = a.childNodes, i = c.length; i--; ) {
        if (c[i].nodeType == 1) return true;
    }
    return false;
}

function sanitizeHtml(str) {
    const tagsToReplace = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
    const replaceTag = (tag) => tagsToReplace[tag] || tag;
    const safe_tags_replace = (str) => str.replace(/[&<>]/g, replaceTag);
    return safe_tags_replace(str);
}

async function playSound(name) {
    let sound = '../sounds/' + name + '.mp3';
    let audioToPlay = new Audio(sound);
    try {
        audioToPlay.volume = 0.5;
        await audioToPlay.play();
    } catch (err) {
        return false;
    }
}
