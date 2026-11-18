'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const utilsSource = fs.readFileSync(path.join(__dirname, '../frontend/js/utils.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(__dirname, '../frontend/js/client.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(__dirname, '../frontend/js/storage.js'), 'utf8');

function extractFunction(source, name) {
    const start = source.indexOf(`function ${name}(`);
    const end = source.indexOf('\n}', start) + 2;
    return source.slice(start, end);
}

function createContext({ mobile = false, narrow = false, pinnedSetting = null } = {}) {
    const classes = new Set();
    const customProperties = new Map();
    const buttonsBar = { offsetHeight: 50, style: { display: 'flex' } };
    const waitingBar = { offsetHeight: 60, style: { display: 'flex' } };
    const config = {
        video: {
            settings: {
                buttons_bar_pinned: pinnedSetting,
            },
        },
    };
    const context = vm.createContext({
        isMobileDevice: mobile,
        localStorageConfig: config,
        buttonsBar,
        waitingDivContainer: { style: { display: 'block' } },
        waitingBar,
        document: {
            getElementById: () => waitingBar,
            documentElement: {
                style: {
                    getPropertyValue: (key) => customProperties.get(key) || '',
                    setProperty: (key, value) => customProperties.set(key, value),
                },
            },
            body: { classList: { toggle: (name, force) => (force ? classes.add(name) : classes.delete(name)) } },
        },
        getComputedStyle: (element) => ({
            display: element.style.display || 'flex',
            bottom: '14px',
            paddingTop: '20px',
        }),
        elemDisplay: (element, show) => {
            element.style.display = show ? 'flex' : 'none';
        },
        animateCSS: (element, animation) => {
            context.animations.push({ element, animation });
            return Promise.resolve();
        },
        toggleClassElements() {},
        setTimeout() {},
        window: { matchMedia: () => ({ matches: narrow }) },
        animations: [],
        classes,
        customProperties,
    });
    vm.runInContext(extractFunction(utilsSource, 'isButtonsBarPinned'), context);
    vm.runInContext(extractFunction(utilsSource, 'checkElements'), context);
    vm.runInContext(extractFunction(clientSource, 'syncButtonsBarReserve'), context);
    return { context, config, classes, customProperties };
}

describe('main buttons visibility preference', () => {
    it('defaults to pinned on mobile and narrow screens', () => {
        assert.equal(vm.runInContext('isButtonsBarPinned()', createContext({ mobile: true }).context), true);
        assert.equal(vm.runInContext('isButtonsBarPinned()', createContext({ narrow: true }).context), true);
        assert.equal(vm.runInContext('isButtonsBarPinned()', createContext().context), false);
    });

    it('allows the saved setting to override the automatic behavior', () => {
        assert.equal(vm.runInContext('isButtonsBarPinned()', createContext({ pinnedSetting: true }).context), true);
        assert.equal(
            vm.runInContext('isButtonsBarPinned()', createContext({ mobile: true, pinnedSetting: false }).context),
            false
        );
    });

    it('auto-hides the pre-join controls when visibility is disabled', async () => {
        const { context } = createContext({ pinnedSetting: false });
        vm.runInContext('checkElements()', context);
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(vm.runInContext('waitingBar.style.display', context), 'none');
        assert.equal(vm.runInContext('animations[0].animation', context), 'fadeOutDown');
    });

    it('synchronizes the video layout immediately after a preference change', () => {
        const { context, customProperties, classes } = createContext({ pinnedSetting: true });
        vm.runInContext('syncButtonsBarReserve()', context);
        assert.equal(customProperties.get('--waiting-bar-reserve'), '46px');
        assert.equal(classes.has('waiting-bar-reserved'), true);

        vm.runInContext(
            'localStorageConfig.video.settings.buttons_bar_pinned = false; syncButtonsBarReserve()',
            context
        );
        assert.equal(customProperties.get('--waiting-bar-reserve'), '0px');
        assert.equal(classes.has('waiting-bar-reserved'), false);
    });

    it('adds the automatic setting default to stored configurations', () => {
        const context = vm.createContext({
            localStorage: {
                getItem: () => null,
                setItem() {},
            },
        });
        vm.runInContext(storageSource, context);
        assert.equal(
            vm.runInContext('new LocalStorage().getConfig().video.settings.buttons_bar_pinned', context),
            null
        );
    });
});
