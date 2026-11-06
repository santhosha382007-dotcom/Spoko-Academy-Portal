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

// CORS headers for all origins (Web browsers, Render Cloud, Android APK, Electron Windows PC)
server.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Spoko-Auth, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Root & Health Check Endpoints (For Render monitoring, pinging, and diagnostic verification)
server.get(['/', '/health'], (req, res) => {
    let dbStatus = 'connected';
    let usersCount = 0;
    try {
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        usersCount = Array.isArray(dbData.users) ? dbData.users.length : 0;
    } catch (e) {
        dbStatus = 'read_error: ' + e.message;
    }

    res.json({
        status: 'online',
        service: 'Spoko Academy Portal Cloud API',
        uptime: Math.floor(process.uptime()),
        database: {
            status: dbStatus,
            path: path.basename(dbPath),
            totalUsers: usersCount
        },
        timestamp: new Date().toISOString()
    });
});

// JSON body parser with generous limit (50MB) for exam imports, attachments, and base64 avatars
server.use(jsonServer.bodyParser);

// Standard json-server middlewares (logger, static, etc.)
server.use(middlewares);

// Custom security, assessment proctoring, and geo-fencing middleware
server.use(securityMiddleware);

// JSON-Server DB router
server.use(router);

// Graceful error handler
server.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

server.listen(port, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  SPOKO ACADEMY PORTAL BACKEND IS READY FOR PRODUCTION `);
    console.log(`=======================================================`);
    console.log(` • Port:         ${port}`);
    console.log(` • Host:         0.0.0.0`);
    console.log(` • Database:     ${dbPath}`);
    console.log(` • Health Check: http://0.0.0.0:${port}/health`);
    console.log(`=======================================================`);
});
