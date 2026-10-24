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
                    noise_suppression_user_set: false, // User explicitly toggled it, so the server default no longer applies
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
                    screen_camera: 'off', // camera bubble over the shared screen: off | bottom-right | bottom-left | top-right | top-left
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
        const stored = this.getItem('C2C_CONFIG');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Config saved by older versions may miss newer keys, so fill them from the defaults
                const config = this.mergeDefaults(this.C2C_CONFIG, parsed);
                this.setConfig(config);
                return config;
            } catch (error) {
                console.warn('Invalid stored config, resetting to defaults', error);
            }
        }
        const defaults = JSON.parse(JSON.stringify(this.C2C_CONFIG));
        this.setConfig(defaults);
        return defaults;
    }

    mergeDefaults(defaults, stored) {
        const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
        if (!isObject(stored)) return JSON.parse(JSON.stringify(defaults));
        const result = { ...stored };
        for (const key of Object.keys(defaults)) {
            result[key] = isObject(defaults[key])
                ? this.mergeDefaults(defaults[key], stored[key])
                : key in stored
                  ? stored[key]
                  : defaults[key];
        }
        return result;
    }
}
