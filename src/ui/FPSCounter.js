import { IT_STYLE } from '../main.js';
import { settingsManager } from '../core/SettingsManager.js';

export function initFPSCounter() {
    const fpsDiv = document.createElement('div');
    fpsDiv.id = 'fpsCounter';
    fpsDiv.style.position = 'fixed';
    fpsDiv.style.top = '10px';
    fpsDiv.style.right = '10px';
    fpsDiv.style.color = IT_STYLE.colors.neonGreen;
    fpsDiv.style.fontFamily = "'Consolas', 'Monaco', monospace";
    fpsDiv.style.fontSize = '14px';
    fpsDiv.style.fontWeight = 'bold';
    fpsDiv.style.textShadow = '1px 1px 2px #000, 0 0 8px #000';
    fpsDiv.style.zIndex = '30000'; // Make sure it's above everything
    fpsDiv.style.pointerEvents = 'none';
    fpsDiv.style.display = settingsManager.get('showFPS') ? 'block' : 'none';
    
    document.body.appendChild(fpsDiv);

    settingsManager.onChange((settings) => {
        fpsDiv.style.display = settings.showFPS ? 'block' : 'none';
    });

    let frames = 0;
    let prevTime = performance.now();

    function update() {
        if (fpsDiv.style.display !== 'none') {
            frames++;
            const time = performance.now();
            if (time >= prevTime + 1000) {
                fpsDiv.textContent = `FPS: ${Math.round((frames * 1000) / (time - prevTime))}`;
                prevTime = time;
                frames = 0;
            }
        } else {
            // reset logic so it immediately updates when shown again
            prevTime = performance.now();
            frames = 0;
        }
        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}
