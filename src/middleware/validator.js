import { ApiError } from './errorHandler.js';
import { config } from '../config/index.js';

export function validateSearchQuery(req, res, next) {
    const { q, query } = req.query;
    const searchQuery = q || query;

    if (!searchQuery || typeof searchQuery !== 'string') {
        return next(new ApiError('Missing required parameter: q (search query)', 400));
    }

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 1) {
        return next(new ApiError('Search query cannot be empty', 400));
    }

    if (trimmedQuery.length > 500) {
        return next(new ApiError('Search query too long (max 500 characters)', 400));
    }

    req.searchQuery = trimmedQuery;

    next();
}

export function validateEngine(req, res, next) {
    const { engine } = req.query;

    if (engine) {
        const normalizedEngine = engine.toLowerCase();
        if (!config.engines.available.includes(normalizedEngine)) {
            return next(new ApiError(
                `Invalid engine: ${engine}. Available: ${config.engines.available.join(', ')}`,
                400
            ));
        }
        req.searchEngine = normalizedEngine;
    } else {
        req.searchEngine = config.engines.default;
    }

    next();
}

export function validatePagination(req, res, next) {
    const { page, limit } = req.query;

    if (page !== undefined) {
        const pageNum = parseInt(page, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > 100) {
            return next(new ApiError('Page must be a number between 1 and 100', 400));
        }
        req.pagination = { ...req.pagination, page: pageNum };
    } else {
        req.pagination = { ...req.pagination, page: 1 };
    }

    if (limit !== undefined) {
        const limitNum = parseInt(limit, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > config.engines.maxResults) {
            return next(new ApiError(`Limit must be a number between 1 and ${config.engines.maxResults}`, 400));
        }
        req.pagination = { ...req.pagination, limit: limitNum };
    } else {
        req.pagination = { ...req.pagination, limit: 10 };
    }

    next();
}

export function validateImageParams(req, res, next) {
    const { size, color } = req.query;

    if (size) {
        const validSizes = ['small', 'medium', 'large', 'xlarge', 'wallpaper'];
        if (!validSizes.includes(size.toLowerCase())) {
            return next(new ApiError(`Invalid size: ${size}. Valid: ${validSizes.join(', ')}`, 400));
        }
        req.imageParams = { ...req.imageParams, size: size.toLowerCase() };
    }

    if (color) {
        const validColors = ['any', 'black', 'white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray', 'brown', 'teal'];
        if (!validColors.includes(color.toLowerCase())) {
            return next(new ApiError(`Invalid color: ${color}. Valid: ${validColors.join(', ')}`, 400));
        }
        req.imageParams = { ...req.imageParams, color: color.toLowerCase() };
    }

    next();
}

export function validateNewsParams(req, res, next) {
    const { freshness } = req.query;

    if (freshness) {
        const validFreshness = ['day', 'week', 'month'];
        if (!validFreshness.includes(freshness.toLowerCase())) {
            return next(new ApiError(`Invalid freshness: ${freshness}. Valid: ${validFreshness.join(', ')}`, 400));
        }
        req.newsParams = { freshness: freshness.toLowerCase() };
    }

    next();
}

export const validateWebSearch = [
    validateSearchQuery,
    validateEngine,
    validatePagination
];

export const validateImageSearch = [
    validateSearchQuery,
    validateEngine,
    validatePagination,
    validateImageParams
];

export const validateNewsSearch = [
    validateSearchQuery,
    validateEngine,
    validatePagination,
    validateNewsParams
];

export const validateSuggestions = [
    validateSearchQuery,
    validateEngine
];

export default {
    validateSearchQuery,
    validateEngine,
    validatePagination,
    validateImageParams,
    validateNewsParams,
    validateWebSearch,
    validateImageSearch,
    validateNewsSearch,
    validateSuggestions
};
