import { IT_STYLE } from '../main.js';
import { settingsManager } from '../core/SettingsManager.js';

export function createSettingsScreen(onBack) {
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
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  container.style.backdropFilter = 'blur(8px)';
  container.style.pointerEvents = 'auto';

  const settingsBox = document.createElement('div');
  IT_STYLE.applyToElement(settingsBox, 'box');
  settingsBox.style.width = '420px';
  settingsBox.style.maxWidth = '90vw';
  settingsBox.style.display = 'flex';
  settingsBox.style.flexDirection = 'column';
  settingsBox.style.gap = '15px';
  settingsBox.style.boxShadow = '0 0 30px rgba(0, 102, 255, 0.8), inset 0 0 15px rgba(0, 102, 255, 0.4)';

  const title = document.createElement('div');
  title.textContent = 'SETTINGS';
  IT_STYLE.applyToElement(title, 'header');
  title.style.textAlign = 'center';
  title.style.marginBottom = '10px';
  title.style.fontSize = '16px';
  settingsBox.appendChild(title);

  const contentArea = document.createElement('div');
  contentArea.style.display = 'flex';
  contentArea.style.flexDirection = 'column';
  contentArea.style.gap = '16px';
  contentArea.style.maxHeight = '65vh';
  contentArea.style.overflowY = 'auto';
  contentArea.style.paddingRight = '10px';

  // Customize scrollbar for contentArea
  contentArea.style.scrollbarWidth = 'thin';
  contentArea.style.scrollbarColor = `${IT_STYLE.colors.accentBlue} ${IT_STYLE.colors.darkBg}`;

  const createSlider = (label, key, min, max, step) => {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';

    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'space-between';
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.color = IT_STYLE.colors.neonGreen;
    
    const valEl = document.createElement('span');
    valEl.textContent = settingsManager.get(key);
    valEl.style.color = '#fff';

    topRow.appendChild(labelEl);
    topRow.appendChild(valEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = settingsManager.get(key);
    input.style.width = '100%';
    input.style.accentColor = IT_STYLE.colors.accentBlue;
    input.style.cursor = 'pointer';

    input.oninput = (e) => {
        const val = parseFloat(e.target.value);
        valEl.textContent = val;
        settingsManager.set(key, val);
    };

    wrap.appendChild(topRow);
    wrap.appendChild(input);
    return wrap;
  };

  const createCheckbox = (label, key) => {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.justifyContent = 'space-between';
    wrap.style.alignItems = 'center';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.color = IT_STYLE.colors.neonGreen;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = settingsManager.get(key);
    input.style.accentColor = IT_STYLE.colors.accentBlue;
    input.style.width = '18px';
    input.style.height = '18px';
    input.style.cursor = 'pointer';

    input.onchange = (e) => {
        settingsManager.set(key, e.target.checked);
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

      const labelEl = document.createElement('span');
      labelEl.textContent = label;
      labelEl.style.color = IT_STYLE.colors.neonGreen;

      const select = document.createElement('select');
      select.style.background = IT_STYLE.colors.darkBg;
      select.style.color = '#fff';
      select.style.border = `1px solid ${IT_STYLE.colors.borderBlue}`;
      select.style.padding = '6px 10px';
      select.style.fontFamily = 'inherit';
      select.style.cursor = 'pointer';
      select.style.outline = 'none';

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
      header.style.marginTop = '10px';
      header.style.marginBottom = '5px';
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
      {label: 'High', value: 'high'},
      {label: 'Medium', value: 'medium'},
      {label: 'Low', value: 'low'}
  ]));
  contentArea.appendChild(createCheckbox('Shadows', 'shadows'));
  contentArea.appendChild(createCheckbox('Show FPS', 'showFPS'));

  // 3. CONTROLS
  contentArea.appendChild(createHeader('CONTROLS'));
  contentArea.appendChild(createSlider('Mouse Sensitivity', 'mouseSensitivity', 0.1, 3.0, 0.1));
  contentArea.appendChild(createCheckbox('Invert Y-Axis', 'invertY'));

  settingsBox.appendChild(contentArea);

  // Back button
  const backBtn = document.createElement('button');
  backBtn.textContent = 'BACK TO MENU';
  IT_STYLE.applyToElement(backBtn, 'backButton');
  backBtn.style.marginTop = '15px';
  backBtn.style.alignSelf = 'center';
  backBtn.style.width = '100%';
  
  backBtn.onclick = () => {
      container.remove();
      if (onBack) onBack();
  };

  settingsBox.appendChild(backBtn);
  container.appendChild(settingsBox);
  document.body.appendChild(container);

  return () => {
      container.remove();
  };
}
