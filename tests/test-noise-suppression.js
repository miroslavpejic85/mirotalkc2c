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
    getAudioTracks() {
        return this.tracks.filter((track) => track.kind === 'audio');
    }
    getVideoTracks() {
        return this.tracks.filter((track) => track.kind === 'video');
    }
    addTrack(track) {
        this.tracks.push(track);
    }
    removeTrack(track) {
        this.tracks = this.tracks.filter((item) => item !== track);
    }
}

function makeTrack(kind = 'audio') {
    return {
        kind,
        enabled: true,
        readyState: 'live',
        settings: { noiseSuppression: true },
        getSettings() {
            return this.settings;
        },
        getConstraints() {
            return {};
        },
        async applyConstraints(constraints) {
            Object.assign(this.settings, constraints);
        },
        stop() {
            this.readyState = 'ended';
        },
    };
}

function loadSource(context, filename) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/js', filename), 'utf8'), context);
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const quietConsole = { log() {}, info() {}, warn() {}, error() {} };

describe('RNNoise startup lifecycle', () => {
    let context;
    let processor;
    let nodes;
    let input;

    beforeEach(() => {
        nodes = [];
        input = new TestStream([makeTrack(), makeTrack('video')]);
        class AudioContext {
            constructor(options) {
                this.sampleRate = options?.sampleRate || 44100;
                this.state = 'running';
                this.audioWorklet = { addModule: async () => {} };
            }
            createMediaStreamSource() {
                return { connect() {}, disconnect() {} };
            }
            createMediaStreamDestination() {
                return { stream: new TestStream([makeTrack()]), disconnect() {} };
            }
            async close() {
                this.state = 'closed';
            }
        }
        class WorkletNode {
            constructor() {
                this.messages = [];
                this.port = { postMessage: (message) => this.messages.push(message) };
                nodes.push(this);
            }
            connect() {}
            disconnect() {}
            send(data) {
                this.port.onmessage({ data });
            }
        }
        context = vm.createContext({
            window: { AudioContext },
            AudioWorkletNode: WorkletNode,
            MediaStream: TestStream,
            document: { getElementById: () => ({}) },
            console: quietConsole,
            setTimeout,
            clearTimeout,
            fetch: async () => ({ ok: true, text: async () => 'module' }),
        });
        loadSource(context, 'noise-processor.js');
        processor = vm.runInContext('new RNNoiseProcessor(true)', context);
    });

    it('waits for WASM readiness and requests a 48 kHz context', async () => {
        let settled = false;
        const operation = processor.startProcessing(input).then(() => {
            settled = true;
        });
        await flush();
        try {
            assert.equal(settled, false);
            assert.equal(processor.isProcessing, false);
            assert.equal(processor.audioContext.sampleRate, 48000);
            nodes[0].send({ type: 'wasm-ready' });
            await operation;
            assert.equal(processor.isProcessing, true);
        } finally {
            processor.stopProcessing();
            await operation;
        }
    });

    it('fails startup without stopping the raw microphone or camera', async () => {
        const operation = processor.startProcessing(input);
        await flush();
        nodes[0].send({ type: 'wasm-error', error: 'allocation failed' });
        assert.equal(await operation, null);
        assert.equal(processor.isProcessing, false);
        assert.ok(input.getTracks().every((track) => track.readyState === 'live'));
    });

    it('keeps the raw input running while the processed output is muted', async () => {
        input.getAudioTracks()[0].enabled = false;
        const operation = processor.applyNoiseSuppressionToStream(input);
        await flush();
        nodes[0].send({ type: 'wasm-ready' });
        const stream = await operation;
        assert.equal(input.getAudioTracks()[0].enabled, true);
        assert.equal(stream.getAudioTracks()[0].enabled, false);
        stream.getAudioTracks()[0].enabled = true;
        assert.equal(input.getAudioTracks()[0].enabled, true);
        processor.stopProcessing();
        assert.equal(input.getVideoTracks()[0].readyState, 'live');
    });

    it('propagates a failed module fetch into startup failure', async () => {
        context.fetch = async () => {
            throw new Error('offline');
        };
        const operation = processor.startProcessing(input);
        await flush();
        nodes[0].send({ type: 'request-wasm' });
        assert.equal(await operation, null);
        assert.equal(processor.audioContext, null);
        assert.equal(input.getAudioTracks()[0].readyState, 'live');
    });

    it('cancels pending initialization and ignores late readiness', async () => {
        const operation = processor.startProcessing(input);
        await flush();
        processor.stopProcessing();
        nodes[0].send({ type: 'wasm-ready' });
        assert.equal(await operation, null);
        assert.equal(processor.isProcessing, false);
        assert.equal(processor.audioContext, null);
    });

    it('fails after a bounded readiness timeout', async () => {
        let expire;
        context.setTimeout = (callback) => {
            expire = callback;
            return 1;
        };
        context.clearTimeout = () => {};
        const operation = processor.startProcessing(input);
        await flush();
        expire();
        assert.equal(await operation, null);
        assert.equal(processor.audioContext, null);
    });

    it('reports runtime processor errors to its owner', async () => {
        let reported;
        processor.onError = (error) => {
            reported = error.message;
        };
        const operation = processor.startProcessing(input);
        await flush();
        nodes[0].send({ type: 'wasm-ready' });
        await operation;
        nodes[0].onprocessorerror();
        assert.equal(reported, 'RNNoise audio worklet failed');
        processor.stopProcessing(true);
        assert.equal(input.getAudioTracks()[0].readyState, 'ended');
        assert.equal(input.getVideoTracks()[0].readyState, 'live');
    });
});

function loadFunctions(context, names) {
    const source = fs.readFileSync(path.join(__dirname, '../frontend/js/client.js'), 'utf8');
    for (const name of names) {
        const declaration = source.indexOf(`function ${name}(`);
        assert.notEqual(declaration, -1, name);
        const start = source.slice(declaration - 6, declaration) === 'async ' ? declaration - 6 : declaration;
        const end = source.indexOf('\n}', declaration) + 2;
        vm.runInContext(source.slice(start, end), context);
    }
}

function deferred() {
    let resolve;
    const promise = new Promise((callback) => {
        resolve = callback;
    });
    return { promise, resolve };
}

describe('client noise suppression lifecycle', () => {
    let context;
    let processors;
    let published;
    let warnings;
    let camera;
    let acquisitions;

    beforeEach(() => {
        processors = [];
        published = [];
        warnings = [];
        acquisitions = [];
        camera = makeTrack('video');
        class Processor {
            static isSupported() {
                return true;
            }
            static async isSampleRateSupported() {
                return true;
            }
            constructor(enabled) {
                this.noiseSuppressionEnabled = enabled;
                this.output = makeTrack();
                processors.push(this);
            }
            updateUI() {}
            stopProcessing(stopMicrophone) {
                this.stopped = true;
                this.output.stop();
                if (stopMicrophone) this.mediaStream?.getAudioTracks().forEach((track) => track.stop());
                this.noiseSuppressionEnabled = false;
            }
            async applyNoiseSuppressionToStream(stream) {
                this.mediaStream = stream;
                this.inputEnabled = stream.getAudioTracks()[0].enabled;
                this.ready = deferred();
                const success = await this.ready.promise;
                if (!success) return stream;
                this.output.enabled = this.inputEnabled;
                stream.getAudioTracks()[0].enabled = true;
                return new TestStream([this.output, ...stream.getVideoTracks()]);
            }
        }
        context = vm.createContext({
            RNNoiseProcessor: Processor,
            MediaStream: TestStream,
            noiseProcessor: null,
            noiseSuppressionRequest: 0,
            noiseSuppressionConstraints: Promise.resolve(),
            microphoneRequest: 0,
            localMediaStream: new TestStream([makeTrack(), camera]),
            isAudioStreaming: true,
            isSafari: false,
            isFirefox: false,
            recording: null,
            switchNoiseSuppression: { checked: true },
            noiseSuppressionDiv: {},
            localStorageConfig: {
                audio: { settings: { noise_suppression: true }, devices: { select: { id: 'mic' } } },
            },
            audioSource: { value: 'mic' },
            navigator: {
                mediaDevices: {
                    getUserMedia() {
                        const acquisition = deferred();
                        acquisitions.push(acquisition);
                        return acquisition.promise;
                    },
                },
            },
            console: quietConsole,
            elemDisplay() {},
            saveLocalStorageConfig() {},
            refreshMyLocalAudioStream(stream) {
                context.localMediaStream = stream;
            },
            refreshMyAudioStreamToPeers(stream) {
                published.push(stream.getAudioTracks()[0]);
            },
            popupMessage: (...args) => warnings.push(args),
        });
        loadFunctions(context, [
            'getAudioConstraints',
            'initNoiseProcessor',
            'stopNoiseProcessor',
            'applyNoiseSuppressionToLocalStream',
            'setMicrophoneNoiseSuppression',
            'fallbackNoiseSuppression',
            'replaceLocalAudioTrack',
            'replaceLocalMicrophone',
            'toggleNoiseSuppressionForLocalStream',
            'changeMicrophone',
        ]);
    });

    async function begin(enabled = true) {
        const operation = context.toggleNoiseSuppressionForLocalStream(enabled);
        const raw = makeTrack();
        acquisitions.at(-1).resolve(new TestStream([raw]));
        await flush();
        return { operation, raw, processor: processors.at(-1) };
    }

    it('acquires raw audio with native suppression enabled', () => {
        assert.equal(context.getAudioConstraints().noiseSuppression, true);
    });

    it('preserves mute across enabling, unmuting, and disabling', async () => {
        context.isAudioStreaming = false;
        const first = await begin();
        assert.equal(first.processor.inputEnabled, false);
        first.processor.ready.resolve(true);
        await first.operation;
        assert.equal(published[0].enabled, false);
        assert.equal(first.raw.enabled, true);
        context.isAudioStreaming = true;
        context.localMediaStream.getAudioTracks()[0].enabled = true;
        assert.equal(first.raw.enabled, true);
        const second = await begin(false);
        await second.operation;
        assert.equal(published.at(-1), second.raw);
        assert.equal(second.raw.enabled, true);
        assert.equal(first.raw.readyState, 'ended');
        assert.equal(camera.readyState, 'live');
    });

    it('publishes only the latest overlapping enable request', async () => {
        const first = await begin();
        const second = await begin();
        second.processor.ready.resolve(true);
        await second.operation;
        first.processor.ready.resolve(true);
        await first.operation;
        assert.deepEqual(published, [second.processor.output]);
        assert.equal(context.noiseProcessor, second.processor);
        assert.equal(second.processor.noiseSuppressionEnabled, true);
        assert.equal(first.raw.readyState, 'ended');
        assert.equal(first.processor.output.readyState, 'ended');
        assert.equal(context.switchNoiseSuppression.checked, true);
    });

    it('does not publish an enable superseded by disable', async () => {
        const first = await begin();
        const second = await begin(false);
        await second.operation;
        first.processor.ready.resolve(true);
        await first.operation;
        assert.deepEqual(published, [second.raw]);
        assert.equal(context.switchNoiseSuppression.checked, false);
        assert.equal(context.localStorageConfig.audio.settings.noise_suppression, false);
    });

    it('rejects a stale microphone acquisition before processing', async () => {
        const first = context.changeMicrophone('old');
        const second = context.changeMicrophone('new');
        const newerRaw = makeTrack();
        acquisitions[1].resolve(new TestStream([newerRaw]));
        await flush();
        processors.at(-1).ready.resolve(true);
        await second;
        const olderRaw = makeTrack();
        acquisitions[0].resolve(new TestStream([olderRaw]));
        await first;
        assert.equal(olderRaw.readyState, 'ended');
        assert.equal(newerRaw.readyState, 'live');
        assert.equal(published.length, 1);
    });

    it('restores native suppression and clears the setting on startup failure', async () => {
        context.isAudioStreaming = false;
        const first = await begin();
        first.raw.settings.noiseSuppression = false;
        first.processor.ready.resolve(false);
        await first.operation;
        assert.equal(first.raw.getSettings().noiseSuppression, true);
        assert.equal(first.raw.readyState, 'live');
        assert.equal(first.raw.enabled, false);
        assert.deepEqual(published, [first.raw]);
        assert.equal(context.switchNoiseSuppression.checked, false);
        assert.equal(context.localStorageConfig.audio.settings.noise_suppression, false);
        assert.match(warnings[0][2], /browser noise suppression/);
    });

    it('does not claim native fallback when constraints fail', async () => {
        const first = await begin();
        first.raw.applyConstraints = async () => {
            throw new Error('unsupported');
        };
        first.processor.ready.resolve(false);
        await first.operation;
        assert.match(warnings[0][2], /without noise suppression/);
        assert.deepEqual(published, [first.raw]);
        assert.equal(first.raw.readyState, 'live');
    });

    it('replaces failed runtime processing with the muted raw microphone', async () => {
        const first = await begin();
        first.processor.ready.resolve(true);
        await first.operation;
        assert.equal(first.raw.settings.noiseSuppression, false);
        context.isAudioStreaming = false;
        await first.processor.onError(new Error('worklet failed'));
        assert.equal(published.at(-1), first.raw);
        assert.equal(first.raw.settings.noiseSuppression, true);
        assert.equal(first.raw.enabled, false);
        assert.equal(camera.readyState, 'live');
    });

    it('ignores a stale runtime error without disabling the newer processor', async () => {
        const first = await begin();
        first.processor.ready.resolve(true);
        await first.operation;
        const second = await begin();
        second.processor.ready.resolve(true);
        await second.operation;
        await first.processor.onError(new Error('late failure'));
        assert.equal(context.noiseProcessor, second.processor);
        assert.equal(context.switchNoiseSuppression.checked, true);
        assert.equal(published.at(-1), second.processor.output);
        assert.equal(warnings.length, 0);
    });

    it('cancels microphone requests on teardown', async () => {
        const operation = context.changeMicrophone('mic');
        context.stopNoiseProcessor();
        const raw = makeTrack();
        acquisitions[0].resolve(new TestStream([raw]));
        await operation;
        assert.equal(raw.readyState, 'ended');
        assert.equal(published.length, 0);
    });
});

describe('RNNoise worklet initialization', () => {
    let context;
    let processor;
    let messages;
    let freed;

    beforeEach(() => {
        messages = [];
        freed = [];
        context = vm.createContext({
            AudioWorkletProcessor: class {
                constructor() {
                    this.port = { postMessage: (message) => messages.push(message) };
                }
            },
            sampleRate: 48000,
            console: quietConsole,
            registerProcessor() {},
            module: {
                HEAPF32: new Float32Array(1024),
                _malloc: () => 4,
                _free: (pointer) => freed.push(pointer),
                _rnnoise_create: () => 8,
                _rnnoise_destroy: (pointer) => freed.push(pointer),
            },
        });
        loadSource(context, 'noise-suppression-processor.js');
        processor = vm.runInContext('new RNNoiseProcessor()', context);
        context.processor = processor;
    });

    function initialize() {
        return vm.runInContext(
            'processor.initSyncModule("function createRNNWasmModuleSync() { return module; }")',
            context
        );
    }

    it('announces readiness only after the context and buffer exist', async () => {
        await initialize();
        assert.equal(processor.initialized, true);
        assert.equal(processor.rnnoiseContext, 8);
        assert.equal(processor.wasmPcmInput, 4);
        assert.equal(messages.at(-1).type, 'wasm-ready');
    });

    it('frees a partial allocation and reports context creation failure', async () => {
        context.module._rnnoise_create = () => 0;
        await initialize();
        assert.equal(processor.initialized, false);
        assert.equal(messages.at(-1).type, 'wasm-error');
        assert.equal(
            messages.some((message) => message.type === 'wasm-ready'),
            false
        );
        assert.deepEqual(freed, [4]);
    });

    it('does not recreate WASM resources after destruction during initialization', async () => {
        const ready = deferred();
        context.module.ready = ready.promise;
        const operation = initialize();
        await flush();
        processor.destroy();
        ready.resolve();
        await operation;
        assert.equal(processor.initialized, false);
        assert.equal(processor.rnnoiseContext, null);
        assert.equal(
            messages.some((message) => message.type === 'wasm-ready'),
            false
        );
        assert.equal(processor.process([], []), false);
    });
});
