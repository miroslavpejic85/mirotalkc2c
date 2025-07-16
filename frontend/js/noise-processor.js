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

        console.log('RNNoiseProcessor initialized with noise suppression:', this.noiseSuppressionEnabled);

        this.initializeUI();

        this.setNoiseSuppressionEnabled(noiseSuppressionEnabled);
    }

    initializeUI() {
        this.elements = {
            labelNoiseSuppression: document.getElementById('labelNoiseSuppression'),
            switchNoiseSuppression: document.getElementById('switchNoiseSuppression'),
        };

        this.elements.switchNoiseSuppression.checked = this.noiseSuppressionEnabled;
        this.elements.switchNoiseSuppression.onchange = (e) => {
            typeof toggleNoiseSuppressionForLocalStream === 'function'
                ? toggleNoiseSuppressionForLocalStream()
                : this.toggleNoiseSuppression();
            localStorageConfig.audio.settings.noise_suppression = e.currentTarget.checked;
            saveLocalStorageConfig();
            this.updateUI();
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

        try {
            this.updateStatus('🎤 Starting audio processing...', 'info');

            this.mediaStream = mediaStream;
            this.audioContext = new AudioContext();
            const sampleRate = this.audioContext.sampleRate;
            this.updateStatus(`🎵 Audio context created with sample rate: ${sampleRate}Hz`, 'info');

            console.log('Loading AudioWorklet module...');
            await this.audioContext.audioWorklet.addModule('./js/noise-suppression-processor.js');
            console.log('AudioWorklet module loaded successfully');

            this.workletNode = new AudioWorkletNode(this.audioContext, 'noise-suppression-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [1],
            });

            this.workletNode.port.onmessage = (event) => {
                if (event.data.type === 'request-wasm') {
                    console.log('Worklet requesting WASM module...');
                    this.loadWasmBuffer();
                } else if (event.data.type === 'wasm-ready') {
                    console.log('WASM module ready in worklet');
                    this.updateStatus('✅ RNNoise WASM initialized successfully', 'success');
                } else if (event.data.type === 'wasm-error') {
                    console.error('WASM error in worklet:', event.data.error);
                    this.updateStatus('❌ RNNoise WASM error: ' + event.data.error, 'error');
                } else if (event.data.type === 'vad') {
                    if (event.data.isSpeech) {
                        //this.updateStatus(`🗣️ Speech detected (VAD: ${event.data.probability.toFixed(2)})`, 'info');
                    }
                }
            };

            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.destinationNode = this.audioContext.createMediaStreamDestination();

            console.log('Connecting audio nodes...');
            this.sourceNode.connect(this.workletNode);
            this.workletNode.connect(this.destinationNode);

            // Enable noise suppression by default
            this.workletNode.port.postMessage({
                type: 'enable',
                enabled: true,
            });

            this.isProcessing = true;
            this.updateUI();
            this.updateStatus('🎤 Audio processing started', 'success');
            console.log('Audio processing started successfully');
        } catch (error) {
            console.error('Error in startProcessing:', error);
            this.updateStatus('❌ Error: ' + error.message, 'error');
        }
    }

    async loadWasmBuffer() {
        try {
            this.updateStatus('📦 Loading RNNoise sync module...', 'info');

            console.log('Fetching rnnoise-sync.js...');
            const jsResponse = await fetch('./js/rnnoise-sync.js');

            if (!jsResponse.ok) {
                throw new Error(`Failed to load rnnoise-sync.js: ${jsResponse.status} ${jsResponse.statusText}`);
            }

            const jsContent = await jsResponse.text();
            console.log('rnnoise-sync.js loaded, size:', jsContent.length);
            this.updateStatus('📦 Sending sync module to worklet...', 'info');

            this.workletNode.port.postMessage({
                type: 'sync-module',
                jsContent: jsContent,
            });

            this.updateStatus('📦 Sync module sent to worklet', 'info');
        } catch (error) {
            console.error('Sync module loading error:', error);
            this.updateStatus('❌ Failed to load sync module: ' + error.message, 'error');
        }
    }

    stopProcessing() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }

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
        this.elements.labelNoiseSuppression.style.color = this.noiseSuppressionEnabled ? 'lime' : 'white';
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

        await this.startProcessing(inputStream);

        if (!this.isProcessing || !this.destinationNode) {
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
            processedStream.addTrack(track);
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
