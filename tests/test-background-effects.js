'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

describe('camera background integration', () => {
    let context;
    let camera;
    let audio;
    let processors;
    let peerStreams;
    let warnings;

    beforeEach(() => {
        camera = makeTrack('video', 'camera');
        audio = makeTrack('audio', 'microphone');
        processors = [];
        peerStreams = [];
        warnings = [];
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
            backgroundImage: null,
            backgroundEffectsBusy: false,
            backgroundEffectSelect: { value: 'off' },
            backgroundEffectsSection: control(),
            backgroundEffectLoading: control(),
            backgroundImageBtn: control(),
            backgroundImageInput: control(),
            backgroundImageName: control(),
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
            localStorageConfig: { video: { settings: {} } },
            applyNoiseSuppressionWithLogging: async (stream) => stream,
            getScreenWithMic: async () => new TestStream([makeTrack('video', 'screen'), audio]),
            getBestUserMedia: async () => new TestStream([makeTrack('video', 'returned-camera'), audio]),
            getVideoConstraints: () => ({ frameRate: 30 }),
            logStreamSettingsInfo() {},
            saveLocalStorageConfig() {},
            className: { videoOn: 'on', videoOff: 'off', screenOn: 'screen', screenOff: 'stop' },
        });
        loadFunctions(context, '../frontend/js/client.js', [
            'updateBackgroundControls',
            'stopCameraEffects',
            'attachCameraBackgroundTrack',
            'handleBackgroundError',
            'prepareCameraBackground',
            'applyCameraBackground',
            'loadBackgroundImage',
            'setVideoButtons',
            'refreshVideoConstraints',
            'toggleScreenSharing',
            'changeCamera',
        ]);
    });

    it('keeps Off on the original stream without constructing a processor', async () => {
        const stream = context.localMediaStream;
        assert.equal(await context.prepareCameraBackground(stream), stream);
        assert.equal(processors.length, 0);
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
        context.BackgroundEffects.prototype.setMode = async function () {
            await new Promise((resolve) => {
                finishLoading = resolve;
            });
            if (this.stopped) throw new Error('Stopped');
        };
        context.backgroundEffectSelect.value = 'blur';
        const applying = context.applyCameraBackground();
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
            assert.equal(context.backgroundEffectSelect.value, 'off');
        }
        assert.equal(warnings.length, 2);
        assert.equal(processors.length, 0);
    });

    it('blocks track replacement while recording', async () => {
        context.recording = { isStreamRecording: () => true };
        context.backgroundEffectSelect.value = 'blur';
        await context.applyCameraBackground();
        assert.equal(processors.length, 0);
        assert.equal(context.backgroundEffectSelect.value, 'off');
        assert.equal(warnings.length, 1);
    });
});

describe('background effect processor', () => {
    let effects;
    let camera;
    let audio;
    let output;
    let timers;
    let errors;

    beforeEach(() => {
        camera = makeTrack('video', 'camera');
        audio = makeTrack('audio', 'audio');
        output = makeTrack('video', 'canvas');
        timers = new Set();
        errors = [];
        const context = vm.createContext({
            MediaStream: TestStream,
            performance: { now: () => 100 },
            setTimeout(callback) {
                timers.add(callback);
                return callback;
            },
            clearTimeout: (timer) => timers.delete(timer),
            document: {
                body: { appendChild() {} },
                createElement: (tag) =>
                    tag === 'video'
                        ? {
                              style: {},
                              videoWidth: 1920,
                              videoHeight: 1080,
                              readyState: 2,
                              setAttribute() {},
                              async play() {},
                              pause() {},
                              remove() {},
                          }
                        : {
                              width: 0,
                              height: 0,
                              getContext: () => ({ drawImage() {}, clearRect() {}, filter: 'none' }),
                              captureStream: () => new TestStream([output]),
                          },
            },
        });
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/js/background-effects.js'), 'utf8'), context);
        effects = vm.runInContext('new BackgroundEffects(() => {})', context);
        effects.onError = (error) => errors.push(error);
    });

    afterEach(() => effects.stop(false));

    it('caps output at 720p and preserves audio', async () => {
        effects.loadModel = async () => {};
        await effects.setMode('blur');
        effects.segmenter = { segmentForVideo() {}, close() {} };
        const stream = await effects.start(new TestStream([camera, audio]));
        assert.equal(effects.canvas.width, 1280);
        assert.equal(effects.canvas.height, 720);
        assert.equal(stream.getVideoTracks()[0], output);
        assert.equal(stream.getAudioTracks()[0], audio);
    });

    it('validates image mode and unsupported blur', async () => {
        await assert.rejects(effects.setMode('image'), /Choose a background image/);
        await assert.rejects(effects.setMode('invalid'), /Invalid background mode/);
        delete effects.backgroundContext.filter;
        await assert.rejects(effects.setMode('blur'), /not supported/);
    });

    it('reports segmentation failures and stops rendering cleanly', async () => {
        await effects.start(new TestStream([camera, audio]));
        effects.mode = 'blur';
        effects.segmenter = {
            segmentForVideo() {
                throw new Error('GPU failed');
            },
            close() {},
        };
        effects.render(200);
        assert.equal(effects.mode, 'off');
        assert.equal(errors.length, 1);
        effects.stop(false);
        effects.stop();
        assert.equal(output.stopped, 1);
        assert.equal(camera.stopped, 0);
        assert.equal(audio.stopped, 0);
    });

    it('removes scheduled rendering when stopped', async () => {
        await effects.start(new TestStream([camera, audio]));
        effects.stop();
        assert.equal(timers.size, 0);
        assert.equal(camera.stopped, 1);
    });
});
