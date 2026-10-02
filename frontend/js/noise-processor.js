'use strict';

class RNNoiseProcessor {
    constructor(noiseSuppressionEnabled = false) {
        this.audioContext = null;
        this.workletNode = null;
        this.mediaStream = null;
        this.sourceNode = null;
        this.destinationNode = null;
        this.isProcessing = false;
        this.noiseSuppressionEnabled = noiseSuppressionEnabled;
        this.cancelInitialization = null;

        console.log('RNNoiseProcessor initialized with noise suppression:', this.noiseSuppressionEnabled);

        this.initializeUI();

        this.setNoiseSuppressionEnabled(noiseSuppressionEnabled);
    }

    /**
     * Check if AudioWorklet and WebAssembly are supported.
     * Mobile browsers may lack AudioWorklet or restrict synchronous WASM compilation.
     * @returns {boolean}
     */
    static isSupported() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const hasAudioWorklet = AudioCtx && 'audioWorklet' in AudioCtx.prototype;
            const hasWebAssembly =
                typeof WebAssembly === 'object' &&
                typeof WebAssembly.Module === 'function' &&
                typeof WebAssembly.Instance === 'function';
            return !!(hasAudioWorklet && hasWebAssembly);
        } catch (e) {
            return false;
        }
    }

    /**
     * Probe whether the device actually supports a 48 kHz sample rate.
     * Creates a temporary AudioContext, checks the real rate, then closes it.
     * @returns {Promise<boolean>}
     */
    static async isSampleRateSupported() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx({ sampleRate: 48000 });
            const actual = ctx.sampleRate;
            await ctx.close();
            return actual === 48000;
        } catch (e) {
            return false;
        }
    }

    initializeUI() {
        this.elements = {
            labelNoiseSuppression: document.getElementById('labelNoiseSuppression'),
            switchNoiseSuppression: document.getElementById('switchNoiseSuppression'),
        };

        this.elements.switchNoiseSuppression.checked = this.noiseSuppressionEnabled;
        this.elements.switchNoiseSuppression.onchange = async (e) => {
            const enabled = e.currentTarget.checked;
            typeof toggleNoiseSuppressionForLocalStream === 'function'
                ? await toggleNoiseSuppressionForLocalStream(enabled)
                : this.setNoiseSuppressionEnabled(enabled);
        };
    }

    async toggleProcessing() {
        this.isProcessing ? this.stopProcessing() : await this.startProcessing(localMediaStream);
    }

    async startProcessing(mediaStream = null) {
        if (!mediaStream) {
            console.warn('No media stream provided to startProcessing');
            return;
        }

        const enabled = this.noiseSuppressionEnabled;
        this.stopProcessing();
        this.noiseSuppressionEnabled = enabled;
        let audioContext;
        let initializationTimer;
        try {
            this.updateStatus('🎤 Starting audio processing...', 'info');

            // 48 kHz support is verified by isSampleRateSupported() at init.
            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
            this.audioContext = audioContext;
            if (audioContext.sampleRate !== 48000) throw new Error('RNNoise requires a 48 kHz audio context');
            this.updateStatus(`🎵 Audio context created with sample rate: ${this.audioContext.sampleRate}Hz`, 'info');

            if (audioContext.state === 'suspended') await audioContext.resume();
            if (this.audioContext !== audioContext) return null;
            if (audioContext.state !== 'running') throw new Error('Audio context is not running');

            this.mediaStream = mediaStream;
            if (!this.mediaStream.getAudioTracks().length) {
                throw new Error('No audio tracks found in the provided media stream');
            }

            console.log('Loading AudioWorklet module...');
            await audioContext.audioWorklet.addModule('./js/noise-suppression-processor.js');
            if (this.audioContext !== audioContext) return null;
            console.log('AudioWorklet module loaded successfully');

            const workletNode = new AudioWorkletNode(audioContext, 'noise-suppression-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [1],
            });

            this.workletNode = workletNode;
            await new Promise((resolve, reject) => {
                this.cancelInitialization = () => reject(new Error('Audio processing stopped during initialization'));
                initializationTimer = setTimeout(() => reject(new Error('RNNoise initialization timed out')), 10000);
                const fail = (error) => {
                    reject(error);
                    if (this.isProcessing) this.onError?.(error);
                };
                workletNode.port.onmessage = (event) => {
                    if (this.workletNode !== workletNode) return;
                    if (event.data.type === 'request-wasm') this.loadWasmBuffer(workletNode).catch(fail);
                    if (event.data.type === 'wasm-ready') resolve();
                    if (event.data.type === 'wasm-error')
                        fail(new Error(event.data.error || 'RNNoise initialization failed'));
                };
                workletNode.onprocessorerror = () => {
                    if (this.workletNode === workletNode) fail(new Error('RNNoise audio worklet failed'));
                };
            });
            if (this.audioContext !== audioContext || this.workletNode !== workletNode) return null;
            this.cancelInitialization = null;

            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.destinationNode = this.audioContext.createMediaStreamDestination();

            console.log('Connecting audio nodes...');
            this.sourceNode.connect(this.workletNode);
            this.workletNode.connect(this.destinationNode);

            // Enable noise suppression by default
            this.workletNode.port.postMessage({
                type: 'enable',
                enabled: this.noiseSuppressionEnabled,
            });

            this.isProcessing = true;
            this.updateUI();
            this.updateStatus('🎤 Audio processing started', 'success');
            console.log('Audio processing started successfully');
            return this.destinationNode.stream;
        } catch (error) {
            if (audioContext && this.audioContext !== audioContext) return null;
            console.error('Error in startProcessing:', error);
            this.updateStatus('❌ Error: ' + error.message, 'error');
            this.isProcessing = false;
            this.stopProcessing();
            return null;
        } finally {
            clearTimeout(initializationTimer);
        }
    }

    async loadWasmBuffer(workletNode = this.workletNode) {
        try {
            if (!this.workletNode) {
                this.updateStatus('⚠️ Worklet node not available, skipping WASM load', 'warning');
                throw new Error('Worklet node is not available');
            }

            this.updateStatus('📦 Loading RNNoise sync module...', 'info');

            console.log('Fetching rnnoise-sync.js...');
            const jsResponse = await fetch('./js/rnnoise-sync.js');

            if (!jsResponse.ok) {
                throw new Error(`Failed to load rnnoise-sync.js: ${jsResponse.status} ${jsResponse.statusText}`);
            }

            const jsContent = await jsResponse.text();
            console.log('rnnoise-sync.js loaded, size:', jsContent.length);
            this.updateStatus('📦 Sending sync module to worklet...', 'info');

            if (this.workletNode !== workletNode) {
                this.updateStatus('⚠️ Worklet node disconnected before WASM could be sent', 'warning');
                throw new Error('Worklet node changed during WASM loading');
            }

            this.workletNode.port.postMessage({
                type: 'sync-module',
                jsContent: jsContent,
            });

            this.updateStatus('📦 Sync module sent to worklet', 'info');
        } catch (error) {
            console.error('Sync module loading error:', error);
            this.updateStatus('❌ Failed to load sync module: ' + error.message, 'error');
            throw error;
        }
    }

    stopProcessing(stopMicrophone = false) {
        this.cancelInitialization?.();
        this.cancelInitialization = null;
        if (stopMicrophone) this.mediaStream?.getAudioTracks().forEach((track) => track.stop());
        this.mediaStream = null;

        // Signal the worklet to free WASM memory before disconnecting
        try {
            this.workletNode?.port?.postMessage({ type: 'destroy' });
        } catch (e) {}

        try {
            this.sourceNode?.disconnect();
        } catch (e) {}
        try {
            this.workletNode?.disconnect();
        } catch (e) {}
        try {
            this.destinationNode?.stream?.getTracks?.().forEach((t) => t.stop());
        } catch (e) {}

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch((error) => console.warn('Audio context cleanup failed:', error));
        }
        this.audioContext = null;

        this.workletNode = null;
        this.sourceNode = null;
        this.destinationNode = null;
        this.isProcessing = false;
        this.noiseSuppressionEnabled = false;

        this.updateUI();
        this.updateStatus('🛑 Audio processing stopped', 'info');
    }

    toggleNoiseSuppression() {
        this.setNoiseSuppressionEnabled(!this.noiseSuppressionEnabled);
    }

    setNoiseSuppressionEnabled(enabled) {
        const wasEnabled = this.noiseSuppressionEnabled;
        this.noiseSuppressionEnabled = enabled;

        if (this.workletNode) {
            this.workletNode.port.postMessage({
                type: 'enable',
                enabled: this.noiseSuppressionEnabled,
            });
        }

        if (wasEnabled !== enabled) {
            this.noiseSuppressionEnabled
                ? this.updateStatus('🔊 RNNoise enabled - background noise will be suppressed', 'success')
                : this.updateStatus('🔇 RNNoise disabled - audio passes through unchanged', 'info');
        }

        this.updateUI();
    }

    updateUI() {
        this.elements.labelNoiseSuppression.disabled = !this.isProcessing;
        //this.elements.labelNoiseSuppression.style.color = this.noiseSuppressionEnabled ? 'green' : 'white';
    }

    updateStatus(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const printMessage = `[${timestamp}] ${message}`;
        switch (type) {
            case 'error':
                console.error(printMessage);
                break;
            case 'success':
                console.info(printMessage);
                break;
            case 'warning':
                console.warn(printMessage);
                break;
            default:
                console.log(printMessage);
                break;
        }
    }

    getProcessedStream() {
        if (!this.isProcessing || !this.destinationNode) {
            return null;
        }
        return this.destinationNode.stream;
    }

    async applyNoiseSuppressionToStream(inputStream) {
        if (!inputStream || !inputStream.getAudioTracks().length) {
            console.warn('No audio tracks found in input stream');
            return inputStream;
        }

        console.log('Starting noise suppression processing...');
        console.log('Input stream tracks:', inputStream.getTracks().length);

        const stream = await this.startProcessing(inputStream);

        if (!stream || !this.isProcessing || !this.destinationNode) {
            console.warn('Noise suppression processing failed');
            console.log('Is processing:', this.isProcessing);
            console.log('Destination node:', !!this.destinationNode);
            return inputStream;
        }

        console.log('Noise suppression processing successful');
        console.log('Destination stream tracks:', this.destinationNode.stream.getTracks().length);

        // Create a new stream with processed audio and original video tracks
        const processedStream = new MediaStream();

        // Add processed audio tracks
        this.destinationNode.stream.getAudioTracks().forEach((track) => {
            console.log('Adding processed audio track:', track.label);
            track.enabled = inputStream.getAudioTracks()[0].enabled;
            processedStream.addTrack(track);
        });
        inputStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
        });

        // Add original video tracks if they exist
        inputStream.getVideoTracks().forEach((track) => {
            console.log('Adding original video track:', track.label);
            processedStream.addTrack(track);
        });

        console.log('Final processed stream tracks:', processedStream.getTracks().length);
        return processedStream;
    }
}
