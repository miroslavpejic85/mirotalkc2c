'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sinon = require('sinon');

class TestStream {
    constructor(tracks = []) {
        this.tracks = tracks;
    }
    getTracks() {
        return this.tracks;
    }
    getVideoTracks() {
        return this.tracks.filter((track) => track.kind === 'video');
    }
    getAudioTracks() {
        return this.tracks.filter((track) => track.kind === 'audio');
    }
    addTrack(track) {
        this.tracks.push(track);
    }
    removeTrack(track) {
        this.tracks = this.tracks.filter((item) => item !== track);
    }
}

function makeTrack(kind, id) {
    return {
        kind,
        id,
        enabled: true,
        readyState: 'live',
        stopped: 0,
        stop() {
            this.stopped++;
            this.readyState = 'ended';
        },
        getSettings: () => ({ frameRate: 30 }),
        addEventListener() {},
        removeEventListener() {},
        async applyConstraints(constraints) {
            this.constraints = constraints;
        },
    };
}

function loadFunctions(context, filename, names) {
    const source = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    for (const name of names) {
        const declaration = source.indexOf(`function ${name}(`);
        assert.notEqual(declaration, -1, name);
        const start = source.slice(declaration - 6, declaration) === 'async ' ? declaration - 6 : declaration;
        const end = source.indexOf('\n}', declaration) + 2;
        vm.runInContext(source.slice(start, end), context);
    }
}

function gridCard(type, url) {
    const classes = new Set();
    const attributes = {};
    return {
        hidden: false,
        disabled: false,
        dataset: { bgType: type, ...(url && { bgValue: url }) },
        classList: {
            toggle: (name, force) => (force ? classes.add(name) : classes.delete(name)),
            contains: (name) => classes.has(name),
        },
        setAttribute: (name, value) => {
            attributes[name] = value;
        },
        attributes,
        querySelector: () => null,
    };
}

describe('camera background integration', () => {
    let context;
    let camera;
    let audio;
    let processors;
    let peerStreams;
    let warnings;
    let gridCards;
    let uploads;
    let revokedUrls;
    let savedConfigs;
    let imageDB;

    beforeEach(() => {
        camera = makeTrack('video', 'camera');
        audio = makeTrack('audio', 'microphone');
        processors = [];
        peerStreams = [];
        warnings = [];
        uploads = 0;
        revokedUrls = [];
        savedConfigs = [];
        imageDB = new Map();
        gridCards = [
            gridCard('upload'),
            gridCard('custom'),
            gridCard('preset', '../images/backgrounds/forest.webp'),
            gridCard('preset', '../images/backgrounds/beach.webp'),
        ];
        class Processor {
            static supported() {
                return true;
            }
            constructor(onError) {
                this.onError = onError;
                this.outputTrack = makeTrack('video', 'processed');
                processors.push(this);
            }
            async setMode(mode, image) {
                if (mode === 'image' && !image) throw new Error('Missing image');
                this.mode = mode;
            }
            async start(stream) {
                this.cameraTrack = stream.getVideoTracks()[0];
                return new TestStream([this.outputTrack, ...stream.getAudioTracks()]);
            }
            stop(stopCamera) {
                this.outputTrack.stop();
                if (stopCamera) this.cameraTrack.stop();
                this.stopped = true;
            }
        }
        const control = () => ({ value: '', setAttribute() {} });
        context = vm.createContext({
            BackgroundEffects: Processor,
            MediaStream: TestStream,
            cameraEffects: null,
            screenComposer: null,
            backgroundImage: null,
            backgroundImageSource: null,
            backgroundCustomImageUrl: null,
            backgroundEffectsBusy: false,
            backgroundEffectSelect: { value: 'off' },
            backgroundEffectsSection: control(),
            backgroundEffectLoading: control(),
            backgroundImageInput: control(),
            backgroundImageGrid: { hidden: true, querySelectorAll: () => gridCards },
            loadBackgroundImageElement: async (url) => {
                if (url.includes('broken')) throw new Error('Unable to load background image');
                return { url, naturalWidth: 1920, naturalHeight: 1080 };
            },
            URL: {
                createObjectURL: () => `blob:upload-${++uploads}`,
                revokeObjectURL: (url) => revokedUrls.push(url),
            },
            videoSource: control(),
            swapCameraBtn: control(),
            screenShareBtn: control(),
            initScreenShareBtn: control(),
            videoBtn: control(),
            initVideoBtn: control(),
            videoQualitySelect: { selectedIndex: 0 },
            videoFpsSelect: { selectedIndex: 0 },
            localMediaStream: new TestStream([camera, audio]),
            isScreenStreaming: false,
            isVideoStreaming: true,
            recording: null,
            camera: 'user',
            window: { myVideo: { style: {} } },
            console: { error() {}, warn() {} },
            popupMessage: (...args) => warnings.push(args),
            refreshMyVideoStreamToPeers: (stream) => peerStreams.push(stream),
            hasVideoTrack: (stream) => !!stream?.getVideoTracks().length,
            detectCameraFacingMode: () => 'user',
            handleCameraMirror() {},
            setLocalScreenStatus(active) {
                context.isScreenStreaming = active;
            },
            setLocalAudioStatus(active) {
                context.localMediaStream.getAudioTracks()[0].enabled = active;
            },
            setLocalVideoStatus(active) {
                context.isVideoStreaming = active;
                context.setVideoButtons(active);
            },
            refreshMyLocalVideoStream(stream) {
                context.localMediaStream = stream;
            },
            refreshMyAudioAndVideoStreamToPeers(stream) {
                context.localMediaStream = stream;
                peerStreams.push(stream);
            },
            localStorageConfig: {
                audio: { devices: { select: { id: null } } },
                video: {
                    devices: { select: { id: null } },
                    settings: { background: { mode: 'off', image: null, custom: false } },
                },
            },
            backgroundImagePresets: ['forest', 'beach'].map((name) => ({
                name,
                url: `../images/backgrounds/${name}.webp`,
            })),
            cameraBackgroundDB: {
                get: async (key) => imageDB.get(key),
                put: async (key, blob) => {
                    imageDB.set(key, blob);
                },
            },
            CAMERA_BG_CUSTOM_KEY: 'custom',
            backgroundRestored: false,
            applyNoiseSuppressionWithLogging: async (stream) => stream,
            getScreenWithMic: async () => new TestStream([makeTrack('video', 'screen'), audio]),
            getBestUserMedia: async () => new TestStream([makeTrack('video', 'returned-camera'), audio]),
            getVideoConstraints: () => ({ frameRate: 30 }),
            getAudioConstraints: () => ({}),
            activeVideoDeviceId: null,
            activeAudioDeviceId: null,
            audioSource: control(),
            cameraAvailable: true,
            getStreamDeviceId: () => undefined,
            selectDevice: () => false,
            notifyBusyDevice() {},
            restoreDeviceSelect() {},
            logStreamSettingsInfo() {},
            saveLocalStorageConfig() {
                savedConfigs.push(JSON.parse(JSON.stringify(context.localStorageConfig.video.settings.background)));
            },
            className: { videoOn: 'on', videoOff: 'off', screenOn: 'screen', screenOff: 'stop' },
        });
        loadFunctions(context, '../frontend/js/client.js', [
            'updateBackgroundControls',
            'updateBackgroundImageGrid',
            'getBackgroundMode',
            'isBackgroundLockedByRecording',
            'stopCameraEffects',
            'attachCameraBackgroundTrack',
            'handleBackgroundError',
            'prepareCameraBackground',
            'applyCameraBackground',
            'selectBackgroundImage',
            'loadBackgroundImage',
            'saveCameraBackground',
            'restoreCameraBackground',
            'setVideoButtons',
            'refreshVideoConstraints',
            'toggleScreenSharing',
            'getPreferredVideoDeviceId',
            'getPreferredAudioDeviceId',
            'handleScreenTrackEnded',
            'getScreenCameraPosition',
            'composeScreenWithCamera',
            'stopScreenComposer',
            'changeCamera',
        ]);
    });

    it('keeps Off on the original stream without constructing a processor', async () => {
        const stream = context.localMediaStream;
        assert.equal(await context.prepareCameraBackground(stream), stream);
        assert.equal(processors.length, 0);
    });

    it('starts the processor before sending the effect, so the worker engine receives it', async () => {
        const calls = [];
        const { start, setMode } = context.BackgroundEffects.prototype;
        context.BackgroundEffects.prototype.start = function (stream) {
            calls.push('start');
            return start.call(this, stream);
        };
        context.BackgroundEffects.prototype.setMode = function (mode, image) {
            calls.push(`setMode:${mode}`);
            return setMode.call(this, mode, image);
        };
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        assert.deepEqual(calls, ['start', 'setMode:blur']);
    });

    it('updates preview and peer video while preserving audio and camera mute', async () => {
        camera.enabled = false;
        audio.enabled = false;
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        assert.equal(context.localMediaStream.getVideoTracks()[0], processors[0].outputTrack);
        assert.equal(processors[0].outputTrack.enabled, false);
        assert.equal(context.localMediaStream.getAudioTracks()[0], audio);
        assert.equal(audio.enabled, false);
        assert.equal(context.window.myVideo.srcObject, context.localMediaStream);
        assert.equal(peerStreams[0], context.localMediaStream);
    });

    it('restores the original camera and releases the processor when switched Off', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        context.backgroundEffectSelect.value = 'off';
        await context.applyCameraBackground();
        assert.equal(context.localMediaStream.getVideoTracks()[0], camera);
        assert.equal(camera.stopped, 0);
        assert.equal(processors[0].outputTrack.stopped, 1);
        assert.equal(context.cameraEffects, null);
    });

    it('falls back to the raw camera after a runtime segmentation error', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        processors[0].onError(new Error('GPU unavailable'));
        assert.equal(context.backgroundEffectSelect.value, 'off');
        assert.equal(context.localMediaStream.getVideoTracks()[0], camera);
        assert.equal(context.cameraEffects, null);
        assert.equal(peerStreams.at(-1), context.localMediaStream);
        assert.equal(warnings.length, 1);
    });

    it('falls back without stopping the camera when model loading fails', async () => {
        context.BackgroundEffects.prototype.setMode = async () => {
            throw new Error('Model unavailable');
        };
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        assert.equal(context.localMediaStream.getVideoTracks()[0], camera);
        assert.equal(camera.stopped, 0);
        assert.equal(context.backgroundEffectSelect.value, 'off');
        assert.equal(context.backgroundEffectsBusy, false);
    });

    it('bypasses effects for screen sharing and restores them on camera return', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        context.setVideoButtons(false);
        await context.toggleScreenSharing();
        assert.equal(context.localMediaStream.getVideoTracks()[0].id, 'screen');
        assert.equal(context.cameraEffects, null);
        assert.equal(camera.stopped, 1);
        assert.equal(context.backgroundEffectSelect.disabled, true);
        assert.equal(context.backgroundEffectSelect.value, 'blur');
        const screen = context.localMediaStream.getVideoTracks()[0];
        await context.applyCameraBackground();
        assert.equal(context.localMediaStream.getVideoTracks()[0], screen);
        await context.toggleScreenSharing();
        assert.equal(screen.stopped, 1);
        assert.equal(context.cameraEffects.mode, 'blur');
        assert.equal(context.cameraEffects.cameraTrack.id, 'returned-camera');
        assert.equal(context.localMediaStream.getVideoTracks()[0].enabled, false);
        assert.equal(context.cameraEffects.cameraTrack.enabled, false);
    });

    it('applies video constraints to the raw camera, not the canvas track', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        context.refreshVideoConstraints();
        assert.equal(camera.constraints.frameRate, 30);
        assert.equal(processors[0].outputTrack.constraints, undefined);
    });

    it('stops the underlying camera on teardown', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        context.stopCameraEffects();
        assert.equal(camera.stopped, 1);
        assert.equal(context.cameraEffects, null);
        assert.equal(audio.stopped, 0);
    });

    it('reapplies the selected effect to a replacement camera without losing audio', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        const replacement = makeTrack('video', 'replacement');
        context.navigator = { mediaDevices: { getUserMedia: async () => new TestStream([replacement]) } };
        const updated = new Promise((resolve) => {
            context.refreshMyVideoStreamToPeers = resolve;
        });
        context.changeCamera('replacement');
        const stream = await updated;
        assert.equal(camera.stopped, 1);
        assert.equal(context.cameraEffects.cameraTrack, replacement);
        assert.equal(context.cameraEffects.mode, 'blur');
        assert.equal(stream.getAudioTracks()[0], audio);
        assert.equal(audio.stopped, 0);
    });

    it('does not reattach a processor after teardown during model loading', async () => {
        let finishLoading;
        let loadingStarted;
        const loading = new Promise((resolve) => {
            loadingStarted = resolve;
        });
        context.BackgroundEffects.prototype.setMode = async function () {
            await new Promise((resolve) => {
                finishLoading = resolve;
                loadingStarted();
            });
            if (this.stopped) throw new Error('Stopped');
        };
        context.backgroundEffectSelect.value = 'blur';
        const applying = context.applyCameraBackground();
        await loading;
        context.stopCameraEffects();
        context.localMediaStream = null;
        finishLoading();
        await applying;
        assert.equal(context.cameraEffects, null);
        assert.equal(camera.stopped, 1);
        assert.equal(peerStreams.length, 0);
        assert.equal(context.backgroundEffectsBusy, false);
    });

    it('rejects unsupported or oversized images before decoding', async () => {
        for (const file of [
            { type: 'image/svg+xml', size: 10 },
            { type: 'image/png', size: 10 * 1024 * 1024 + 1 },
        ]) {
            context.backgroundEffectSelect.value = 'image';
            await context.loadBackgroundImage(file);
            assert.equal(context.backgroundImage, null);
        }
        assert.equal(warnings.length, 2);
        assert.equal(uploads, 0);
        assert.equal(processors.length, 0);
    });

    it('shows the picker and keeps the camera plain until an image is picked', async () => {
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        assert.equal(context.backgroundImageGrid.hidden, true);
        context.backgroundEffectSelect.value = 'image';
        await context.applyCameraBackground();
        assert.equal(context.backgroundImageGrid.hidden, false);
        assert.equal(context.getBackgroundMode(), 'off');
        assert.equal(context.cameraEffects, null);
        assert.equal(context.localMediaStream.getVideoTracks()[0], camera);
        assert.equal(warnings.length, 0);
    });

    it('applies a preset and marks its tile active', async () => {
        const url = '../images/backgrounds/beach.webp';
        assert.equal(await context.selectBackgroundImage({ type: 'preset', url }), true);
        assert.equal(context.backgroundEffectSelect.value, 'image');
        assert.equal(context.backgroundImage.url, url);
        assert.equal(context.cameraEffects.mode, 'image');
        assert.equal(context.localMediaStream.getVideoTracks()[0], processors[0].outputTrack);
        const active = gridCards.filter((card) => card.classList.contains('active'));
        assert.deepEqual(
            active.map((card) => card.dataset.bgValue),
            [url]
        );
        assert.equal(active[0].attributes['aria-pressed'], 'true');
    });

    it('swaps presets on the running processor', async () => {
        await context.selectBackgroundImage({ type: 'preset', url: '../images/backgrounds/forest.webp' });
        await context.selectBackgroundImage({ type: 'preset', url: '../images/backgrounds/beach.webp' });
        assert.equal(processors.length, 1);
        assert.equal(context.cameraEffects.mode, 'image');
        assert.equal(context.backgroundImageSource.url, '../images/backgrounds/beach.webp');
    });

    it('keeps the current background when an image cannot be loaded', async () => {
        await context.selectBackgroundImage({ type: 'preset', url: '../images/backgrounds/forest.webp' });
        assert.equal(await context.selectBackgroundImage({ type: 'preset', url: 'broken.webp' }), false);
        assert.equal(context.backgroundImageSource.url, '../images/backgrounds/forest.webp');
        assert.equal(context.backgroundEffectsBusy, false);
        assert.equal(warnings.length, 1);
    });

    it('keeps the last upload as a tile and releases the previous one', async () => {
        await context.loadBackgroundImage({ type: 'image/png', size: 10 });
        assert.equal(context.backgroundCustomImageUrl, 'blob:upload-1');
        assert.equal(context.backgroundImageSource.type, 'custom');
        assert.equal(gridCards[1].hidden, false);
        assert.equal(gridCards[1].classList.contains('active'), true);
        await context.selectBackgroundImage({ type: 'preset', url: '../images/backgrounds/forest.webp' });
        assert.equal(gridCards[1].classList.contains('active'), false);
        await context.loadBackgroundImage({ type: 'image/webp', size: 10 });
        assert.equal(context.backgroundCustomImageUrl, 'blob:upload-2');
        assert.deepEqual(revokedUrls, ['blob:upload-1']);
    });

    it('does not pick an image while recording', async () => {
        context.recording = { isStreamRecording: () => true };
        assert.equal(
            await context.selectBackgroundImage({ type: 'preset', url: '../images/backgrounds/forest.webp' }),
            false
        );
        assert.equal(context.backgroundImage, null);
        assert.equal(processors.length, 0);
        assert.equal(warnings.length, 1);
    });

    it('blocks track replacement while recording', async () => {
        context.recording = { isStreamRecording: () => true };
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        assert.equal(processors.length, 0);
        assert.equal(context.backgroundEffectSelect.value, 'off');
        assert.equal(warnings.length, 1);
        assert.equal(savedConfigs.length, 0);
    });

    describe('remembered background', () => {
        const saved = () => context.localStorageConfig.video.settings.background;

        it('remembers the requested mode even when the effect then fails', async () => {
            context.BackgroundEffects.prototype.setMode = async () => {
                throw new Error('Model unavailable');
            };
            context.backgroundEffectSelect.value = 'blur';
            await context.applyCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'off');
            assert.equal(saved().mode, 'blur');
        });

        it('saves Image without a picked image as Off', async () => {
            context.backgroundEffectSelect.value = 'image';
            await context.applyCameraBackground();
            assert.deepEqual(savedConfigs.at(-1), { mode: 'off', image: null, custom: false });
        });

        it('remembers the picked preset', async () => {
            await context.selectBackgroundImage({ type: 'preset', url: '../images/backgrounds/beach.webp' });
            assert.deepEqual(savedConfigs.at(-1), {
                mode: 'image',
                image: { type: 'preset', url: '../images/backgrounds/beach.webp' },
                custom: false,
            });
        });

        it('keeps the upload in the image store and remembers it', async () => {
            const file = { type: 'image/png', size: 10 };
            await context.loadBackgroundImage(file);
            assert.equal(imageDB.get('custom'), file);
            assert.deepEqual(savedConfigs.at(-1), { mode: 'image', image: { type: 'custom' }, custom: true });
        });

        it('restores a preset before the camera starts, once', async () => {
            Object.assign(saved(), {
                mode: 'image',
                image: { type: 'preset', url: '../images/backgrounds/forest.webp' },
            });
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'image');
            assert.equal(context.backgroundImage.url, '../images/backgrounds/forest.webp');
            assert.equal(context.backgroundImageSource.type, 'preset');
            const stream = await context.prepareCameraBackground(context.localMediaStream);
            assert.equal(stream.getVideoTracks()[0], processors[0].outputTrack);
            assert.equal(processors[0].mode, 'image');
            context.backgroundEffectSelect.value = 'off';
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'off');
        });

        it('restores the uploaded image tile and selection from the image store', async () => {
            imageDB.set('custom', { type: 'image/webp' });
            Object.assign(saved(), { mode: 'image', image: { type: 'custom' }, custom: true });
            await context.restoreCameraBackground();
            assert.equal(context.backgroundCustomImageUrl, 'blob:upload-1');
            assert.deepEqual({ ...context.backgroundImageSource }, { type: 'custom', url: 'blob:upload-1' });
            assert.equal(context.backgroundEffectSelect.value, 'image');
        });

        it('keeps the last image for later while Blur is remembered', async () => {
            Object.assign(saved(), {
                mode: 'blur',
                image: { type: 'preset', url: '../images/backgrounds/beach.webp' },
            });
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'blur');
            assert.equal(context.backgroundImage.url, '../images/backgrounds/beach.webp');
        });

        it('falls back to Off when the remembered image is gone', async () => {
            for (const image of [
                { type: 'preset', url: 'https://example.com/unknown.webp' },
                { type: 'custom' },
                { type: 'preset', url: '../images/backgrounds/broken.webp' },
            ]) {
                context.backgroundRestored = false;
                context.backgroundImage = null;
                Object.assign(saved(), { mode: 'image', image, custom: image.type === 'custom' });
                await context.restoreCameraBackground();
                assert.equal(context.backgroundEffectSelect.value, 'off', JSON.stringify(image));
            }
        });

        it('ignores the remembered background when effects are unsupported', async () => {
            context.BackgroundEffects.supported = () => false;
            Object.assign(saved(), { mode: 'blur' });
            await context.restoreCameraBackground();
            assert.equal(context.backgroundEffectSelect.value, 'off');
        });
    });
});

describe('camera background stored config', () => {
    const load = (stored) => {
        const items = new Map(stored ? [['C2C_CONFIG', JSON.stringify(stored)]] : []);
        const context = vm.createContext({
            console,
            localStorage: { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) },
        });
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/js/storage.js'), 'utf8'), context);
        return JSON.parse(JSON.stringify(vm.runInContext('new LocalStorage()', context).getConfig()));
    };

    it('defaults to Off and fills it in for configs saved by older versions', () => {
        const defaults = { mode: 'off', image: null, custom: false };
        assert.deepEqual(load().video.settings.background, defaults);
        assert.deepEqual(
            load({ video: { settings: { screen_camera: 'top-left' } } }).video.settings.background,
            defaults
        );
        const remembered = {
            mode: 'image',
            image: { type: 'preset', url: '../images/backgrounds/lake.webp' },
            custom: true,
        };
        assert.deepEqual(
            load({ video: { settings: { background: remembered } } }).video.settings.background,
            remembered
        );
    });
});

// Small blur canvas for the shared compositor: no canvas filter, records what was drawn
function fallbackBlurCanvas() {
    const canvas = { width: 0, height: 0, contextOptions: null };
    const filters = [];
    canvas.context = {
        filters,
        set filter(value) {
            filters.push(value);
            this.currentFilter = value;
        },
        get filter() {
            return this.currentFilter;
        },
        clearRect() {},
        drawImage: sinon.spy(),
        putImageData: sinon.spy(),
        getImageData: sinon.spy((x, y, width, height) => {
            const data = new Uint8ClampedArray(width * height * 4);
            for (let i = 0; i < width * height; i++) {
                const value = i % width < width / 2 ? 0 : 255;
                data.set([value, value, value, 255], i * 4);
            }
            return { data, width, height };
        }),
    };
    canvas.getContext = (type, options) => {
        canvas.contextOptions = options;
        return canvas.context;
    };
    return canvas;
}

describe('camera background effects', () => {
    let effects;
    let camera;
    let output;
    let audio;
    let clock;
    let onError;
    let compositor;

    beforeEach(() => {
        clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        camera = {
            kind: 'video',
            stop: sinon.spy(),
            getSettings: () => ({ frameRate: 30 }),
            addEventListener: sinon.spy(),
            removeEventListener: sinon.spy(),
        };
        output = { kind: 'video', stop: sinon.spy(), requestFrame: sinon.spy() };
        audio = { kind: 'audio', stop: sinon.spy() };
        class MediaStream {
            constructor(tracks) {
                this.tracks = tracks;
            }
            getVideoTracks() {
                return this.tracks.filter((track) => track.kind === 'video');
            }
            getAudioTracks() {
                return this.tracks.filter((track) => track.kind === 'audio');
            }
        }
        const context = vm.createContext({
            MediaStream,
            performance,
            setTimeout,
            clearTimeout,
            document: {
                body: { appendChild() {} },
                createElement: (type) =>
                    type === 'video'
                        ? {
                              style: {},
                              setAttribute() {},
                              play: async () => {},
                              pause: sinon.spy(),
                              remove: sinon.spy(),
                              videoWidth: 1920,
                              videoHeight: 1080,
                              readyState: 2,
                          }
                        : {
                              getContext: () => ({ drawImage: sinon.spy(), clearRect() {}, filter: 'none' }),
                              captureStream: () => new MediaStream([output]),
                          },
            },
        });
        vm.runInContext(
            fs.readFileSync(path.join(__dirname, '../frontend/js/background-effects-compositor.js'), 'utf8'),
            context
        );
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/js/background-effects.js'), 'utf8'), context);
        compositor = context.BackgroundCompositor;
        onError = sinon.spy();
        effects = vm.runInContext('new BackgroundEffects(() => {})', context);
        effects.onError = onError;
        effects.input = new MediaStream([camera, audio]);
    });

    afterEach(() => {
        effects.stop(false);
        clock.restore();
    });

    it('preserves audio and caps only effect output resolution', async () => {
        const stream = await effects.start(effects.input);
        assert.equal(stream.getVideoTracks()[0], output);
        assert.equal(stream.getAudioTracks()[0], audio);
        assert.equal(effects.canvas.width, 1920);
        effects.loadModel = async () => {};
        await effects.setMode('blur');
        effects.resize();
        assert.equal(effects.canvas.width, 1280);
        assert.equal(effects.canvas.height, 720);
    });

    it('blurs without canvas filters using a downscaled box blur fallback', async () => {
        await effects.start(effects.input);
        effects.loadModel = async () => {};
        effects.backgroundContext = { drawImage: sinon.spy(), clearRect() {} };
        const small = fallbackBlurCanvas();
        effects.blur = compositor.createBlur(() => small);
        effects.drawing = { drawConfidenceMask() {}, close() {} };
        effects.segmenter = { segmentForVideo() {}, close() {} };

        await effects.setMode('blur');
        effects.render((effects.lastFrame || 0) + 1000);

        assert.equal(onError.callCount, 0);
        assert.equal(effects.mode, 'blur');
        assert.equal(small.width, 160);
        assert.equal(small.height, 90);
        assert.equal(small.contextOptions.willReadFrequently, true);
        const pixels = small.context.putImageData.firstCall.args[0].data;
        const center = (45 * 160 + 80) * 4;
        assert.ok(pixels[center] > 0 && pixels[center] < 255);
        assert.equal(effects.backgroundContext.drawImage.calledOnce, true);
        assert.equal(effects.backgroundContext.drawImage.firstCall.args[0], small);
    });

    it('requires an image and rejects unknown modes', async () => {
        await assert.rejects(effects.setMode('image'), /Choose a background image/);
        await assert.rejects(effects.setMode('invalid'), /Invalid background mode/);
    });

    it('swaps the background on the running pipeline without a new output track', async () => {
        const stream = await effects.start(effects.input);
        effects.loadModel = async () => {};
        await effects.setMode('blur');
        const image = { naturalWidth: 640, naturalHeight: 480 };

        assert.equal(await effects.setBackground('image', image), true);
        assert.equal(effects.mode, 'image');
        assert.equal(effects.image, image);
        assert.equal(effects.outputTrack, output);
        assert.equal(stream.getVideoTracks()[0], output);
        assert.equal(await effects.setBackground('blur'), true);
        assert.equal(effects.mode, 'blur');
        assert.equal(output.stop.callCount, 0);
        assert.equal(camera.stop.callCount, 0);
    });

    it('does not swap when turning the effect off or when nothing is running', async () => {
        effects.loadModel = async () => {};
        assert.equal(await effects.setBackground('blur'), false);
        await effects.start(effects.input);
        assert.equal(await effects.setBackground('blur'), false, 'effect still off');
        await effects.setMode('blur');
        assert.equal(await effects.setBackground('off'), false);
        assert.equal(effects.mode, 'blur');
        output.readyState = 'ended';
        assert.equal(await effects.setBackground('blur'), false);
        output.readyState = 'live';
        camera.readyState = 'ended';
        assert.equal(await effects.setBackground('blur'), false);
        camera.readyState = 'live';
        effects.stop(false);
        assert.equal(await effects.setBackground('blur'), false);
    });

    it('keeps the current background when a swap is invalid', async () => {
        await effects.start(effects.input);
        effects.loadModel = async () => {};
        await effects.setMode('blur');
        effects.image = null;
        await assert.rejects(effects.setBackground('image'), /Choose a background image/);
        assert.equal(effects.mode, 'blur');
    });

    it('reuses the fallback blur canvas and buffer across frames', async () => {
        await effects.start(effects.input);
        effects.loadModel = async () => {};
        effects.backgroundContext = { drawImage() {}, clearRect() {} };
        const newCanvas = sinon.spy(() => fallbackBlurCanvas());
        effects.blur = compositor.createBlur(newCanvas);
        effects.drawing = { drawConfidenceMask() {}, close() {} };
        effects.segmenter = { segmentForVideo() {}, close() {} };
        await effects.setMode('blur');

        effects.render((effects.lastFrame || 0) + 1000);
        const buffer = effects.blur.scratch();
        effects.render(effects.lastFrame + 1000);
        assert.equal(onError.callCount, 0);
        assert.equal(newCanvas.callCount, 1);
        assert.equal(buffer?.constructor.name, 'Uint8ClampedArray');
        assert.equal(buffer.length, 160 * 90 * 4);
        assert.equal(effects.blur.scratch(), buffer);
    });

    it('blurs a quarter-size copy when canvas filters are supported', async () => {
        await effects.start(effects.input);
        effects.loadModel = async () => {};
        effects.backgroundContext = { drawImage: sinon.spy(), clearRect() {}, filter: 'none' };
        const small = fallbackBlurCanvas();
        small.context.filter = 'none';
        small.context.filters.length = 0;
        effects.blur = compositor.createBlur(() => small);
        effects.drawing = { drawConfidenceMask() {}, close() {} };
        effects.segmenter = { segmentForVideo() {}, close() {} };
        await effects.setMode('blur');
        effects.render((effects.lastFrame || 0) + 1000);

        assert.equal(onError.callCount, 0);
        assert.equal(small.width, 320);
        assert.equal(small.height, 180);
        assert.equal(small.contextOptions, undefined);
        assert.equal(small.context.getImageData.callCount, 0);
        assert.equal(small.context.filters[0], 'blur(3px)');
        assert.equal(small.context.filter, 'none');
        assert.deepEqual(effects.backgroundContext.drawImage.firstCall.args.slice(1), [0, 0, 1280, 720]);
    });

    it('scales and centre-crops image backgrounds to fill the frame', async () => {
        await effects.start(effects.input);
        effects.loadModel = async () => {};
        effects.backgroundContext = { drawImage: sinon.spy(), clearRect() {} };
        effects.drawing = { drawConfidenceMask() {}, close() {} };
        effects.segmenter = { segmentForVideo() {}, close() {} };
        const image = { naturalWidth: 1000, naturalHeight: 1000 };
        await effects.setMode('image', image);
        effects.render((effects.lastFrame || 0) + 1000);

        assert.equal(onError.callCount, 0);
        assert.deepEqual(effects.backgroundContext.drawImage.firstCall.args, [
            image,
            0,
            218.75,
            1000,
            562.5,
            0,
            0,
            1280,
            720,
        ]);
    });

    it('uses the general (square) selfie segmenter model', () => {
        const source = fs.readFileSync(path.join(__dirname, '../frontend/js/background-effects.js'), 'utf8');
        assert.match(source, /image_segmenter\/selfie_segmenter\/float16\/1\/selfie_segmenter\.tflite/);
        assert.doesNotMatch(source, /selfie_segmenter_landscape/);
        assert.match(source, /BG_TASKS_VISION_VERSION = '\d+\.\d+\.\d+'/);
        assert.match(source, /tasks-vision@\$\{BG_TASKS_VISION_VERSION\}\/vision_bundle\.mjs/);
    });

    it('falls back to camera frames on segmentation failure', async () => {
        await effects.start(effects.input);
        effects.mode = 'blur';
        effects.segmenter = {
            close() {},
            segmentForVideo() {
                throw new Error('GPU failed');
            },
        };
        effects.render((effects.lastFrame || 0) + 1000);
        assert.equal(effects.mode, 'off');
        assert.equal(onError.callCount, 1);
    });

    it('does not request a frame when the error handler stops processing', async () => {
        await effects.start(effects.input);
        output.requestFrame.resetHistory();
        effects.mode = 'blur';
        effects.segmenter = {
            close() {},
            segmentForVideo() {
                throw new Error('GPU failed');
            },
        };
        effects.onError = () => effects.stop(false);
        effects.render((effects.lastFrame || 0) + 1000);
        assert.equal(effects.stopped, true);
        assert.equal(output.stop.callCount, 1);
        assert.equal(output.requestFrame.callCount, 0);
        assert.equal(clock.countTimers(), 0);
    });

    it('cleans up output without stopping the camera when switching off', async () => {
        await effects.start(effects.input);
        effects.stop(false);
        effects.stop();
        assert.equal(output.stop.callCount, 1);
        assert.equal(camera.stop.callCount, 0);
        assert.equal(audio.stop.callCount, 0);
        assert.equal(clock.countTimers(), 0);
    });

    it('stops the raw camera on shutdown', async () => {
        await effects.start(effects.input);
        effects.stop();
        assert.equal(camera.stop.callCount, 1);
        assert.equal(output.stop.callCount, 1);
    });
});
