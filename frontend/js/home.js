'use strict';

console.log('Location', window.location);
console.log('LocalStorage', window.localStorage);

const roomId = filterXSS(new URLSearchParams(window.location.search).get('room') || '');

const roomIdIn = document.getElementById('roomIdInput');
const userNameIn = document.getElementById('userNameInput');
const joinBtn = document.getElementById('joinBtn');

function initHome() {
    roomIdIn.value = roomId ? roomId : filterXSS(window.localStorage.room) || '';
    userNameIn.value = filterXSS(window.localStorage.name) || '';

    joinBtn.onclick = () => {
        if (roomIdIn.value && userNameIn.value) {
            const joinURL = window.location.origin + '/join?room=' + roomIdIn.value + '&name=' + userNameIn.value;
            window.history.pushState({ url: joinURL }, roomIdIn.value, joinURL);
            window.localStorage.room = roomIdIn.value;
            window.localStorage.name = userNameIn.value;
        }
    };
}
