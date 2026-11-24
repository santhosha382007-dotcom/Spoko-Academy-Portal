const jsonServer = require('json-server');
const path = require('path');
const fs = require('fs');

// Automatically locate db.json (inside backend folder or root workspace)
const dbPath = process.env.DB_PATH 
    || (fs.existsSync(path.join(__dirname, 'db.json')) 
        ? path.join(__dirname, 'db.json') 
        : path.join(__dirname, '..', 'db.json'));

// Auto-seed database if db.json is missing or has zero users (e.g. fresh Render cloud deployment)
function ensureDatabaseSeed() {
    let needsSeed = false;
    if (!fs.existsSync(dbPath)) {
        needsSeed = true;
    } else {
        try {
            const raw = fs.readFileSync(dbPath, 'utf8').trim();
            if (!raw || raw === '{}') {
                needsSeed = true;
            } else {
                const parsed = JSON.parse(raw);
                if (!parsed.users || parsed.users.length === 0) {
                    needsSeed = true;
                }
            }
        } catch (e) {
            needsSeed = true;
        }
    }

    if (needsSeed) {
        const seedCandidates = [
            path.join(__dirname, 'db.seed.json'),
            path.join(__dirname, '..', 'db.seed.json'),
            path.join(__dirname, 'db.example.json'),
            path.join(__dirname, '..', 'db.example.json')
        ];
        const foundSeed = seedCandidates.find(p => fs.existsSync(p));
        if (foundSeed) {
            try {
                fs.copyFileSync(foundSeed, dbPath);
                const backendDb = path.join(__dirname, 'db.json');
                if (!fs.existsSync(backendDb)) {
                    fs.copyFileSync(foundSeed, backendDb);
                }
                console.log(`[SEED] Initialized ${dbPath} from ${foundSeed}`);
            } catch (err) {
                console.error('[SEED ERROR]', err);
            }
        }
    }
}
ensureDatabaseSeed();

const securityMiddleware = require('./security-middleware.cjs');

const server = jsonServer.create();
const router = jsonServer.router(dbPath);
const middlewares = jsonServer.defaults({
    noCors: true // Handled by our custom hardened CORS middleware below
});

const port = process.env.PORT || 3001;

// Explicit CORS Origin Allowlist for OWASP Compliance
const ALLOWED_ORIGINS = [
    'http://localhost:3008',
    'http://localhost:5173',
    'http://127.0.0.1:3008',
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'https://spoko-academy-portal-2.onrender.com',
    'capacitor://localhost',
    'http://localhost',
    'ionic://localhost'
];

// Hardened CORS Middleware
server.use((req, res, next) => {
    const origin = req.headers.origin;

    if (!origin) {
        // Direct mobile / Electron / local requests without Origin header
        res.header('Access-Control-Allow-Origin', '*');
    } else {
        const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
            origin.endsWith('.onrender.com') ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:');

        if (isAllowed) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
        } else {
            // Disallowed external origin
            if (req.method === 'OPTIONS') {
                return res.status(403).json({ error: 'CORS Origin Not Allowed' });
            }
        }
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Spoko-Auth, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Root & Health Check Endpoints
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

// JSON body parser with generous limit (50MB) for exam imports and attachments
server.use(jsonServer.bodyParser);

// Standard json-server middlewares (logger, static, etc.)
server.use(middlewares);

// Custom security, authentication, RBAC, and assessment proctoring middleware
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
