'use strict';

/**
 * MiroTalk C2C - Installable app (PWA)
 *
 * Registers the service worker (/sw.js) so browsers offer "Install app" (desktop window,
 * dock / home screen icon). Loaded only when the PWA is enabled (PWA_ENABLED).
 */

(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    // Embedded (iframe) calls belong to the host site, not to an installable app
    if (window.self !== window.top) return;

    const register = () =>
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .catch((error) => console.warn('[PWA] Service worker registration failed', error));

    if (document.readyState === 'complete') {
        register();
    } else {
        window.addEventListener('load', register, { once: true });
    }
})();
