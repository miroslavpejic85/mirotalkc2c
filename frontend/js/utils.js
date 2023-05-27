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
            'clean',
            'Room sharing',
            `<div id="qrRoomContainer">
                <canvas id="qrRoom"></canvas>
            </div>
            <br/>
            <p style="color:rgb(8, 189, 89);">Join from your mobile device</p>
            <p style="background:transparent; color:white; font-family: Arial, Helvetica, sans-serif;">No need for apps, simply capture the QR code with your mobile camera Or Invite someone else to join by sending them the following URL</p>
            <p style="color:rgb(8, 189, 89);">${roomURL}</p>`,
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
            elemDisplay(buttonsBar, true);
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

function getTime() {
    const date = new Date();
    return date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}

function escapeSpecialChars(regex) {
    return regex.replace(/([()[{*+.$^\\|?])/g, '\\$1');
}

function getLineBreaks(message) {
    return (message.match(/\n/g) || []).length;
}

function elemDisplay(element, display, mode = 'block') {
    element.style.display = display ? mode : 'none';
}

function elemDisable(element, disable) {
    element.disabled = disable;
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

function makeRoomQR() {
    let qr = new QRious({
        element: document.getElementById('qrRoom'),
        value: roomURL,
    });
    qr.set({
        size: 256,
    });
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
