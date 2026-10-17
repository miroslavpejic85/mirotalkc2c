'use strict';

const RNNOISE_FRAME_SIZE = 480;
const SHIFT_16_BIT_NR = 32768;

class RNNoiseProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.initialized = false;
        this.enabled = false;
        this.Module = null;
        this.rnnoiseContext = null;
        this.wasmPcmInput = null;
        this.wasmPcmInputF32Index = null;
        this.frameBuffer = new Float32Array(RNNOISE_FRAME_SIZE);
        this.bufferIndex = 0;
        this.hasProcessedFrame = false;
        this.processedBuffer = new Float32Array(RNNOISE_FRAME_SIZE);
        this.processedIndex = 0;
        this._destroyed = false;

        // Get the actual sample rate from the audio context
        this.sampleRate = sampleRate || 48000;
        console.log('AudioWorklet processor initialized with sample rate:', this.sampleRate);

        this.setupMessageHandler();
        this.port.postMessage({ type: 'request-wasm' });
    }

    setupMessageHandler() {
        this.port.onmessage = (event) => {
            if (this._destroyed) return;
            const { type, wasmBytes, enabled } = event.data;
            switch (type) {
                case 'wasm-module':
                    this.initModule(wasmBytes);
                    break;
                case 'enable':
                    this.enabled = enabled;
                    break;
                case 'destroy':
                    this.destroy();
                    break;
                default:
                    console.warn('Unknown message type:', type);
            }
        };
    }

    initModule(wasmBytes) {
        try {
            if (this._destroyed) return;
            if (!wasmBytes) throw new Error('Missing RNNoise wasm binary');

            // Standalone wasm, no Emscripten JS glue or eval. Synchronous compile: async
            // WebAssembly APIs are unreliable inside some AudioWorklet scopes.
            const instance = new WebAssembly.Instance(new WebAssembly.Module(wasmBytes), {
                env: { emscripten_notify_memory_growth() {} },
            });
            const exports = instance.exports;
            exports._initialize?.();

            let heapF32 = new Float32Array(exports.memory.buffer);
            this.Module = {
                _malloc: exports.malloc,
                _free: exports.free,
                _rnnoise_create: exports.rnnoise_create,
                _rnnoise_destroy: exports.rnnoise_destroy,
                _rnnoise_process_frame: exports.rnnoise_process_frame,
                // Memory growth detaches the old buffer, so refresh the view when it changes
                get HEAPF32() {
                    if (heapF32.buffer !== exports.memory.buffer) heapF32 = new Float32Array(exports.memory.buffer);
                    return heapF32;
                },
            };
            this._setupWasm();
            this.initialized = true;
            this.port.postMessage({ type: 'wasm-ready' });
        } catch (error) {
            console.error('RNNoise wasm initialization error:', error);
            if (!this._destroyed) {
                this.destroy();
                this.port.postMessage({ type: 'wasm-error', error: error.message });
            }
        }
    }

    _setupWasm() {
        // Allocate input/output buffer (same buffer for in/out)
        this.wasmPcmInput = this.Module._malloc(RNNOISE_FRAME_SIZE * 4);
        this.wasmPcmInputF32Index = this.wasmPcmInput >> 2;
        if (!this.wasmPcmInput) throw new Error('Failed to allocate WASM buffer');

        this.rnnoiseContext = this.Module._rnnoise_create(0);
        if (!this.rnnoiseContext) throw new Error('Failed to create RNNoise context');

        console.log('WASM setup complete:', {
            wasmPcmInput: this.wasmPcmInput,
            rnnoiseContext: this.rnnoiseContext,
            heapF32Available: !!this.Module.HEAPF32,
        });
    }

    process(inputs, outputs, parameters) {
        if (this._destroyed) return false;
        const input = inputs[0]?.[0];
        const output = outputs[0]?.[0];
        if (!input || !output) return true;

        if (!this.initialized || !this.enabled) {
            output.set(input);
            return true;
        }

        for (let i = 0; i < input.length; i++) {
            this.frameBuffer[this.bufferIndex++] = input[i];
            if (this.bufferIndex === RNNOISE_FRAME_SIZE) {
                this._processFrame();
                this.bufferIndex = 0;
                this.hasProcessedFrame = true;
                this.processedIndex = 0;
            }
            output[i] = this.hasProcessedFrame ? this.processedBuffer[this.processedIndex++] : input[i];
        }

        return true;
    }

    _processFrame() {
        if (!this.rnnoiseContext || !this.Module || !this.Module.HEAPF32) return;

        try {
            // Copy input to WASM buffer (as float32)
            let heap = this.Module.HEAPF32;
            for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
                heap[this.wasmPcmInputF32Index + i] = this.frameBuffer[i] * SHIFT_16_BIT_NR;
            }

            // Process frame (in-place)
            this.Module._rnnoise_process_frame(this.rnnoiseContext, this.wasmPcmInput, this.wasmPcmInput);

            // Copy denoised output back and scale down
            heap = this.Module.HEAPF32;
            for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
                this.processedBuffer[i] = heap[this.wasmPcmInputF32Index + i] / SHIFT_16_BIT_NR;
            }
        } catch (error) {
            console.error('Frame processing failed:', error);
            // Fallback to passthrough
            for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
                this.processedBuffer[i] = this.frameBuffer[i];
            }
        }
    }

    destroy() {
        if (this._destroyed) return;
        if (this.wasmPcmInput && this.Module?._free) {
            this.Module._free(this.wasmPcmInput);
            this.wasmPcmInput = null;
        }
        if (this.rnnoiseContext && this.Module?._rnnoise_destroy) {
            this.Module._rnnoise_destroy(this.rnnoiseContext);
            this.rnnoiseContext = null;
        }
        this._destroyed = true;
    }
}

registerProcessor('noise-suppression-processor', RNNoiseProcessor);
