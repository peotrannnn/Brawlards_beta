export const defaultSettings = {
    masterVolume: 1.0,
    musicVolume: 0.8,
    sfxVolume: 1.0,
    shadows: true,
    quality: 'high',
    invertY: false,
    mouseSensitivity: 1.0,
    brightness: 1.0,
};

function normalizeSettings(raw = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const safe = {
        ...defaultSettings,
        masterVolume: Number.isFinite(source.masterVolume) ? source.masterVolume : defaultSettings.masterVolume,
        musicVolume: Number.isFinite(source.musicVolume) ? source.musicVolume : defaultSettings.musicVolume,
        sfxVolume: Number.isFinite(source.sfxVolume) ? source.sfxVolume : defaultSettings.sfxVolume,
        shadows: 'shadows' in source ? Boolean(source.shadows) : defaultSettings.shadows,
        invertY: 'invertY' in source ? Boolean(source.invertY) : defaultSettings.invertY,
        mouseSensitivity: Number.isFinite(source.mouseSensitivity) ? source.mouseSensitivity : defaultSettings.mouseSensitivity,
        brightness: Number.isFinite(source.brightness) ? source.brightness : defaultSettings.brightness,
        quality: typeof source.quality === 'string' ? source.quality : defaultSettings.quality,
    };
    const quality = typeof safe.quality === 'string' ? safe.quality.toLowerCase() : defaultSettings.quality;
    safe.quality = ['low', 'medium', 'high'].includes(quality) ? quality : defaultSettings.quality;
    safe.brightness = Number.isFinite(safe.brightness) ? Math.max(0.6, Math.min(1.4, safe.brightness)) : defaultSettings.brightness;
    return safe;
}

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
                this.settings = normalizeSettings(parsed);
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
        this.settings = normalizeSettings(this.settings);
        this.save();
    }

    reset() {
        this.settings = { ...defaultSettings };
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
