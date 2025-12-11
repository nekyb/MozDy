import duckduckgoScraper from './scrapers/duckduckgo.scraper.js';
import bingScraper from './scrapers/bing.scraper.js';
import googleScraper from './scrapers/google.scraper.js';
import { generateCacheKey, getFromCache, setInCache } from '../utils/cache.js';
import { config } from '../config/index.js';

const scrapers = {
    duckduckgo: duckduckgoScraper,
    bing: bingScraper,
    google: googleScraper
};
function getScraper(engine) {
    const normalizedEngine = engine?.toLowerCase() || config.engines.default;
    if (!scrapers[normalizedEngine]) {
        throw new Error(`Unknown search engine: ${engine}. Available: ${config.engines.available.join(', ')}`);
    }
    return {
        scraper: scrapers[normalizedEngine],
        engine: normalizedEngine
    };
}
export async function searchWeb(query, options = {}) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Search query is required');
    }
    const engine = options.engine || config.engines.default;
    const { scraper, engine: normalizedEngine } = getScraper(engine);
    const cacheKey = generateCacheKey('web', query, normalizedEngine, {
        page: options.page,
        limit: options.limit
    });
    const cached = getFromCache(cacheKey);
    if (cached) {
        return { ...cached, cached: true };
    }
    const result = await scraper.searchWeb(query.trim(), options);
    setInCache(cacheKey, result);
    return { ...result, cached: false };
}

export async function searchImages(query, options = {}) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Search query is required');
    }
    const engine = options.engine || config.engines.default;
    const { scraper, engine: normalizedEngine } = getScraper(engine);
    const cacheKey = generateCacheKey('images', query, normalizedEngine, {
        limit: options.limit,
        size: options.size,
        color: options.color
    });
    const cached = getFromCache(cacheKey);
    if (cached) {
        return { ...cached, cached: true };
    }
    const result = await scraper.searchImages(query.trim(), options);
    setInCache(cacheKey, result);
    return { ...result, cached: false };
}
export async function searchNews(query, options = {}) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Search query is required');
    }

    const engine = options.engine || config.engines.default;
    const { scraper, engine: normalizedEngine } = getScraper(engine);
    const cacheKey = generateCacheKey('news', query, normalizedEngine, {
        limit: options.limit,
        freshness: options.freshness
    });
    const cached = getFromCache(cacheKey);
    if (cached) {
        return { ...cached, cached: true };
    }
    const result = await scraper.searchNews(query.trim(), options);
    setInCache(cacheKey, result);
    return { ...result, cached: false };
}
export async function getSuggestions(query, options = {}) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Search query is required');
    }
    const engine = options.engine || config.engines.default;
    const { scraper, engine: normalizedEngine } = getScraper(engine);
    const cacheKey = generateCacheKey('suggest', query, normalizedEngine, {});
    const cached = getFromCache(cacheKey);
    if (cached) {
        return { ...cached, cached: true };
    }
    const result = await scraper.getSuggestions(query.trim());
    setInCache(cacheKey, result, 60);
    return { ...result, cached: false };
}

export async function multiSearch(query, options = {}) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Search query is required');
    }
    const engines = options.engines || config.engines.available;
    const startTime = Date.now();
    const promises = engines.map(async (engine) => {
        try {
            const result = await searchWeb(query, { ...options, engine });
            return { engine, success: true, data: result };
        } catch (error) {
            return { engine, success: false, error: error.message };
        }
    });
    const results = await Promise.all(promises);
    const allResults = [];
    const seenUrls = new Set();
    const engineResults = {};
    for (const result of results) {
        engineResults[result.engine] = result.success
            ? { count: result.data.results.length, success: true }
            : { error: result.error, success: false };
        if (result.success && result.data.results) {
            for (const item of result.data.results) {
                const normalizedUrl = item.url.toLowerCase().replace(/\/$/, '');
                if (!seenUrls.has(normalizedUrl)) {
                    seenUrls.add(normalizedUrl);
                    allResults.push(item);
                }
            }
        }
    }
    return {
        success: true,
        type: 'multi-engine',
        query,
        engines: engineResults,
        totalResults: allResults.length,
        results: allResults.slice(0, options.limit || 30),
        executionTime: `${Date.now() - startTime}ms`
    };
}
export function getAvailableEngines() {
    return {
        available: config.engines.available,
        default: config.engines.default
    };
}
export default {
    searchWeb,
    searchImages,
    searchNews,
    getSuggestions,
    multiSearch,
    getAvailableEngines
};