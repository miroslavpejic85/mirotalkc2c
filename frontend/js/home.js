'use strict';

const savedTheme = window.localStorage.getItem('home-theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
document.documentElement.dataset.theme = ['light', 'dark'].includes(savedTheme) ? savedTheme : preferredTheme;

const homeConfig = window.APP_CONFIG?.home || {};

console.log('Location', window.location);
console.log('LocalStorage', window.localStorage);

const roomId = filterXSS(new URLSearchParams(window.location.search).get('room') || '');

const roomIdIn = document.getElementById('roomIdInput');
const userNameIn = document.getElementById('userNameInput');
const joinForm = document.getElementById('joinForm');
const randomRoomBtn = document.getElementById('randomRoomBtn');
const randomUserBtn = document.getElementById('randomUserBtn');
const initAudioBtn = document.getElementById('initAudioBtn');
const initVideoBtn = document.getElementById('initVideoBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const homeBrand = document.getElementById('homeBrand');
const appName = document.getElementById('appName');
const copyrightLabel = document.getElementById('copyrightLabel');
const aboutBtn = document.getElementById('aboutBtn');

const LS = new LocalStorage();
const localStorageConfig = LS.getConfig();

const mediaIcons = {
    audioOn: 'fas fa-microphone',
    audioOff: 'fas fa-microphone-slash',
    videoOn: 'fas fa-video',
    videoOff: 'fas fa-video-slash',
};

document.addEventListener('DOMContentLoaded', function () {
    initHome();
});

async function initHome() {
    applyHomeConfig();
    updateThemeToggle(document.documentElement.dataset.theme);

    themeToggleBtn.onclick = () => {
        const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        window.localStorage.setItem('home-theme', theme);
        updateThemeToggle(theme);
    };

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
        const finalValue = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
            (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
        );
        shuffleText(roomIdIn, finalValue);
    };

    randomUserBtn.onclick = () => {
        const finalValue = 'User_' + Math.floor(Math.random() * 1000000);
        shuffleText(userNameIn, finalValue);
    };

    updateMediaToggle(initAudioBtn, 'audio', localStorageConfig.audio.init.active);
    updateMediaToggle(initVideoBtn, 'video', localStorageConfig.video.init.active);

    initAudioBtn.onclick = () => {
        const active = !localStorageConfig.audio.init.active;
        localStorageConfig.audio.init.active = active;
        LS.setConfig(localStorageConfig);
        updateMediaToggle(initAudioBtn, 'audio', active);
    };

    initVideoBtn.onclick = () => {
        const active = !localStorageConfig.video.init.active;
        localStorageConfig.video.init.active = active;
        LS.setConfig(localStorageConfig);
        updateMediaToggle(initVideoBtn, 'video', active);
    };

    joinForm.onsubmit = (event) => {
        event.preventDefault();

        const room = roomIdIn.value.trim();
        const name = userNameIn.value.trim();
        if (!room || !name) return;

        const params = new URLSearchParams({ room, name });
        window.localStorage.room = room;
        window.localStorage.name = name;
        window.location.assign('/join?' + params.toString());
    };

    const aboutUrl = getSafeAboutUrl(homeConfig.about?.url);
    elementDisplay(copyrightLabel, homeConfig.showCopyright !== false);
    elementDisplay(aboutBtn, homeConfig.about?.show !== false && Boolean(aboutUrl));
    if (aboutUrl) aboutBtn.href = aboutUrl;
    //...
}

function getSafeAboutUrl(configuredUrl) {
    try {
        const aboutUrl = new URL(String(configuredUrl || '').trim(), window.location.origin);
        return ['http:', 'https:'].includes(aboutUrl.protocol) ? aboutUrl.href : '';
    } catch {
        return '';
    }
}

function applyHomeConfig() {
    const configuredAppName = String(homeConfig.appName || '').trim();
    if (!configuredAppName) return;

    const nameParts = configuredAppName.split(/\s+/);
    const accentPart = nameParts.pop();

    appName.replaceChildren();
    if (nameParts.length) {
        appName.append(document.createTextNode(nameParts.join(' ') + ' '));
    }
    const accentName = document.createElement('strong');
    accentName.textContent = accentPart;
    appName.append(accentName);

    document.title = configuredAppName + ' — Private video calls in your browser';
    document.querySelector('meta[name="description"]').content =
        configuredAppName + ' WebRTC real-time cam-2-cam video calls and screen sharing, end-to-end encrypted.';
    document.querySelector('meta[property="og:site_name"]').content = configuredAppName;
    homeBrand.setAttribute('aria-label', configuredAppName + ' home');
    copyrightLabel.textContent = '© ' + new Date().getFullYear() + ' ' + configuredAppName;
    const aboutLabel = 'About ' + configuredAppName;
    aboutBtn.title = aboutLabel;
    aboutBtn.setAttribute('aria-label', aboutLabel);
}

function updateThemeToggle(theme) {
    const isDark = theme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    const label = 'Switch to ' + nextTheme + ' theme';
    const icon = themeToggleBtn.querySelector('i');

    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    themeToggleBtn.title = label;
    themeToggleBtn.setAttribute('aria-label', label);
    themeToggleBtn.setAttribute('aria-pressed', String(isDark));
}

function shuffleText(input, finalValue, duration = 600) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const steps = 10;
    const interval = duration / steps;
    let step = 0;

    input.classList.add('shuffle-active');

    const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        let display = '';
        for (let i = 0; i < finalValue.length; i++) {
            if (i < finalValue.length * progress) {
                display += finalValue[i];
            } else {
                display += chars[Math.floor(Math.random() * chars.length)];
            }
        }
        input.value = display;

        if (step >= steps) {
            clearInterval(timer);
            input.value = finalValue;
            setTimeout(() => input.classList.remove('shuffle-active'), 300);
        }
    }, interval);
}

function updateMediaToggle(btn, kind, active) {
    const icon = btn.querySelector('i');
    const state = btn.querySelector('.toggle-state');
    if (icon) {
        icon.className = active ? mediaIcons[kind + 'On'] : mediaIcons[kind + 'Off'];
    }
    if (state) {
        state.textContent = active ? 'On' : 'Off';
    }
    btn.classList.toggle('off', !active);
    btn.setAttribute('aria-pressed', String(active));
}

function elementDisplay(elem, display) {
    elem.hidden = !display;
}
