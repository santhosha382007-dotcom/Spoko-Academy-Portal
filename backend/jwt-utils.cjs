const crypto = require('crypto');

// Secret key for HMAC-SHA256 signatures, loaded from environment or persistent server seed
const JWT_SECRET = process.env.JWT_SECRET || 'spoko_prod_secure_secret_key_2026_jwt_token_auth_99';
const TOKEN_EXPIRY_SECONDS = 8 * 60 * 60; // 8-hour session lifetime

function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    return Buffer.from(str, 'base64').toString('utf8');
}

function signToken(payload, expiresIn = TOKEN_EXPIRY_SECONDS) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + expiresIn
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;

    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;

    try {
        const expectedSignature = crypto
            .createHmac('sha256', JWT_SECRET)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        const sigA = Buffer.from(signature);
        const sigB = Buffer.from(expectedSignature);

        if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
            return null;
        }

        const payload = JSON.parse(base64UrlDecode(encodedPayload));
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < now) {
            return null; // Expired token
        }

        return payload;
    } catch (err) {
        return null;
    }
}

function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
}

module.exports = {
    signToken,
    verifyToken,
    sanitizeUser,
    JWT_SECRET
};
