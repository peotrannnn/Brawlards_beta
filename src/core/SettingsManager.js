export const defaultSettings = {
    masterVolume: 1.0,
    musicVolume: 0.8,
    sfxVolume: 1.0,
    shadows: true,
    quality: 'high',
    showFPS: false,
    invertY: false,
    mouseSensitivity: 1.0,
};

class SettingsManager {
    constructor() {
        this.settings = { ...defaultSettings };
        this.listeners = [];
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('brawlards_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = { ...defaultSettings, ...parsed };
            }
        } catch (e) {
            console.error('Failed to parse settings', e);
        }
    }

    save() {
        try {
            localStorage.setItem('brawlards_settings', JSON.stringify(this.settings));
            this.notify();
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.save();
    }

    getAll() {
        return { ...this.settings };
    }

    onChange(callback) {
        this.listeners.push(callback);
    }

    notify() {
        for (const callback of this.listeners) {
            callback(this.settings);
        }
    }
}

export const settingsManager = new SettingsManager();
