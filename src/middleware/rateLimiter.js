import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: config.rateLimit.message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        res.status(429).json({
            success: false,
            error: 'Too many requests',
            message: 'Please wait before making more requests',
            retryAfter: Math.ceil(options.windowMs / 1000)
        });
    },
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.connection.remoteAddress ||
            req.ip;
    }
});

export const suggestLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: {
        success: false,
        error: 'Too many suggestion requests'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.connection.remoteAddress ||
            req.ip;
    }
});

export const strictLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Rate limit exceeded for intensive operation'
    },
    standardHeaders: true,
    legacyHeaders: false
});

export default {
    apiLimiter,
    suggestLimiter,
    strictLimiter
};
