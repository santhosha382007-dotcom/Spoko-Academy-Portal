// Electron Preload Script: Injects platform identifiers into window object
try {
    const { contextBridge } = require('electron');
    if (contextBridge && contextBridge.exposeInMainWorld) {
        contextBridge.exposeInMainWorld('isWindowsApp', true);
        contextBridge.exposeInMainWorld('electron', true);
    }
} catch (e) {}

if (typeof window !== 'undefined') {
    window.isWindowsApp = true;
    window.electron = true;
}
