'use strict';

console.log('Location', window.location);
console.log('LocalStorage', window.localStorage);

const roomId = filterXSS(new URLSearchParams(window.location.search).get('room') || '');

const roomIdIn = document.getElementById('roomIdInput');
const userNameIn = document.getElementById('userNameInput');
const randomRoomBtn = document.getElementById('randomRoomBtn');
const joinBtn = document.getElementById('joinBtn');
const supportBtn = document.getElementById('supportBtn');

const config = {
    support: true,
    //...
};

document.addEventListener('DOMContentLoaded', function () {
    initHome();
});

async function initHome() {
    roomIdIn.value = roomId ? roomId : filterXSS(window.localStorage.room) || '';

    const getUserName = async () => {
        try {
            const { data: profile } = await axios.get('/profile', { timeout: 5000 });
            if (profile && profile.name) {
                console.log('AXIOS GET OIDC Profile retrieved successfully', profile);
                window.localStorage.name = profile.name;
            }
        } catch (error) {
            console.error('AXIOS OIDC Error fetching profile', error.message || error);
        }
        return window.localStorage.name || '';
    };

    userNameIn.value = filterXSS(await getUserName());

    randomRoomBtn.onclick = () => {
        roomIdIn.value = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
        );
        userNameIn.value = 'User_' + Math.floor(Math.random() * 1000000);
    };

    joinBtn.onclick = () => {
        if (roomIdIn.value && userNameIn.value) {
            const joinURL = window.location.origin + '/join?room=' + roomIdIn.value + '&name=' + userNameIn.value;
            window.history.pushState({ url: joinURL }, roomIdIn.value, joinURL);
            window.localStorage.room = roomIdIn.value;
            window.localStorage.name = userNameIn.value;
        }
    };

    supportBtn.onclick = () => {
        window.open('https://codecanyon.net/user/miroslavpejic85', '_blank');
    };

    !config.support && elementDisplay(supportBtn, false);
    //...
}

function elementDisplay(elem, display) {
    elem.style.display = display ? 'block' : 'none';
}
