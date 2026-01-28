const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
require('dotenv').config();

/**
 * Rate Limiting Middleware
 * Prevents abuse and brute force attacks
 */

// Global API rate limiter - applies to all requests
const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Max 100 requests per window
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});

// Authentication rate limiter - stricter for login/register
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // Max 5 attempts per window
    message: {
        status: 'error',
        message: 'Too many authentication attempts from this IP, please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

// Message creation rate limiter - per user
const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: parseInt(process.env.MESSAGE_RATE_LIMIT_MAX) || 20, // Max 20 messages per minute
    message: {
        status: 'error',
        message: "You're sending messages too quickly. Please slow down."
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use user ID for rate limiting (instead of IP)
    keyGenerator: (req) => {
        return req.currentUser?.id?.toString() || 'unknown';
    },
    skipSuccessfulRequests: false,
});

// Room operations rate limiter - per user
const roomOperationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Max 10 room operations per 5 minutes
    message: {
        status: 'error',
        message: 'Too many room operations. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.currentUser?.id?.toString() || 'unknown';
    },
});

// Speed limiter - slows down requests instead of blocking
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per window at full speed
    delayMs: () => 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    validate: { delayMs: false }, // Disable delayMs warning
});

/**
 * Socket.IO rate limiter
 * Tracks events per connection
 */
class SocketRateLimiter {
    constructor() {
        this.connections = new Map(); // Map of socketId -> { count, resetTime }
        this.windowMs = 60 * 1000; // 1 minute
        this.maxEvents = parseInt(process.env.SOCKET_RATE_LIMIT_MAX) || 60;

        // Cleanup old entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Check if socket has exceeded rate limit
     * @param {string} socketId - Socket ID
     * @returns {boolean} - True if within limit, false if exceeded
     */
    checkLimit(socketId) {
        const now = Date.now();
        const connection = this.connections.get(socketId);

        if (!connection || now > connection.resetTime) {
            // New connection or window expired - reset
            this.connections.set(socketId, {
                count: 1,
                resetTime: now + this.windowMs
            });
            return true;
        }

        if (connection.count >= this.maxEvents) {
            // Rate limit exceeded
            console.warn(`[Rate Limit] Socket ${socketId} exceeded rate limit (${this.maxEvents} events/${this.windowMs}ms)`);
            return false;
        }

        // Increment count
        connection.count++;
        return true;
    }

    /**
     * Remove rate limit tracking for a socket (on disconnect)
     * @param {string} socketId - Socket ID
     */
    removeSocket(socketId) {
        this.connections.delete(socketId);
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [socketId, connection] of this.connections.entries()) {
            if (now > connection.resetTime) {
                this.connections.delete(socketId);
            }
        }
        console.log(`[Rate Limiter] Cleaned up socket rate limits. Active connections: ${this.connections.size}`);
    }

    /**
     * Get remaining requests for a socket
     * @param {string} socketId 
     * @returns {number} - Remaining requests in current window
     */
    getRemaining(socketId) {
        const connection = this.connections.get(socketId);
        if (!connection || Date.now() > connection.resetTime) {
            return this.maxEvents;
        }
        return Math.max(0, this.maxEvents - connection.count);
    }
}

// Create singleton instance for Socket.IO rate limiting
const socketRateLimiter = new SocketRateLimiter();

module.exports = {
    globalLimiter,
    authLimiter,
    messageLimiter,
    roomOperationLimiter,
    speedLimiter,
    socketRateLimiter,
};
