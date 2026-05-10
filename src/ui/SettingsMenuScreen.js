import { IT_STYLE } from '../main.js';
import { settingsManager } from '../core/SettingsManager.js';

const SETTINGS_SCREEN_STYLE_ID = 'settings-screen-style';

function ensureSettingsScreenStyles() {
        if (document.getElementById(SETTINGS_SCREEN_STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = SETTINGS_SCREEN_STYLE_ID;
        style.textContent = `
            .settings-screen-overlay {
                position: fixed;
                inset: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: clamp(14px, 3vw, 32px);
                box-sizing: border-box;
                z-index: 20005;
                background: rgba(0, 0, 0, 0.46);
                backdrop-filter: blur(10px);
                pointer-events: auto;
            }
            .settings-screen-box {
                width: min(92vw, 560px);
                max-height: min(86vh, 760px);
                display: flex;
                flex-direction: column;
                gap: 0;
                background: ${IT_STYLE.colors.darkBg};
                border: 2px solid ${IT_STYLE.colors.accentBlue};
                color: ${IT_STYLE.colors.neonGreen};
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: clamp(11px, 0.35vw + 9px, 13px);
                line-height: 1.6;
                box-shadow: 0 2px 16px #0008;
                overflow: hidden;
            }
            .settings-screen-title {
                background: ${IT_STYLE.colors.accentBlue};
                color: #000;
                padding: 12px 20px;
                border-bottom: 2px solid ${IT_STYLE.colors.borderBlue};
                font-weight: bold;
                font-size: 14px;
                letter-spacing: 1px;
                text-transform: uppercase;
                text-align: center;
            }
            .settings-screen-content {
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-height: min(64vh, 560px);
                overflow-y: auto;
                padding: 14px;
                scrollbar-width: none;
            }
            .settings-screen-content::-webkit-scrollbar {
                display: none;
            }
            .settings-section-header {
                background: ${IT_STYLE.colors.accentBlue};
                color: #000;
                padding: 6px 12px;
                font-weight: bold;
                font-size: 11px;
                letter-spacing: 1px;
                text-transform: uppercase;
                text-align: left;
                border-bottom: 2px solid ${IT_STYLE.colors.borderBlue};
                margin-top: 6px;
            }
            .settings-control-card {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding: 10px 12px;
                background: rgba(0, 15, 38, 0.5);
                border: 1px solid ${IT_STYLE.colors.borderBlue};
                box-shadow: inset 0 0 8px rgba(0, 102, 255, 0.08);
                min-width: 0;
            }
            .settings-control-card--inline {
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
            }
            .settings-control-row {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: 12px;
                min-width: 0;
            }
            .settings-control-label {
                color: ${IT_STYLE.colors.neonGreen};
                font-size: 11px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                text-align: left;
                flex: 1 1 auto;
                min-width: 0;
            }
            .settings-value-badge {
                display: inline-flex;
                align-items: center;
                justify-content: flex-end;
                min-width: clamp(58px, 10vw, 76px);
                padding: 4px 9px;
                border: 1px solid ${IT_STYLE.colors.borderBlue};
                background: rgba(0, 26, 77, 0.82);
                color: #fff;
                box-shadow: inset 0 0 8px rgba(0, 102, 255, 0.12);
            }
            .settings-value-text {
                color: #fff;
                font-weight: bold;
                text-align: right;
            }
            .settings-slider-shell {
                position: relative;
                width: 100%;
                height: clamp(12px, 1.7vw, 14px);
                background: ${IT_STYLE.colors.darkAccent};
                border-top: 1px solid ${IT_STYLE.colors.accentBlue};
                overflow: hidden;
                box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.45);
            }
            .settings-slider-fill {
                position: absolute;
                inset: 0 auto 0 0;
                width: 0%;
                background: linear-gradient(90deg, ${IT_STYLE.colors.accentBlue}, ${IT_STYLE.colors.neonGreen});
                box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
                pointer-events: none;
            }
            .settings-slider-input {
                position: absolute;
                inset: -6px 0;
                width: 100%;
                margin: 0;
                background: transparent;
                -webkit-appearance: none;
                appearance: none;
                cursor: pointer;
            }
            .settings-slider-input:focus {
                outline: none;
            }
            .settings-slider-input::-webkit-slider-runnable-track {
                height: clamp(12px, 1.7vw, 14px);
                background: transparent;
                border: none;
            }
            .settings-slider-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: clamp(14px, 1.9vw, 16px);
                height: clamp(14px, 1.9vw, 16px);
                margin-top: 0;
                border: 1px solid #0b1322;
                background: #d7f6ff;
                box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.4), 0 0 10px rgba(0, 255, 0, 0.45);
            }
            .settings-slider-input::-moz-range-track {
                height: clamp(12px, 1.7vw, 14px);
                background: transparent;
                border: none;
            }
            .settings-slider-input::-moz-range-progress {
                height: clamp(12px, 1.7vw, 14px);
                background: transparent;
            }
            .settings-slider-input::-moz-range-thumb {
                width: clamp(14px, 1.9vw, 16px);
                height: clamp(14px, 1.9vw, 16px);
                border: 1px solid #0b1322;
                border-radius: 0;
                background: #d7f6ff;
                box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.4), 0 0 10px rgba(0, 255, 0, 0.45);
            }
            .settings-checkbox-input {
                width: clamp(17px, 2vw, 20px);
                height: clamp(17px, 2vw, 20px);
                cursor: pointer;
                accent-color: ${IT_STYLE.colors.accentBlue};
                flex: 0 0 auto;
            }
            .settings-select {
                flex: 0 1 auto;
                min-width: 132px;
                max-width: 100%;
                background: ${IT_STYLE.colors.darkBg};
                color: #fff;
                border: 1px solid ${IT_STYLE.colors.borderBlue};
                padding: 8px 10px;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 11px;
                letter-spacing: 0.05em;
                cursor: pointer;
                outline: none;
                box-shadow: inset 0 0 8px rgba(0, 102, 255, 0.12);
            }
            .settings-action-group {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 10px;
                padding: 0 14px 16px;
            }
            .settings-action-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: auto;
                max-width: 100%;
                padding: 9px 14px;
                border: 2px solid ${IT_STYLE.colors.borderBlue};
                background: linear-gradient(180deg, ${IT_STYLE.colors.accentBlue}, ${IT_STYLE.colors.borderBlue});
                color: #000;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-weight: bold;
                font-size: 11px;
                letter-spacing: 1px;
                text-transform: uppercase;
                cursor: pointer;
                box-shadow: 0 0 15px rgba(0, 102, 255, 0.42), inset 0 0 8px rgba(0, 255, 0, 0.16);
                transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
            }
            .settings-action-button:hover {
                transform: translateY(-1px);
                box-shadow: 0 0 22px rgba(0, 102, 255, 0.58), inset 0 0 12px rgba(0, 255, 0, 0.24);
                filter: brightness(1.04);
            }
            .settings-action-button--reset {
                background: linear-gradient(180deg, #c09012, #8b650a);
                border-color: #6c4f08;
                color: #111;
                box-shadow: 0 0 18px rgba(192, 144, 18, 0.3), inset 0 0 10px rgba(255, 239, 184, 0.12);
            }
            .settings-action-button--reset:hover {
                box-shadow: 0 0 24px rgba(192, 144, 18, 0.42), inset 0 0 12px rgba(255, 239, 184, 0.18);
            }
            .settings-notice-popup {
                position: fixed;
                top: clamp(18px, 3vw, 40px);
                right: clamp(18px, 3vw, 40px);
                max-width: min(76vw, 420px);
                padding: 0;
                background: ${IT_STYLE.colors.darkBg};
                border: 2px solid ${IT_STYLE.colors.accentBlue};
                color: ${IT_STYLE.colors.neonGreen};
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: clamp(10px, 0.45vw + 8px, 12px);
                line-height: 1.6;
                box-shadow: 0 0 20px rgba(0, 102, 255, 0.6), inset 0 0 10px rgba(0, 102, 255, 0.3);
                overflow: hidden;
                z-index: 30000;
                pointer-events: none;
                animation: settingsNoticeFade 3.5s forwards;
            }
            .settings-notice-popup::before {
                content: '> SYSTEM NOTICE';
                display: block;
                background: ${IT_STYLE.colors.accentBlue};
                color: #000;
                padding: 6px 12px;
                border-bottom: 2px solid ${IT_STYLE.colors.borderBlue};
                font-weight: bold;
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }
            .settings-notice-popup__body {
                padding: 12px;
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }
            @keyframes settingsNoticeFade {
                0% { opacity: 0; transform: translateX(20px); }
                10% { opacity: 1; transform: translateX(0); }
                85% { opacity: 1; transform: translateX(0); }
                100% { opacity: 0; transform: translateX(20px); }
            }
            @media (max-width: 640px) {
                .settings-screen-box {
                    width: min(94vw, 560px);
                }
                .settings-screen-content {
                    max-height: min(60vh, 500px);
                }
                .settings-control-card--inline {
                    align-items: flex-start;
                }
                .settings-select {
                    max-width: none;
                    width: 100%;
                }
                .settings-action-group {
                    justify-content: stretch;
                }
                .settings-action-button {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
}

export function createSettingsScreen(onBack, isGameplayMode = false) {
    ensureSettingsScreenStyles();

    const container = document.createElement('div');
    container.id = 'settingsScreen';
    container.className = 'settings-screen-overlay';

    const settingsBox = document.createElement('div');
    settingsBox.className = 'settings-screen-box';

    const title = document.createElement('div');
    title.textContent = '> SETTINGS.exe';
    title.className = 'settings-screen-title';
    settingsBox.appendChild(title);

    const contentArea = document.createElement('div');
    contentArea.className = 'settings-screen-content';

    const createSlider = (label, key, min, max, step) => {
        const wrap = document.createElement('div');
        wrap.className = 'settings-control-card';

        const topRow = document.createElement('div');
        topRow.className = 'settings-control-row';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        labelEl.className = 'settings-control-label';

        const valEl = document.createElement('span');
        valEl.textContent = settingsManager.get(key);
        valEl.className = 'settings-value-text';

        const valueBadge = document.createElement('span');
        valueBadge.className = 'settings-value-badge';
        valueBadge.appendChild(valEl);

        topRow.appendChild(labelEl);
        topRow.appendChild(valueBadge);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = settingsManager.get(key);
        input.className = 'settings-slider-input';

        const sliderShell = document.createElement('div');
        sliderShell.className = 'settings-slider-shell';
        const sliderFill = document.createElement('div');
        sliderFill.className = 'settings-slider-fill';
        sliderShell.appendChild(sliderFill);
        sliderShell.appendChild(input);

        const updateSliderFill = (value) => {
            const numericValue = Number(value);
            const percentage = ((numericValue - Number(min)) / (Number(max) - Number(min))) * 100;
            sliderFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        };

        input.oninput = (e) => {
            const val = parseFloat(e.target.value);
            valEl.textContent = val;
            settingsManager.set(key, val);
            updateSliderFill(val);
        };

        updateSliderFill(input.value);

        wrap.appendChild(topRow);
        wrap.appendChild(sliderShell);
        return wrap;
    };

    const createCheckbox = (label, key) => {
        const wrap = document.createElement('div');
        wrap.className = 'settings-control-card settings-control-card--inline';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        labelEl.className = 'settings-control-label';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = settingsManager.get(key);
        input.className = 'settings-checkbox-input';

        input.onchange = (e) => {
            settingsManager.set(key, e.target.checked);
            if ((key === 'shadows' || key === 'quality') && isGameplayMode) showPopup('Please restart to fully apply graphics changes');
        };

        wrap.appendChild(labelEl);
        wrap.appendChild(input);
        return wrap;
    };

    const createSelect = (label, key, options) => {
        const wrap = document.createElement('div');
        wrap.className = 'settings-control-card settings-control-card--inline';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        labelEl.className = 'settings-control-label';

        const select = document.createElement('select');
        select.className = 'settings-select';

        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.value;
            optionEl.textContent = opt.label;
            if (opt.value === settingsManager.get(key)) {
                optionEl.selected = true;
            }
            select.appendChild(optionEl);
        });

        select.onchange = (e) => {
            settingsManager.set(key, e.target.value);
            if (key === 'quality' && isGameplayMode) showPopup('Please restart to fully apply graphics changes');
        };

        wrap.appendChild(labelEl);
        wrap.appendChild(select);
        return wrap;
    };

    const createHeader = (text) => {
        const header = document.createElement('div');
        header.textContent = text;
        header.className = 'settings-section-header';
        return header;
    };

    // 1. AUDIO
    contentArea.appendChild(createHeader('AUDIO'));
    contentArea.appendChild(createSlider('Master Volume', 'masterVolume', 0, 1, 0.05));
    contentArea.appendChild(createSlider('Music Volume', 'musicVolume', 0, 1, 0.05));
    contentArea.appendChild(createSlider('SFX Volume', 'sfxVolume', 0, 1, 0.05));

    // 2. GRAPHICS
    contentArea.appendChild(createHeader('GRAPHICS'));
    contentArea.appendChild(createSelect('Quality', 'quality', [
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' }
    ]));
    contentArea.appendChild(createCheckbox('Shadows', 'shadows'));
    contentArea.appendChild(createSlider('Brightness', 'brightness', 0.2, 2.0, 0.1));
    contentArea.appendChild(createCheckbox('Show FPS', 'showFPS'));

    // 3. CONTROLS
    contentArea.appendChild(createHeader('CONTROLS'));
    contentArea.appendChild(createSlider('Mouse Sensitivity', 'mouseSensitivity', 0.1, 3.0, 0.1));
    contentArea.appendChild(createCheckbox('Invert Y-Axis', 'invertY'));

    settingsBox.appendChild(contentArea);

    const showPopup = (msg) => {
        const popup = document.createElement('div');
        popup.className = 'settings-notice-popup';
        const popupBody = document.createElement('div');
        popupBody.className = 'settings-notice-popup__body';
        popupBody.textContent = msg;
        popup.appendChild(popupBody);

        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 3500);
    };

    const actionGroup = document.createElement('div');
    actionGroup.className = 'settings-action-group';

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'RESET DEFAULTS';
    resetBtn.className = 'settings-action-button settings-action-button--reset';
    resetBtn.onclick = () => {
        settingsManager.reset();
        window.removeEventListener('keydown', handleEsc);
        container.remove();
        createSettingsScreen(onBack, isGameplayMode);
    };
    actionGroup.appendChild(resetBtn);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = 'BACK TO MENU';
    backBtn.className = 'settings-action-button';

    const closeSettings = () => {
        window.removeEventListener('keydown', handleEsc);
        container.remove();
        if (onBack) onBack();
    };

    const handleEsc = (e) => {
        if (e.code === 'Escape') {
            e.preventDefault();
            closeSettings();
        }
    };
    window.addEventListener('keydown', handleEsc);

    backBtn.onclick = () => {
        closeSettings();
    };

    actionGroup.appendChild(backBtn);
    settingsBox.appendChild(actionGroup);
    container.appendChild(settingsBox);
    document.body.appendChild(container);

    return () => {
        window.removeEventListener('keydown', handleEsc);
        container.remove();
    };
}
