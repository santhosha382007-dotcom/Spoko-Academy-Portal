import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import utilities to test
import { hashPassword, verifyPassword, validatePasswordPolicy, generateTemporaryPassword } from '../src/utils/security.js';
import { parseQuestionsFromText } from '../src/utils/questionParser.js';

// Import backend JWT utility
const jwtUtils = await import('../backend/jwt-utils.cjs');

describe('1. Security Utilities Unit Tests', () => {
    test('Password hashing generates valid bcrypt hash', () => {
        const plain = 'StrongPass@2026';
        const hashed = hashPassword(plain);
        assert.ok(hashed.startsWith('$2a$') || hashed.startsWith('$2b$'));
        assert.notEqual(plain, hashed);
    });

    test('Password verification correctly validates matching password', () => {
        const plain = 'StudentSecret@123';
        const hashed = hashPassword(plain);
        assert.equal(verifyPassword(plain, hashed), true);
        assert.equal(verifyPassword('WrongPass', hashed), false);
    });

    test('Password verification supports case tolerance variations', () => {
        const plain = 'student@123';
        const hashed = hashPassword(plain);
        assert.equal(verifyPassword('Student@123', hashed), true);
    });

    test('Password policy enforces minimum length of 6 characters', () => {
        const short = validatePasswordPolicy('12345');
        assert.equal(short.valid, false);

        const valid = validatePasswordPolicy('123456');
        assert.equal(valid.valid, true);

        const empty = validatePasswordPolicy('');
        assert.equal(empty.valid, false);
    });

    test('Temporary password generator produces valid prefixed string', () => {
        const temp = generateTemporaryPassword();
        assert.ok(temp.startsWith('Spoko@'));
        assert.equal(temp.length, 10);
    });
});

describe('2. JWT Cryptographic Token Tests', () => {
    test('signToken generates RFC 7519 3-part base64url token', () => {
        const token = jwtUtils.signToken({ id: 'stu_100', role: 'student', name: 'John Doe' });
        assert.ok(typeof token === 'string');
        const parts = token.split('.');
        assert.equal(parts.length, 3, 'Token must contain header, payload, and signature');
    });

    test('verifyToken decodes valid token payload accurately', () => {
        const payload = { id: 'admin_1', role: 'admin', name: 'Admin Master' };
        const token = jwtUtils.signToken(payload);
        const decoded = jwtUtils.verifyToken(token);
        assert.ok(decoded);
        assert.equal(decoded.id, payload.id);
        assert.equal(decoded.role, payload.role);
        assert.equal(decoded.name, payload.name);
        assert.ok(decoded.exp > Math.floor(Date.now() / 1000));
    });

    test('verifyToken rejects tampered signature', () => {
        const token = jwtUtils.signToken({ id: 'stu_100', role: 'student' });
        const parts = token.split('.');
        // Tamper with payload (elevate role to admin)
        const tamperedPayload = Buffer.from(JSON.stringify({ id: 'stu_100', role: 'admin' })).toString('base64url');
        const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
        const result = jwtUtils.verifyToken(forgedToken);
        assert.equal(result, null, 'Tampered token must be rejected');
    });

    test('verifyToken rejects expired tokens', () => {
        // Sign token with -10 seconds lifetime
        const token = jwtUtils.signToken({ id: 'stu_100', role: 'student' }, -10);
        const result = jwtUtils.verifyToken(token);
        assert.equal(result, null, 'Expired token must be rejected');
    });

    test('sanitizeUser strips sensitive password fields', () => {
        const rawUser = {
            id: 'admin',
            name: 'Administrator',
            password: '$2a$10$hashedPasswordHere',
            role: 'admin',
            email: 'admin@spoko.edu'
        };
        const safe = jwtUtils.sanitizeUser(rawUser);
        assert.equal('password' in safe, false, 'Password must not be in sanitized user object');
        assert.equal(safe.id, 'admin');
        assert.equal(safe.role, 'admin');
    });
});

describe('3. Question Document Parser Tests', () => {
    test('Parses standard numbered questions with lettered options and answer key', () => {
        const sampleText = `
        1. What is the standard port for HTTP communication?
        A) 21
        B) 80
        C) 443
        D) 8080
        Ans: B

        2. Which protocol secures web traffic?
        A. FTP
        B. TELNET
        C. HTTPS
        D. SNMP
        Correct Option: C
        `;

        const parsed = parseQuestionsFromText(sampleText);
        assert.equal(parsed.length, 2);

        assert.equal(parsed[0].options.length, 4);
        assert.equal(parsed[0].correctAnswer, 1); // B is index 1
        assert.equal(parsed[0].hasAutoAnswer, true);

        assert.equal(parsed[1].options.length, 4);
        assert.equal(parsed[1].correctAnswer, 2); // C is index 2
        assert.equal(parsed[1].hasAutoAnswer, true);
    });

    test('Handles malformed input gracefully by returning empty array', () => {
        assert.deepEqual(parseQuestionsFromText(''), []);
        assert.deepEqual(parseQuestionsFromText(null), []);
    });
});

describe('4. Database & Repository Integrity', () => {
    test('.gitignore excludes live db.json database files', () => {
        const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
        assert.ok(gitignore.includes('db.json'), 'Root .gitignore must exclude db.json');
        assert.ok(gitignore.includes('backend/db.json'), 'Root .gitignore must exclude backend/db.json');

        const backendGitignore = fs.readFileSync(path.join(rootDir, 'backend', '.gitignore'), 'utf8');
        assert.ok(backendGitignore.includes('db.json'), 'backend/.gitignore must exclude db.json');
    });

    test('db.example.json exists as safe template without real student credentials', () => {
        const examplePath = path.join(rootDir, 'db.example.json');
        assert.ok(fs.existsSync(examplePath));
        const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
        assert.ok(Array.isArray(example.users));
        assert.equal(example.users.length, 1);
        assert.equal(example.users[0].id, 'admin');
    });
});
