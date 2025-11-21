'use strict';

class LocalStorage {
    constructor() {
        this.DEVICES_COUNT = {
            audio: 0,
            video: 0,
            speaker: 0,
        };

        this.C2C_CONFIG = {
            audio: {
                init: {
                    active: true,
                },
                devices: {
                    count: 0,
                    select: {
                        index: 0,
                        label: null,
                        id: null,
                    },
                },
                settings: {
                    noise_suppression: true, // Noise suppression using RNNoise
                },
            },
            speaker: {
                devices: {
                    count: 0,
                    select: {
                        index: 0,
                        label: null,
                        id: null,
                    },
                },
            },
            video: {
                init: {
                    active: true,
                    hide: false,
                },
                devices: {
                    count: 0,
                    select: {
                        index: 0,
                        label: null,
                        id: null,
                    },
                },
                settings: {
                    quality_index: 0,
                    fps_index: 0,
                    best_quality: false,
                    aspect_ratio: false,
                },
            },
        };
    }

    setItem(key, value) {
        localStorage.setItem(key, value);
    }

    setConfig(config) {
        this.setItem('C2C_CONFIG', JSON.stringify(config));
    }

    getItem(key) {
        return localStorage.getItem(key);
    }

    getConfig() {
        const config = this.getItem('C2C_CONFIG');
        if (config) return JSON.parse(config);
        this.setConfig(this.C2C_CONFIG);
        return JSON.parse(JSON.stringify(this.C2C_CONFIG));
    }
}
