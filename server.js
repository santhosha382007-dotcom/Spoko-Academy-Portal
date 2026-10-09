const jsonServer = require('json-server');
const path = require('path');
const fs = require('fs');
const securityMiddleware = require('./security-middleware.cjs');

const server = jsonServer.create();

// Automatically locate db.json (inside backend folder or root workspace)
const dbPath = process.env.DB_PATH 
    || (fs.existsSync(path.join(__dirname, 'db.json')) 
        ? path.join(__dirname, 'db.json') 
        : path.join(__dirname, '..', 'db.json'));

const router = jsonServer.router(dbPath);
const middlewares = jsonServer.defaults({
    noCors: false
});

const port = process.env.PORT || 3001;

// CORS headers for all domains (Web browsers, Cloud hosting, Mobile APK, Capacitor)
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Spoko-Auth, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Root & Health Check Endpoints (For Render service monitoring and diagnostics)
server.get(['/', '/health'], (req, res) => {
    res.json({
        status: 'online',
        service: 'Spoko Academy Portal Cloud API',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Attach standard json-server middlewares (logger, static, etc.)
server.use(middlewares);

// Attach security and custom logic middleware
server.use(securityMiddleware);

// Attach json-server database router
server.use(router);

server.listen(port, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(` Spoko Academy Backend Server is LIVE!`);
    console.log(` Port: ${port}`);
    console.log(` Host: 0.0.0.0`);
    console.log(` Database: ${dbPath}`);
    console.log(` Health Check: http://0.0.0.0:${port}/health`);
    console.log(`===============================================`);
});
