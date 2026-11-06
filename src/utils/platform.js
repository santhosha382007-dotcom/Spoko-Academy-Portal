/**
 * Spoko Academy Portal Platform Detection Utility
 * Determines if application is running in Windows PC (.exe desktop app) vs Mobile (.apk / mobile browser).
 */

export const isWindowsPlatform = () => {
    if (typeof window !== 'undefined') {
        // 1. Explicit flag injected by Electron preload script
        if (window.isWindowsApp || window.electron) {
            return true;
        }

        // 2. Capacitor native runtime is strictly mobile
        if (window.Capacitor?.isNativePlatform?.()) {
            return false;
        }

        // 3. User agent / Platform evaluation
        const ua = navigator.userAgent || '';
        const platform = navigator.platform || '';

        // Mobile devices are not Windows desktop apps
        if (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
            return false;
        }

        // Windows desktop detection
        if (platform.toUpperCase().indexOf('WIN') !== -1 || ua.indexOf('Windows') !== -1) {
            return true;
        }
    }
    return false;
};

export const isMobilePlatform = () => {
    if (typeof window !== 'undefined') {
        if (window.Capacitor?.isNativePlatform?.()) {
            return true;
        }
        const ua = navigator.userAgent || '';
        return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    }
    return false;
};
