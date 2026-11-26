'use strict';

const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');

// Installable app (PWA): web app manifest + service worker, configured via PWA_* env

const SERVICE_WORKER_PATH = path.join(__dirname, '../frontend/sw.js');

const DEFAULTS = {
    name: 'MiroTalk C2C',
    description:
        'Private 1-to-1 WebRTC video calls and screen sharing. No download, plug-in, or login is required. Just get straight to talking.',
    language: 'en',
    themeColor: '#0d0e12',
    backgroundColor: '#0d0e12',
    icon192: '/images/pwa/icon-192.png',
    icon512: '/images/pwa/icon-512.png',
    iconMaskable: '/images/pwa/icon-maskable-512.png',
};

const ICON_TYPES = { png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon' };

// Served instead of sw.js when the PWA is disabled, so already-installed workers remove themselves
const UNREGISTER_SERVICE_WORKER = `'use strict';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith('mirotalk-c2c-pwa')).map((key) => caches.delete(key))))
            .then(() => self.registration.unregister())
    );
});
`;

function getPwaConfig(env = process.env) {
    return {
        enabled: env.PWA_ENABLED !== 'false',
        name: env.PWA_NAME || '',
        shortName: env.PWA_SHORT_NAME || '',
        description: env.PWA_DESCRIPTION || '',
        themeColor: env.PWA_THEME_COLOR || DEFAULTS.themeColor,
        backgroundColor: env.PWA_BACKGROUND_COLOR || DEFAULTS.backgroundColor,
        icon192: env.PWA_ICON_192_PATH || DEFAULTS.icon192,
        icon512: env.PWA_ICON_512_PATH || DEFAULTS.icon512,
        iconMaskable: env.PWA_ICON_MASKABLE_PATH || DEFAULTS.iconMaskable,
    };
}

function isPwaEnabled(pwa) {
    return pwa?.enabled !== false;
}

// Keeps the manifest link + service worker registration only when the PWA is enabled
function applyPwaSection(html, pwa) {
    return html.replace(/<!-- PWA_START -->([\s\S]*?)<!-- PWA_END -->/g, (_, content) =>
        isPwaEnabled(pwa) ? content : ''
    );
}

function text(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const clean = value
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return clean || fallback;
}

function color(value, fallback) {
    return typeof value === 'string' && /^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl)a?\([\d\s.,%]+\))$/i.test(value.trim())
        ? value.trim()
        : fallback;
}

function icon(src, sizes, purpose) {
    const ext = String(src).split('?')[0].split('.').pop().toLowerCase();
    const entry = { src, sizes: ext === 'svg' ? 'any' : sizes, purpose };
    if (ICON_TYPES[ext]) entry.type = ICON_TYPES[ext];
    return entry;
}

function buildWebManifest(pwa = {}) {
    const name = text(pwa.name, DEFAULTS.name);
    const shortName = text(pwa.shortName, name);
    const icon192 = text(pwa.icon192, DEFAULTS.icon192);
    const icon512 = text(pwa.icon512, DEFAULTS.icon512);
    const iconMaskable = text(pwa.iconMaskable, DEFAULTS.iconMaskable);

    return {
        id: '/',
        name,
        short_name: shortName,
        description: text(pwa.description, DEFAULTS.description),
        lang: DEFAULTS.language,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: color(pwa.themeColor, DEFAULTS.themeColor),
        background_color: color(pwa.backgroundColor, DEFAULTS.backgroundColor),
        categories: ['business', 'productivity', 'social'],
        icons: [
            icon(icon192, '192x192', 'any'),
            icon(icon512, '512x512', 'any'),
            icon(iconMaskable, '512x512', 'maskable'),
        ],
    };
}

let serviceWorkerSource = null;

// The app version is baked into the worker so every release is byte-different and refreshes its cache
function buildServiceWorker(pwa = {}) {
    if (!isPwaEnabled(pwa)) return UNREGISTER_SERVICE_WORKER;
    if (serviceWorkerSource === null) {
        serviceWorkerSource = fs
            .readFileSync(SERVICE_WORKER_PATH, 'utf-8')
            .replace(/__APP_VERSION__/g, String(packageJson.version).replace(/[^\w.-]/g, ''));
    }
    return serviceWorkerSource;
}

module.exports = { getPwaConfig, isPwaEnabled, applyPwaSection, buildWebManifest, buildServiceWorker };
