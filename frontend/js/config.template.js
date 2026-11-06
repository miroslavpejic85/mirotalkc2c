'use strict';

window.APP_CONFIG = {
    home: {
        appName: 'MiroTalk C2C',
        showCopyright: true,
        showVersion: true,
        about: {
            show: true,
            url: 'https://docs.mirotalk.com/sites/c2c',
        },
        // MiroTalk apps switcher in the home top bar (hidden by default)
        appSwitcher: {
            show: false,
            domain: 'mirotalk.com', // links default to https://{app}.{domain}/
            apps: 'sfu,p2p,c2c,bro,cme,cloud', // shown apps, in order (rnd and admin are opt-in)
            urls: {}, // optional full URL per app, e.g. { sfu: 'https://meet.example.com' }
            docsUrl: 'https://docs.mirotalk.com/', // footer link, empty hides it
        },
    },
};
