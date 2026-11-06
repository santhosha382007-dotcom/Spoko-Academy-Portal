const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow;
let server;

// Standalone embedded SPA static server for Electron
function startLocalServer(callback) {
    const distPath = path.join(__dirname, '..', 'dist');
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.otf': 'font/otf',
        '.map': 'application/json'
    };

    server = http.createServer((req, res) => {
        let reqUrl = req.url.split('?')[0];
        let filePath = path.join(distPath, reqUrl);

        if (!filePath.startsWith(distPath)) {
            res.writeHead(403);
            return res.end('Access denied');
        }

        fs.stat(filePath, (err, stats) => {
            if (!err && stats.isFile()) {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = mimeTypes[ext] || 'application/octet-stream';
                try {
                    const data = fs.readFileSync(filePath);
                    res.writeHead(200, { 
                        'Content-Type': contentType,
                        'Content-Length': data.length,
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(data);
                } catch (readErr) {
                    res.writeHead(500);
                    res.end('Error reading asset');
                }
            } else {
                // If it was a missing asset (starts with /assets/), return 404 rather than HTML
                if (reqUrl.startsWith('/assets/')) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    return res.end('Asset not found');
                }

                // SPA Fallback for React Router DOM client-side routes
                const indexPath = path.join(distPath, 'index.html');
                try {
                    const html = fs.readFileSync(indexPath, 'utf8');
                    res.writeHead(200, { 
                        'Content-Type': 'text/html; charset=utf-8',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(html);
                } catch (htmlErr) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Fatal: index.html not found');
                }
            }
        });
    });

    server.on('error', (err) => {
        console.error('[ELECTRON LOCAL SERVER ERROR]', err);
    });

    server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        callback(port);
    });
}

function createWindow(port) {
    const possibleIcons = [
        path.join(__dirname, '..', 'Spoko Logo.png'),
        path.join(__dirname, '..', 'src', 'assets', 'logo.png')
    ];
    const iconPath = possibleIcons.find(p => fs.existsSync(p));

    mainWindow = new BrowserWindow({
        width: 1366,
        height: 860,
        minWidth: 1024,
        minHeight: 680,
        title: 'Spoko Academy Portal',
        icon: iconPath,
        backgroundColor: '#f8fafc',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: false,
            webSecurity: true
        }
    });

    mainWindow.setMenuBarVisibility(false);

    // Optional F12 to inspect if needed
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' && input.type === 'keyDown') {
            mainWindow.webContents.toggleDevTools();
        }
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`[WINDOW LOAD ERROR] code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
    });

    mainWindow.loadURL(`http://127.0.0.1:${port}`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    startLocalServer((port) => {
        createWindow(port);
    });
});

app.on('window-all-closed', () => {
    if (server) {
        try { server.close(); } catch (e) {}
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
