'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const composerSource = fs.readFileSync(path.join(__dirname, '../frontend/js/screen-camera.js'), 'utf8');
const clientSource = fs.readFileSync(path.join(__dirname, '../frontend/js/client.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../frontend/html/client.html'), 'utf8');

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
}

function makeTrack(kind, id) {
    const listeners = {};
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
        addEventListener(type, handler) {
            listeners[type] = handler;
        },
        removeEventListener() {},
        emit(type) {
            this.readyState = 'ended';
            listeners[type]?.();
        },
    };
}

function makeDocument(drawn, output) {
    return {
        body: { appendChild() {} },
        createElement: (tag) =>
            tag === 'video'
                ? {
                      style: {},
                      videoWidth: 2560,
                      videoHeight: 1440,
                      readyState: 2,
                      removed: false,
                      setAttribute() {},
                      async play() {},
                      pause() {},
                      remove() {
                          this.removed = true;
                      },
                  }
                : {
                      width: 300,
                      height: 150,
                      getContext: () => ({
                          drawImage: (source, ...args) => drawn.push({ source, args }),
                          save() {},
                          restore() {},
                          beginPath() {},
                          moveTo() {},
                          arcTo() {},
                          closePath() {},
                          fill() {},
                          clip() {},
                          stroke() {},
                      }),
                      captureStream: () => new TestStream([output]),
                  },
    };
}

function loadComposer(extra = {}) {
    const drawn = [];
    const output = makeTrack('video', 'composed');
    output.contentHint = '';
    output.frames = 0;
    output.requestFrame = () => output.frames++;
    const intervals = new Set();
    const context = vm.createContext({
        MediaStream: TestStream,
        document: makeDocument(drawn, output),
        console: { warn() {} },
        setInterval(callback) {
            intervals.add(callback);
            return callback;
        },
        clearInterval: (id) => intervals.delete(id),
        ...extra,
    });
    vm.runInContext(`${composerSource}\nthis.ScreenCameraComposer = ScreenCameraComposer;`, context);
    return { context, Composer: context.ScreenCameraComposer, drawn, output, intervals };
}

function loadFunctions(context, names) {
    for (const name of names) {
        const declaration = clientSource.indexOf(`function ${name}(`);
        assert.notEqual(declaration, -1, name);
        const start = clientSource.slice(declaration - 6, declaration) === 'async ' ? declaration - 6 : declaration;
        const end = clientSource.indexOf('\n}', declaration) + 2;
        vm.runInContext(clientSource.slice(start, end), context);
    }
}

describe('screen camera composer', () => {
    it('places the camera bubble in the selected corner', () => {
        const { Composer } = loadComposer();
        const bottomRight = Composer.getLayout(1920, 1080, 1280, 720, 'bottom-right');
        assert.deepEqual({ ...bottomRight }, { x: 1509, y: 837, width: 384, height: 216, radius: 17 });
        const topLeft = Composer.getLayout(1920, 1080, 1280, 720, 'top-left');
        assert.equal(topLeft.x, 27);
        assert.equal(topLeft.y, 27);
        const topRight = Composer.getLayout(1920, 1080, 1280, 720, 'top-right');
        assert.equal(topRight.x, bottomRight.x);
        assert.equal(topRight.y, 27);
        const bottomLeft = Composer.getLayout(1920, 1080, 1280, 720, 'bottom-left');
        assert.equal(bottomLeft.x, 27);
        assert.equal(bottomLeft.y, bottomRight.y);
    });

    it('keeps the bubble small enough on narrow or portrait frames', () => {
        const { Composer } = loadComposer();
        const ultraWide = Composer.getLayout(1920, 400, 640, 480, 'bottom-right');
        assert.ok(ultraWide.height <= 160, 'height capped at 40% of the frame');
        assert.equal(ultraWide.width, Math.round(ultraWide.height / 0.75));
        const unknownCamera = Composer.getLayout(1000, 1000, 0, 0, 'top-left');
        assert.equal(unknownCamera.height, Math.round(unknownCamera.width * 0.75));
    });

    it('validates positions', () => {
        const { Composer } = loadComposer();
        assert.equal(Composer.isPosition('bottom-right'), true);
        assert.equal(Composer.isPosition('off'), false);
        assert.equal(Composer.isPosition(undefined), false);
    });

    it('sends one composed track capped at 1080p and keeps the screen audio', async () => {
        const { Composer, drawn, output, intervals } = loadComposer();
        const composer = new Composer('bottom-right');
        const screen = makeTrack('video', 'screen');
        const camera = makeTrack('video', 'camera');
        const audio = makeTrack('audio', 'audio');
        const stream = await composer.start(new TestStream([screen, audio]), camera);
        assert.equal(stream.getVideoTracks()[0], output);
        assert.equal(stream.getAudioTracks()[0], audio);
        assert.equal(output.contentHint, 'detail');
        assert.equal(composer.canvas.width, 1920);
        assert.equal(composer.canvas.height, 1080);
        assert.equal(intervals.size, 1, 'falls back to a regular timer without Worker');

        drawn.length = 0;
        [...intervals][0]();
        assert.equal(drawn.length, 2);
        assert.equal(drawn[0].source, composer.screenVideo);
        assert.equal(drawn[1].source, composer.cameraVideo);
        assert.ok(output.frames > 0);

        composer.stop();
        assert.equal(intervals.size, 0);
        assert.equal(output.stopped, 1);
        assert.equal(screen.stopped, 1);
        assert.equal(camera.stopped, 1);
        assert.equal(audio.stopped, 0);
        assert.equal(composer.screenVideo.removed, true);
        assert.equal(composer.cameraVideo.removed, true);
    });

    it('draws only the screen when the camera is hidden, off or gone', async () => {
        const { Composer, drawn } = loadComposer();
        const composer = new Composer('top-left');
        const camera = makeTrack('video', 'camera');
        await composer.start(new TestStream([makeTrack('video', 'screen')]), camera);
        const cameraDraws = () => {
            drawn.length = 0;
            composer.render();
            return drawn.filter((draw) => draw.source === composer.cameraVideo).length;
        };
        assert.equal(cameraDraws(), 1);
        composer.setPosition('off');
        assert.equal(cameraDraws(), 0);
        composer.setPosition('top-left');
        camera.enabled = false;
        assert.equal(cameraDraws(), 0);
        camera.enabled = true;
        camera.stop();
        assert.equal(cameraDraws(), 0);
        const replacement = makeTrack('video', 'raw-camera');
        composer.setCameraTrack(replacement);
        assert.equal(cameraDraws(), 1);
        composer.stop();
    });

    it('paces frames from a worker and releases it on stop', async () => {
        const workers = [];
        const revoked = [];
        class Worker {
            constructor(url) {
                this.url = url;
                workers.push(this);
            }
            postMessage(interval) {
                this.interval = interval;
            }
            terminate() {
                this.terminated = true;
            }
        }
        const { Composer, intervals } = loadComposer({
            Worker,
            Blob: class {},
            URL: { createObjectURL: () => 'blob:ticker', revokeObjectURL: (url) => revoked.push(url) },
        });
        const composer = new Composer('bottom-right');
        await composer.start(new TestStream([makeTrack('video', 'screen')]), makeTrack('video', 'camera'));
        assert.equal(workers.length, 1);
        assert.equal(Math.round(workers[0].interval), 33);
        assert.equal(intervals.size, 0);
        composer.stop();
        assert.equal(workers[0].terminated, true);
        assert.deepEqual(revoked, ['blob:ticker']);
    });

    it('keeps the source tracks when stopped as a fallback', async () => {
        const { Composer } = loadComposer();
        const composer = new Composer('bottom-right');
        const screen = makeTrack('video', 'screen');
        const camera = makeTrack('video', 'camera');
        composer.screenVideo.play = async () => {
            throw new Error('play failed');
        };
        await assert.rejects(composer.start(new TestStream([screen]), camera), /play failed/);
        composer.stop(false);
        assert.equal(screen.stopped, 0);
        assert.equal(camera.stopped, 0);
    });
});

describe('screen sharing with the camera bubble', () => {
    let context;
    let camera;
    let audio;
    let screen;
    let composers;
    let peerStreams;
    let toasts;

    beforeEach(() => {
        camera = makeTrack('video', 'camera');
        audio = makeTrack('audio', 'microphone');
        screen = makeTrack('video', 'screen');
        composers = [];
        peerStreams = [];
        toasts = [];
        class Composer {
            static supported() {
                return true;
            }
            static isPosition(value) {
                return ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(value);
            }
            constructor(position) {
                this.position = position;
                this.outputTrack = makeTrack('video', 'composed');
                composers.push(this);
            }
            async start(stream, cameraTrack) {
                if (Composer.fail) throw new Error('canvas failed');
                this.screenTrack = stream.getVideoTracks()[0];
                this.cameraTrack = cameraTrack;
                return new TestStream([this.outputTrack, ...stream.getAudioTracks()]);
            }
            setPosition(position) {
                this.position = position;
            }
            setCameraTrack(track) {
                this.cameraTrack = track;
            }
            stop(stopSources = true) {
                this.stopped = true;
                this.outputTrack.stop();
                if (stopSources) {
                    this.screenTrack?.stop();
                    this.cameraTrack?.stop();
                }
            }
        }
        const control = () => ({ value: '', setAttribute() {} });
        context = vm.createContext({
            ScreenCameraComposer: Composer,
            MediaStream: TestStream,
            cameraEffects: null,
            screenComposer: null,
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
            localMediaStream: new TestStream([camera, audio]),
            isScreenStreaming: false,
            isVideoStreaming: true,
            isMyAudioActiveBefore: false,
            isMyVideoActiveBefore: false,
            recording: null,
            camera: 'user',
            cameraAvailable: true,
            window: { myVideo: { style: {} } },
            console: { error() {}, warn() {}, log() {} },
            popupMessage: (...args) => toasts.push(args),
            hasVideoTrack: (stream) => !!stream?.getVideoTracks().length,
            detectCameraFacingMode: () => 'user',
            setLocalScreenStatus(active) {
                context.isScreenStreaming = active;
                context.setVideoButtons(active);
            },
            setLocalAudioStatus() {},
            setLocalVideoStatus(active) {
                context.isVideoStreaming = active;
                context.setVideoButtons(active);
            },
            refreshMyAudioAndVideoStreamToPeers(stream) {
                context.localMediaStream = stream;
                peerStreams.push(stream);
            },
            localStorageConfig: { video: { settings: { screen_camera: 'bottom-right' } } },
            saveLocalStorageConfig() {},
            applyNoiseSuppressionWithLogging: async (stream) => stream,
            getScreenWithMic: async () => new TestStream([screen, audio]),
            getBestUserMedia: async () => {
                assert.equal(camera.readyState, 'ended', 'camera released before it is opened again');
                return new TestStream([makeTrack('video', 'returned-camera'), audio]);
            },
            className: { videoOn: 'on', videoOff: 'off', screenOn: 'screen', screenOff: 'stop' },
        });
        loadFunctions(context, [
            'updateBackgroundControls',
            'stopCameraEffects',
            'handleBackgroundError',
            'prepareCameraBackground',
            'setVideoButtons',
            'toggleScreenSharing',
            'handleScreenTrackEnded',
            'getScreenCameraPosition',
            'setScreenCameraPosition',
            'composeScreenWithCamera',
            'stopScreenComposer',
        ]);
    });

    it('sends the screen with the camera drawn over it and keeps the camera running', async () => {
        await context.toggleScreenSharing();
        assert.equal(composers.length, 1);
        assert.equal(composers[0].position, 'bottom-right');
        assert.equal(composers[0].cameraTrack, camera);
        assert.equal(context.screenComposer, composers[0]);
        assert.equal(camera.stopped, 0);
        assert.equal(context.localMediaStream.getVideoTracks()[0], composers[0].outputTrack);
        assert.equal(context.localMediaStream.getAudioTracks()[0], audio);
        assert.equal(peerStreams.at(-1), context.localMediaStream);
        assert.equal(context.isScreenStreaming, true);
    });

    it('releases the screen and camera when returning to the camera', async () => {
        await context.toggleScreenSharing();
        const composer = composers[0];
        await context.toggleScreenSharing();
        assert.equal(context.screenComposer, null);
        assert.equal(composer.stopped, true);
        assert.equal(screen.stopped, 1);
        assert.equal(camera.stopped, 1);
        assert.equal(context.localMediaStream.getVideoTracks()[0].id, 'returned-camera');
        assert.equal(context.isScreenStreaming, false);
    });

    it('shares the plain screen when the setting is off', async () => {
        context.localStorageConfig.video.settings.screen_camera = 'off';
        await context.toggleScreenSharing();
        assert.equal(composers.length, 0);
        assert.equal(camera.stopped, 1);
        assert.equal(context.localMediaStream.getVideoTracks()[0], screen);
    });

    it('ignores invalid stored positions', async () => {
        context.localStorageConfig.video.settings.screen_camera = 'center';
        await context.toggleScreenSharing();
        assert.equal(composers.length, 0);
        assert.equal(context.localMediaStream.getVideoTracks()[0], screen);
    });

    it('shares the plain screen when the camera is off', async () => {
        camera.enabled = false;
        await context.toggleScreenSharing();
        assert.equal(composers.length, 0);
        assert.equal(camera.stopped, 1);
        assert.equal(context.localMediaStream.getVideoTracks()[0], screen);
    });

    it('falls back to the plain screen when composing fails', async () => {
        composers.length = 0;
        context.ScreenCameraComposer.fail = true;
        await context.toggleScreenSharing();
        assert.equal(context.screenComposer, null);
        assert.equal(screen.stopped, 0);
        assert.equal(camera.stopped, 1);
        assert.equal(context.localMediaStream.getVideoTracks()[0], screen);
    });

    it('returns to the camera when sharing is stopped from the browser', async () => {
        await context.toggleScreenSharing();
        screen.emit('ended');
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(context.isScreenStreaming, false);
        assert.equal(context.screenComposer, null);
        assert.equal(camera.stopped, 1);
        assert.equal(context.localMediaStream.getVideoTracks()[0].id, 'returned-camera');
    });

    it('updates the bubble position live and hints when it cannot apply yet', async () => {
        await context.toggleScreenSharing();
        context.setScreenCameraPosition('top-left');
        assert.equal(composers[0].position, 'top-left');
        assert.equal(context.localStorageConfig.video.settings.screen_camera, 'top-left');
        assert.equal(toasts.length, 0);

        await context.toggleScreenSharing();
        context.localStorageConfig.video.settings.screen_camera = 'off';
        await context.toggleScreenSharing();
        context.setScreenCameraPosition('bottom-left');
        assert.equal(toasts.length, 1);
    });

    it('swaps the bubble to the raw camera when the background effect fails', async () => {
        const effectsOutput = makeTrack('video', 'effects');
        const processor = {
            cameraTrack: camera,
            outputTrack: effectsOutput,
            stop(stopCamera) {
                this.outputTrack.stop();
                if (stopCamera) this.cameraTrack.stop();
            },
        };
        context.cameraEffects = processor;
        context.localMediaStream = new TestStream([effectsOutput, audio]);
        await context.toggleScreenSharing();
        assert.equal(composers[0].cameraTrack, effectsOutput);
        context.handleBackgroundError(processor, new Error('GPU lost'));
        assert.equal(composers[0].cameraTrack, camera);
        assert.equal(camera.stopped, 0);
        await context.toggleScreenSharing();
        assert.equal(camera.stopped, 1);
    });
});

describe('screen camera wiring', () => {
    it('loads the composer before the client and exposes the setting', () => {
        assert.match(html, /<script defer src="\.\.\/js\/screen-camera\.js"><\/script>[\s\S]*client\.js/);
        assert.match(html, /<select id="screenCameraSelect">/);
        for (const value of ['off', 'bottom-right', 'bottom-left', 'top-right', 'top-left']) {
            assert.match(html, new RegExp(`<option value="${value}">`));
        }
    });

    it('defaults to off in the stored config', () => {
        const storage = fs.readFileSync(path.join(__dirname, '../frontend/js/storage.js'), 'utf8');
        assert.match(storage, /screen_camera: 'off'/);
    });
});
