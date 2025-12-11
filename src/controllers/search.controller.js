import * as searchService from '../services/search.service.js';
import { getCacheStats, clearCache } from '../utils/cache.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const webSearch = asyncHandler(async (req, res) => {
    const query = req.searchQuery;
    const options = {
        engine: req.searchEngine,
        page: req.pagination.page,
        limit: req.pagination.limit
    };

    const results = await searchService.searchWeb(query, options);

    res.json(results);
});

export const imageSearch = asyncHandler(async (req, res) => {
    const query = req.searchQuery;
    const options = {
        engine: req.searchEngine,
        limit: req.pagination.limit,
        ...req.imageParams
    };

    const results = await searchService.searchImages(query, options);

    res.json(results);
});

export const newsSearch = asyncHandler(async (req, res) => {
    const query = req.searchQuery;
    const options = {
        engine: req.searchEngine,
        limit: req.pagination.limit,
        ...req.newsParams
    };

    const results = await searchService.searchNews(query, options);

    res.json(results);
});

export const suggestions = asyncHandler(async (req, res) => {
    const query = req.searchQuery;
    const options = {
        engine: req.searchEngine
    };

    const results = await searchService.getSuggestions(query, options);

    res.json(results);
});

export const multiEngineSearch = asyncHandler(async (req, res) => {
    const query = req.searchQuery;
    const options = {
        limit: req.pagination.limit
    };

    const results = await searchService.multiSearch(query, options);

    res.json(results);
});

export const getEngines = asyncHandler(async (req, res) => {
    const engines = searchService.getAvailableEngines();

    res.json({
        success: true,
        ...engines
    });
});

export const healthCheck = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        cache: getCacheStats(),
        version: '1.0.0'
    });
});

export const clearCacheEndpoint = asyncHandler(async (req, res) => {
    clearCache();

    res.json({
        success: true,
        message: 'Cache cleared successfully'
    });
});

export const apiInfo = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        name: 'MozDy Search API',
        version: '1.0.0',
        description: 'Firefox-inspired multi-engine search API',
        icon: '🦊',
        endpoints: {
            search: {
                web: 'GET /api/search?q=<query>',
                images: 'GET /api/search/images?q=<query>',
                news: 'GET /api/search/news?q=<query>',
                suggest: 'GET /api/search/suggest?q=<query>',
                multi: 'GET /api/search/multi?q=<query>'
            },
            utility: {
                engines: 'GET /api/engines',
                health: 'GET /api/health'
            }
        },
        parameters: {
            q: 'Search query (required)',
            engine: 'Search engine: duckduckgo, bing, google (default: duckduckgo)',
            page: 'Page number (default: 1)',
            limit: 'Results per page (default: 10, max: 50)',
            size: 'Image size: small, medium, large, wallpaper',
            color: 'Image color filter',
            freshness: 'News freshness: day, week, month'
        }
    });
});

export default {
    webSearch,
    imageSearch,
    newsSearch,
    suggestions,
    multiEngineSearch,
    getEngines,
    healthCheck,
    clearCacheEndpoint,
    apiInfo
};
