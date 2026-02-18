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
            const { type, jsContent, enabled } = event.data;
            switch (type) {
                case 'sync-module':
                    this.initSyncModule(jsContent);
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

    async initSyncModule(jsContent) {
        try {
            if (!jsContent) throw new Error('Missing sync module JS content');

            // Execute the module code directly since it's now AudioWorklet compatible
            const createFunction = new Function(jsContent + '; return createRNNWasmModuleSync;')();

            // Initialize the sync module
            this.Module = await createFunction();

            // Wait for the module to be ready
            if (this.Module.ready) {
                await this.Module.ready;
            }

            this._setupWasm();
            this.initialized = true;
            this.port.postMessage({ type: 'wasm-ready' });
        } catch (error) {
            console.error('Sync module initialization error:', error);
            this.port.postMessage({ type: 'wasm-error', error: error.message });
        }
    }

    _setupWasm() {
        // Allocate input/output buffer (same buffer for in/out)
        this.wasmPcmInput = this.Module._malloc(RNNOISE_FRAME_SIZE * 4);
        this.wasmPcmInputF32Index = this.wasmPcmInput >> 2;
        if (!this.wasmPcmInput) throw new Error('Failed to allocate WASM buffer');

        this.rnnoiseContext = this.Module._rnnoise_create();
        if (!this.rnnoiseContext) throw new Error('Failed to create RNNoise context');

        console.log('WASM setup complete:', {
            wasmPcmInput: this.wasmPcmInput,
            rnnoiseContext: this.rnnoiseContext,
            heapF32Available: !!this.Module.HEAPF32,
        });
    }

    process(inputs, outputs, parameters) {
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
            for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
                this.Module.HEAPF32[this.wasmPcmInputF32Index + i] = this.frameBuffer[i] * SHIFT_16_BIT_NR;
            }

            // Process frame (in-place)
            const vadScore = this.Module._rnnoise_process_frame(
                this.rnnoiseContext,
                this.wasmPcmInput,
                this.wasmPcmInput
            );

            // Copy denoised output back and scale down
            for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
                this.processedBuffer[i] = this.Module.HEAPF32[this.wasmPcmInputF32Index + i] / SHIFT_16_BIT_NR;
            }

            // Post VAD score
            if (this.enabled) {
                this.port.postMessage({
                    type: 'vad',
                    probability: vadScore,
                    isSpeech: vadScore > 0.5,
                });
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
