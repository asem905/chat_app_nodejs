const validator = require('validator');

/**
 * Sanitization Middleware
 * Prevents XSS, NoSQL injection, and other injection attacks
 */

/**
 * Custom sanitization for text content
 * @param {string} text - Text to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} - Sanitized text
 */
function sanitizeText(text, options = {}) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    const {
        maxLength = null,
        trim = true,
        escapeHTML = true,
        removeScriptTags = true,
    } = options;

    let sanitized = text;

    // Trim whitespace
    if (trim) {
        sanitized = sanitized.trim();
    }

    if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    if (removeScriptTags) {
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
        sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove inline event handlers
    }

    if (escapeHTML) {
        sanitized = validator.escape(sanitized);
    }

    return sanitized;
}


function sanitizeMessageContent(req, res, next) {
    if (req.body.content) {
        req.body.content = sanitizeText(req.body.content, {
            maxLength: parseInt(process.env.MAX_MESSAGE_LENGTH) || 5000,
            trim: true,
            escapeHTML: true,
            removeScriptTags: true,
        });
    }
    next();
}


function sanitizeRoomData(req, res, next) {
    if (req.body.room_name) {
        req.body.room_name = sanitizeText(req.body.room_name, {
            maxLength: 100,
            trim: true,
            escapeHTML: true,
            removeScriptTags: true,
        });
    }

    if (req.body.room_description) {
        req.body.room_description = sanitizeText(req.body.room_description, {
            maxLength: 500,
            trim: true,
            escapeHTML: true,
            removeScriptTags: true,
        });
    }

    next();
}


function sanitizeUserData(req, res, next) {
    if (req.body.username) {
        req.body.username = sanitizeText(req.body.username, {
            maxLength: 30,
            trim: true,
            escapeHTML: false, // Username shouldn't contain HTML
            removeScriptTags: true,
        });
    }

    if (req.body.email) {
        req.body.email = validator.normalizeEmail(req.body.email) || req.body.email;
        req.body.email = req.body.email.trim().toLowerCase();
    }

    next();
}

function hasSQLInjectionPatterns(input) {
    if (!input || typeof input !== 'string') {
        return false;
    }

    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
        /(--|;|\/\*|\*\/)/,
        /('|")\s*(OR|AND)\s*('|"|\d+)/i,
        /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
}


function detectSQLInjection(req, res, next) {
    const checkObject = (obj, path = '') => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                if (hasSQLInjectionPatterns(obj[key])) {
                    console.log("obj[key]", obj[key]);
                    console.warn(`[Security] SQL injection pattern detected in ${path}${key}: ${obj[key]}`);
                    return true; // Return true to indicate violation found
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                if (checkObject(obj[key], `${path}${key}.`)) {
                    console.log("obj[key]", obj[key]);
                    return true; // Propagate violation up the chain
                }
            }
        }
        return false; // No violation found
    };

    // Check body
    if (req.body && checkObject(req.body, 'body.')) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid input detected. Please check your data.'
        });
    }

    // Check query parameters
    if (req.query && checkObject(req.query, 'query.')) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid input detected. Please check your data.'
        });
    }

    // Check route parameters
    if (req.params && checkObject(req.params, 'params.')) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid input detected. Please check your data.'
        });
    }

    next();
}

function sanitizeSocketData(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const sanitized = { ...data };

    if (sanitized.content) {
        sanitized.content = sanitizeText(sanitized.content, {
            maxLength: parseInt(process.env.MAX_MESSAGE_LENGTH) || 5000,
            trim: true,
            escapeHTML: true,
            removeScriptTags: true,
        });
    }

    if (sanitized.username) {
        sanitized.username = sanitizeText(sanitized.username, {
            maxLength: 30,
            trim: true,
            escapeHTML: false,
            removeScriptTags: true,
        });
    }

    return sanitized;
}

module.exports = {
    sanitizeMessageContent,
    sanitizeRoomData,
    sanitizeUserData,
    detectSQLInjection,
    sanitizeText,
    hasSQLInjectionPatterns,
    sanitizeSocketData,
};
