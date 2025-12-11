import NodeCache from 'node-cache';
import { config } from '../config/index.js';

const cache = new NodeCache({
    stdTTL: config.cache.stdTTL,
    checkperiod: config.cache.checkperiod,
    maxKeys: config.cache.maxKeys,
    useClones: false
});
export function generateCacheKey(type, query, engine, options = {}) {
    const normalizedQuery = query.toLowerCase().trim();
    const optionsString = JSON.stringify(options);
    return `${type}:${engine}:${normalizedQuery}:${optionsString}`;
}
export function getFromCache(key) {
    const value = cache.get(key);
    if (value) {
        console.log(`📦 Cache HIT: ${key.substring(0, 50)}...`);
        return value;
    }
    console.log(`📭 Cache MISS: ${key.substring(0, 50)}...`);
    return null;
}
export function setInCache(key, value, ttl = config.cache.stdTTL) {
    cache.set(key, value, ttl);
    console.log(`💾 Cached: ${key.substring(0, 50)}... (TTL: ${ttl}s)`);
}
export function deleteFromCache(key) {
    cache.del(key);
}
export function clearCache() {
    cache.flushAll();
    console.log('🗑️ Cache cleared');
}
export function getCacheStats() {
    const stats = cache.getStats();
    return {
        hits: stats.hits,
        misses: stats.misses,
        keys: cache.keys().length,
        hitRate: stats.hits + stats.misses > 0
            ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
            : '0%'
    };
}
export default {
    generateCacheKey,
    getFromCache,
    setInCache,
    deleteFromCache,
    clearCache,
    getCacheStats
};