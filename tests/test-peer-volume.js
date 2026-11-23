'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const clientSource = fs.readFileSync(path.join(__dirname, '../frontend/js/client.js'), 'utf8');

function extractFunction(source, name) {
    const start = source.indexOf(`function ${name}(`);
    const end = source.indexOf('\n}', start) + 2;
    return source.slice(start, end);
}

function makeTarget(props = {}) {
    const listeners = {};
    return Object.assign(props, {
        attributes: {},
        addEventListener(type, handler) {
            (listeners[type] ??= []).push(handler);
        },
        emit(type) {
            (listeners[type] || []).forEach((handler) => handler());
        },
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
    });
}

// Fires volumechange like a real HTMLMediaElement when volume or muted change
function makeMedia() {
    let volume = 1;
    let muted = false;
    const media = makeTarget();
    Object.defineProperty(media, 'volume', {
        get: () => volume,
        set: (value) => {
            if (value !== volume) ((volume = value), media.emit('volumechange'));
        },
    });
    Object.defineProperty(media, 'muted', {
        get: () => muted,
        set: (value) => {
            if (value !== muted) ((muted = value), media.emit('volumechange'));
        },
    });
    return media;
}

function createContext() {
    const context = vm.createContext({
        className: { volumeOn: 'volume-on', volumeOff: 'volume-off' },
        peerVolumes: {},
    });
    vm.runInContext(extractFunction(clientSource, 'handlePeerVolume'), context);
    return context;
}

function setup(context, peerId = 'peer-1') {
    const media = makeMedia();
    const btn = makeTarget({ className: '' });
    const slider = makeTarget({ value: '' });
    context.handlePeerVolume(peerId, btn, slider, media);
    return { media, btn, slider };
}

describe('Remote peer volume control', () => {
    it('mutes and unmutes the peer media with the volume button', () => {
        const { media, btn, slider } = setup(createContext());
        assert.equal(btn.className, 'volume-on');
        assert.equal(slider.value, '100');

        btn.emit('click');
        assert.equal(media.muted, true);
        assert.equal(btn.className, 'volume-off');
        assert.equal(slider.value, '0');

        btn.emit('click');
        assert.equal(media.muted, false);
        assert.equal(btn.className, 'volume-on');
        assert.equal(slider.value, '100');
    });

    it('applies the slider volume and restores audio when unmuting from zero', () => {
        const { media, btn, slider } = setup(createContext());
        slider.value = '0';
        slider.emit('input');
        assert.equal(media.volume, 0);
        assert.equal(btn.className, 'volume-off');

        btn.emit('click');
        assert.equal(media.volume, 1);
        assert.equal(media.muted, false);
    });

    it('keeps the peer preference when its media is rebuilt and mirrors browser controls', () => {
        const context = createContext();
        const first = setup(context);
        first.slider.value = '40';
        first.slider.emit('input');
        first.media.muted = true; // e.g. muted from the browser picture-in-picture controls
        assert.equal(first.btn.className, 'volume-off');

        const rebuilt = setup(context);
        assert.equal(rebuilt.media.volume, 0.4);
        assert.equal(rebuilt.media.muted, true);
        assert.equal(rebuilt.btn.className, 'volume-off');

        const other = setup(context, 'peer-2');
        assert.equal(other.media.volume, 1);
        assert.equal(other.media.muted, false);
    });
});
