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
        this.C2C_CONFIG = config;
        this.setItem('C2C_CONFIG', JSON.stringify(this.C2C_CONFIG));
    }

    getItem(key) {
        return localStorage.getItem(key);
    }

    getConfig() {
        return JSON.parse(this.getItem('C2C_CONFIG'));
    }
}
