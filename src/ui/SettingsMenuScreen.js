import { IT_STYLE } from '../main.js';
import { settingsManager } from '../core/SettingsManager.js';

export function createSettingsScreen(onBack, isGameplayMode = false) {
        if (!document.getElementById('settings-slider-style')) {
                const style = document.createElement('style');
                style.id = 'settings-slider-style';
                style.textContent = `
            .settings-slider-shell {
                position: relative;
                width: 100%;
                height: 14px;
                background: #001a4d;
                border-top: 1px solid #0066FF;
                overflow: hidden;
                box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.45);
            }
            .settings-slider-fill {
                position: absolute;
                inset: 0 auto 0 0;
                width: 0%;
                background: linear-gradient(90deg, #0066FF, #00FF00);
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
                height: 14px;
                background: transparent;
                border: none;
            }
            .settings-slider-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 14px;
                height: 14px;
                margin-top: 0;
                border: 1px solid #0b1322;
                background: #d7f6ff;
                box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.4), 0 0 10px rgba(0, 255, 0, 0.45);
            }
            .settings-slider-input::-moz-range-track {
                height: 14px;
                background: transparent;
                border: none;
            }
            .settings-slider-input::-moz-range-progress {
                height: 14px;
                background: transparent;
            }
            .settings-slider-input::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border: 1px solid #0b1322;
                border-radius: 0;
                background: #d7f6ff;
                box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.4), 0 0 10px rgba(0, 255, 0, 0.45);
            }
        `;
                document.head.appendChild(style);
        }

    const container = document.createElement('div');
    container.id = 'settingsScreen';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.zIndex = '20005';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    container.style.backdropFilter = 'blur(8px)';
    container.style.pointerEvents = 'auto';

    const settingsBox = document.createElement('div');
    IT_STYLE.applyToElement(settingsBox, 'box');
    settingsBox.style.width = '460px';
    settingsBox.style.maxWidth = '90vw';
    settingsBox.style.display = 'flex';
    settingsBox.style.flexDirection = 'column';
    settingsBox.style.gap = '18px';
    settingsBox.style.padding = '18px';
    settingsBox.style.background = 'linear-gradient(180deg, rgba(10, 26, 61, 0.98), rgba(4, 12, 28, 0.98))';
    settingsBox.style.boxShadow = '0 0 34px rgba(0, 102, 255, 0.55), inset 0 0 18px rgba(0, 102, 255, 0.18)';
    settingsBox.style.border = '1px solid rgba(0, 102, 255, 0.8)';

    const title = document.createElement('div');
    title.textContent = 'SETTINGS';
    IT_STYLE.applyToElement(title, 'header');
    title.style.textAlign = 'center';
    title.style.marginBottom = '2px';
    title.style.fontSize = '16px';
    settingsBox.appendChild(title);

    const contentArea = document.createElement('div');
    contentArea.style.display = 'flex';
    contentArea.style.flexDirection = 'column';
    contentArea.style.gap = '18px';
    contentArea.style.maxHeight = '65vh';
    contentArea.style.overflowY = 'auto';
    contentArea.style.paddingRight = '8px';

    // Customize scrollbar for contentArea
    contentArea.style.scrollbarWidth = 'thin';
    contentArea.style.scrollbarColor = `${IT_STYLE.colors.accentBlue} ${IT_STYLE.colors.darkBg}`;

    const createSlider = (label, key, min, max, step) => {
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.gap = '10px';
        wrap.style.padding = '10px 12px';
        wrap.style.background = 'rgba(0, 15, 38, 0.55)';
        wrap.style.border = '1px solid rgba(0, 102, 255, 0.22)';
        wrap.style.boxShadow = 'inset 0 0 10px rgba(0, 102, 255, 0.06)';

        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.justifyContent = 'space-between';
        topRow.style.alignItems = 'baseline';
        topRow.style.gap = '12px';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        labelEl.style.color = IT_STYLE.colors.neonGreen;
        labelEl.style.letterSpacing = '0.8px';
        labelEl.style.fontSize = '11px';
        labelEl.style.textTransform = 'uppercase';

        const valEl = document.createElement('span');
        valEl.textContent = settingsManager.get(key);
        valEl.style.color = '#fff';
        valEl.style.fontWeight = 'bold';
        valEl.style.minWidth = '40px';
        valEl.style.textAlign = 'right';

        const valueBadge = document.createElement('span');
        valueBadge.style.display = 'inline-flex';
        valueBadge.style.alignItems = 'center';
        valueBadge.style.justifyContent = 'center';
        valueBadge.style.minWidth = '52px';
        valueBadge.style.padding = '3px 8px';
        valueBadge.style.border = `1px solid ${IT_STYLE.colors.borderBlue}`;
        valueBadge.style.background = 'rgba(0, 26, 77, 0.85)';
        valueBadge.style.boxShadow = 'inset 0 0 8px rgba(0, 102, 255, 0.12)';
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
        wrap.style.display = 'flex';
        wrap.style.justifyContent = 'space-between';
        wrap.style.alignItems = 'center';
        wrap.style.padding = '10px 12px';
        wrap.style.background = 'rgba(0, 15, 38, 0.55)';
        wrap.style.border = '1px solid rgba(0, 102, 255, 0.22)';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        labelEl.style.color = IT_STYLE.colors.neonGreen;
        labelEl.style.fontSize = '11px';
        labelEl.style.letterSpacing = '0.8px';
        labelEl.style.textTransform = 'uppercase';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = settingsManager.get(key);
        input.style.accentColor = IT_STYLE.colors.accentBlue;
        input.style.width = '18px';
        input.style.height = '18px';
        input.style.cursor = 'pointer';

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
        wrap.style.display = 'flex';
        wrap.style.justifyContent = 'space-between';
        wrap.style.alignItems = 'center';
        wrap.style.gap = '12px';
        wrap.style.padding = '10px 12px';
        wrap.style.background = 'rgba(0, 15, 38, 0.55)';
        wrap.style.border = '1px solid rgba(0, 102, 255, 0.22)';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        labelEl.style.color = IT_STYLE.colors.neonGreen;
        labelEl.style.fontSize = '11px';
        labelEl.style.letterSpacing = '0.8px';
        labelEl.style.textTransform = 'uppercase';

        const select = document.createElement('select');
        select.style.background = IT_STYLE.colors.darkBg;
        select.style.color = '#fff';
        select.style.border = `1px solid ${IT_STYLE.colors.borderBlue}`;
        select.style.padding = '8px 10px';
        select.style.fontFamily = 'inherit';
        select.style.cursor = 'pointer';
        select.style.outline = 'none';
        select.style.minWidth = '120px';
        select.style.boxShadow = 'inset 0 0 8px rgba(0, 102, 255, 0.12)';

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
        header.textContent = `--- ${text} ---`;
        header.style.color = IT_STYLE.colors.accentBlue;
        header.style.textAlign = 'center';
        header.style.fontWeight = 'bold';
        header.style.marginTop = '6px';
        header.style.marginBottom = '0';
        header.style.letterSpacing = '2px';
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
        popup.style.cssText = `
      position: fixed;
      top: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: #ffcc00;
      color: #000;
      padding: 12px 24px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-weight: bold;
      font-size: 11px;
      z-index: 30000;
      box-shadow: 0 0 30px rgba(255, 204, 0, 0.4), 0 0 10px rgba(0,0,0,0.5);
      border: 2px solid #000;
      pointer-events: none;
      animation: fadeInOutSettings 3.5s forwards;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
        popup.textContent = msg;

        if (!document.getElementById('settings-popup-style')) {
            const style = document.createElement('style');
            style.id = 'settings-popup-style';
            style.innerHTML = `
        @keyframes fadeInOutSettings {
          0% { opacity: 0; transform: translate(-50%, -40px); }
          10% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -40px); }
        }
      `;
            document.head.appendChild(style);
        }

        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 3500);
    };

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'RESET DEFAULTS';
    IT_STYLE.applyToElement(resetBtn, 'backButton');
    resetBtn.style.marginTop = '15px';
    resetBtn.style.background = '#b8860b'; // Dark Goldenrod for reset
    resetBtn.style.border = '2px solid #936c09';
    resetBtn.style.width = '100%';
    resetBtn.onclick = () => {
        settingsManager.reset();
        container.remove();
        createSettingsScreen(onBack, isGameplayMode);
    };
    settingsBox.appendChild(resetBtn);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = 'BACK TO MENU';
    IT_STYLE.applyToElement(backBtn, 'backButton');
    backBtn.style.marginTop = '15px';
    backBtn.style.alignSelf = 'center';
    backBtn.style.width = '100%';

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

    settingsBox.appendChild(backBtn);
    container.appendChild(settingsBox);
    document.body.appendChild(container);

    return () => {
        window.removeEventListener('keydown', handleEsc);
        container.remove();
    };
}
