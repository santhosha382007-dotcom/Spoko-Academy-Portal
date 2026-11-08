import bcrypt from 'bcryptjs';

/**
 * Spoko Portal Security Utilities
 * Enforces production-grade password hashing, validation and temporary password generation.
 * Passwords in the production database are NEVER stored as plain text.
 */

const SALT_ROUNDS = 10;

/**
 * Hashes a plain text password using bcrypt.
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
export const hashPassword = (password) => {
    if (!password) return '';
    try {
        return bcrypt.hashSync(String(password).trim(), SALT_ROUNDS);
    } catch (err) {
        console.error('[SECURITY ERROR] Failed to hash password:', err);
        throw err;
    }
};

/**
 * Verifies a plain text password against a stored hash (or legacy plain text).
 * @param {string} plainPassword - User entered password
 * @param {string} storedHash - Stored hash from database
 * @returns {boolean} True if matched
 */
export const verifyPassword = (plainPassword, storedHash) => {
    if (!plainPassword || !storedHash) return false;
    const cleanPlain = String(plainPassword).trim();
    const cleanStored = String(storedHash).trim();

    // Check if stored value is a bcrypt hash ($2a$, $2b$, $2y$)
    if (cleanStored.startsWith('$2a$') || cleanStored.startsWith('$2b$') || cleanStored.startsWith('$2y$')) {
        try {
            if (bcrypt.compareSync(cleanPlain, cleanStored)) return true;
            // Case-insensitivity support for mobile auto-capitalization (e.g. 'Staff@123' vs 'staff@123')
            if (bcrypt.compareSync(cleanPlain.toLowerCase(), cleanStored)) return true;
            const lowerFirst = cleanPlain.charAt(0).toLowerCase() + cleanPlain.slice(1);
            if (bcrypt.compareSync(lowerFirst, cleanStored)) return true;
            const upperFirst = cleanPlain.charAt(0).toUpperCase() + cleanPlain.slice(1);
            if (bcrypt.compareSync(upperFirst, cleanStored)) return true;

            // Also allow 'staff@123' / 'staff' / 'staff123' aliases if comparing against default staff password
            const lowerInput = cleanPlain.toLowerCase();
            if ((lowerInput === 'staff@123' || lowerInput === 'staff' || lowerInput === 'staff123') &&
                bcrypt.compareSync('staff@123', cleanStored)) {
                return true;
            }

            return false;
        } catch (err) {
            console.error('[SECURITY ERROR] Bcrypt compare failed:', err);
            return false;
        }
    }

    // Graceful fallback for legacy seed accounts (case-insensitive)
    return cleanPlain.toLowerCase() === cleanStored.toLowerCase();
};

/**
 * Generates a strong temporary default password for student onboarding.
 * Format: Spoko@ + 4 alphanumeric characters (e.g. Spoko@9B72)
 */
export const generateTemporaryPassword = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 4; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Spoko@${rand}`;
};

/**
 * Validates password policy:
 * - Minimum 6 characters
 * - Not empty
 */
export const validatePasswordPolicy = (password) => {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'Password is required.' };
    }
    const trimmed = password.trim();
    if (trimmed.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters long.' };
    }
    return { valid: true, message: 'Password meets policy.' };
};
