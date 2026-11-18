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
                    buttons_bar_pinned: null,
                    screen_camera: 'off', // camera bubble over the shared screen: off | bottom-right | bottom-left | top-right | top-left
                    // camera background: mode off | blur | image, image { type: 'preset', url } | { type: 'custom' } | null,
                    // custom: an uploaded image is kept in IndexedDB (ImageStore)
                    background: {
                        mode: 'off',
                        image: null,
                        custom: false,
                    },
                },
            },
            chat: {
                settings: {
                    convert_emoticons: false,
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

// Minimal IndexedDB blob store: images stay in this browser and are never uploaded
class ImageStore {
    constructor(dbName, storeName = 'images') {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async run(mode, action) {
        const db = await this.open();
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(this.storeName, mode);
                const request = action(tx.objectStore(this.storeName));
                tx.oncomplete = () => resolve(request?.result);
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
        } finally {
            db.close();
        }
    }

    get(key) {
        return this.run('readonly', (store) => store.get(key));
    }

    put(key, blob) {
        return this.run('readwrite', (store) => store.put(blob, key));
    }
}
