export class ApiError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'ApiError';
    }
}

export function notFoundHandler(req, res, next) {
    const error = new ApiError(`Route not found: ${req.method} ${req.originalUrl}`, 404);
    next(error);
}

export function errorHandler(err, req, res, next) {
    console.error('❌ Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    let statusCode = err.statusCode || 500;

    if (err.name === 'ValidationError') {
        statusCode = 400;
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        statusCode = 503;
    }

    const errorResponse = {
        success: false,
        error: err.message || 'Internal Server Error',
        code: statusCode
    };

    if (process.env.NODE_ENV === 'development') {
        errorResponse.details = err.details || null;
        errorResponse.stack = err.stack;
    }

    if (statusCode === 429) {
        errorResponse.retryAfter = '60 seconds';
    }

    if (statusCode === 503) {
        errorResponse.message = 'Search service temporarily unavailable';
        errorResponse.suggestion = 'Please try again in a few moments';
    }

    res.status(statusCode).json(errorResponse);
}

export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export default {
    ApiError,
    notFoundHandler,
    errorHandler,
    asyncHandler
};
