'use strict';

// npx mocha tests/test-pwa.js

require('should');

const fs = require('fs');
const path = require('path');

const { getPwaConfig, applyPwaSection, buildWebManifest, buildServiceWorker } = require('../backend/pwa');

describe('test-pwa', () => {
    const pages = ['home.html', 'client.html'].map((file) =>
        fs.readFileSync(path.join(__dirname, '../frontend/html', file), 'utf8')
    );

    it('manifest is installable with defaults (standalone, root scope, 192/512 + maskable icons)', () => {
        const manifest = buildWebManifest(getPwaConfig({}));
        manifest.name.should.equal('MiroTalk C2C');
        manifest.short_name.should.equal('MiroTalk C2C');
        manifest.display.should.equal('standalone');
        manifest.start_url.should.equal('/');
        manifest.scope.should.equal('/');
        manifest.icons
            .map((i) => `${i.sizes}:${i.purpose}:${i.type}`)
            .should.eql(['192x192:any:image/png', '512x512:any:image/png', '512x512:maskable:image/png']);
    });

    it('manifest follows PWA_* env and sanitizes it', () => {
        const manifest = buildWebManifest(
            getPwaConfig({
                PWA_NAME: 'Acme <b>Meet</b>',
                PWA_SHORT_NAME: 'Acme',
                PWA_DESCRIPTION: '<h1>Calls</h1> for teams',
                PWA_THEME_COLOR: '#ff0000',
                PWA_BACKGROUND_COLOR: 'red;}',
                PWA_ICON_512_PATH: '/logo.svg',
            })
        );
        manifest.name.should.equal('Acme Meet');
        manifest.short_name.should.equal('Acme');
        manifest.description.should.equal('Calls for teams');
        manifest.theme_color.should.equal('#ff0000');
        manifest.background_color.should.equal('#0d0e12');
        manifest.icons[1].should.eql({ src: '/logo.svg', sizes: 'any', purpose: 'any', type: 'image/svg+xml' });
    });

    it('service worker carries the app version, or unregisters itself when the PWA is disabled', () => {
        const { version } = require('../package.json');
        const sw = buildServiceWorker(getPwaConfig({}));
        sw.should.containEql('`${CACHE_PREFIX}-' + version + '`');
        sw.should.not.containEql('__APP_VERSION__');
        const disabled = buildServiceWorker(getPwaConfig({ PWA_ENABLED: 'false' }));
        disabled.should.containEql('self.registration.unregister()');
        disabled.should.not.containEql("addEventListener('fetch'");
    });

    for (const enabled of [true, false]) {
        it(`pages ${enabled ? 'link' : 'omit'} the manifest and service worker when PWA_ENABLED=${enabled}`, () => {
            const pwa = getPwaConfig({ PWA_ENABLED: String(enabled) });
            for (const page of pages) {
                const html = applyPwaSection(page, pwa);
                html.includes('<link rel="manifest" href="/manifest.webmanifest" />').should.equal(enabled);
                html.includes('src="../js/pwa.js"').should.equal(enabled);
                html.should.not.containEql('PWA_START');
                html.should.not.containEql('PWA_END');
            }
        });
    }
});
