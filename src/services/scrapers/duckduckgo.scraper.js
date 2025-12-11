import axios from 'axios';
import * as cheerio from 'cheerio';
import { getRandomUserAgent } from '../../utils/userAgents.js';
import { config } from '../../config/index.js';
import {
    extractDomain,
    getFaviconUrl,
    getSiteName,
    extractBreadcrumbs,
    detectContentType,
    extractDate,
    calculateQualityScore
} from '../../utils/enrichment.js';

const DDG_BASE_URL = 'https://html.duckduckgo.com/html/';
const DDG_SUGGEST_URL = 'https://duckduckgo.com/ac/';
const DDG_IMAGE_URL = 'https://duckduckgo.com/';
const DDG_INSTANT_URL = 'https://api.duckduckgo.com/';

function getHeaders() {
    return {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    };
}

async function getInstantAnswer(query) {
    try {
        const response = await axios.get(DDG_INSTANT_URL, {
            params: {
                q: query,
                format: 'json',
                no_redirect: 1,
                skip_disambig: 1
            },
            headers: getHeaders(),
            timeout: 5000
        });

        const data = response.data;

        if (data.Abstract || data.Answer) {
            return {
                type: data.Type || 'answer',
                title: data.Heading || null,
                description: data.Abstract || data.Answer || null,
                source: data.AbstractSource || 'DuckDuckGo',
                sourceUrl: data.AbstractURL || null,
                image: data.Image ? `https://duckduckgo.com${data.Image}` : null,
                infobox: data.Infobox ? {
                    content: data.Infobox.content || [],
                    meta: data.Infobox.meta || []
                } : null,
                relatedTopics: (data.RelatedTopics || []).slice(0, 5).map(topic => ({
                    text: topic.Text,
                    url: topic.FirstURL
                })).filter(t => t.text)
            };
        }

        return null;
    } catch (error) {
        console.log('Instant answer not available:', error.message);
        return null;
    }
}

export async function searchWeb(query, options = {}) {
    const { page = 1, limit = 10 } = options;
    const startTime = Date.now();

    try {
        const instantAnswerPromise = getInstantAnswer(query);

        const formData = new URLSearchParams();
        formData.append('q', query);
        formData.append('b', '');
        formData.append('kl', options.region || 'wt-wt');

        const response = await axios.post(DDG_BASE_URL, formData, {
            headers: {
                ...getHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: config.engines.timeout
        });

        const $ = cheerio.load(response.data);
        const results = [];
        let position = 0;

        $('.result.results_links').each((index, element) => {
            if (position >= limit) return false;

            const $el = $(element);
            const titleEl = $el.find('.result__a');
            const snippetEl = $el.find('.result__snippet');
            const urlEl = $el.find('.result__url');
            const iconEl = $el.find('.result__icon img');

            const title = titleEl.text().trim();
            const url = titleEl.attr('href');
            const rawSnippet = snippetEl.text().trim();
            const displayUrl = urlEl.text().trim();
            const iconSrc = iconEl.attr('src');

            if (title && url) {
                let cleanUrl = url;
                if (url.includes('uddg=')) {
                    try {
                        const urlParams = new URLSearchParams(url.split('?')[1]);
                        cleanUrl = decodeURIComponent(urlParams.get('uddg') || url);
                    } catch (e) {
                        cleanUrl = url;
                    }
                }

                position++;

                const { date, cleanSnippet } = extractDate(rawSnippet);
                const domain = extractDomain(cleanUrl);

                const result = {
                    position,
                    title,
                    url: cleanUrl,
                    displayUrl,
                    snippet: cleanSnippet,

                    domain,
                    favicon: getFaviconUrl(cleanUrl, 'google'),
                    faviconHD: getFaviconUrl(cleanUrl, 'clearbit'),
                    siteName: getSiteName(cleanUrl),
                    siteIcon: iconSrc ? (iconSrc.startsWith('//') ? `https:${iconSrc}` : iconSrc) : null,

                    breadcrumbs: extractBreadcrumbs(cleanUrl),
                    contentType: detectContentType({ title, snippet: cleanSnippet, url: cleanUrl }),
                    datePublished: date,

                    isSecure: cleanUrl.startsWith('https'),

                    engine: 'duckduckgo'
                };

                result.qualityScore = calculateQualityScore(result);

                results.push(result);
            }
        });

        const relatedSearches = [];
        $('.result--related .link-text, .result__a[href*="?q="]').each((index, element) => {
            const text = $(element).text().trim();
            if (text && !relatedSearches.includes(text) && text !== query) {
                relatedSearches.push(text);
            }
        });

        const instantAnswer = await instantAnswerPromise;

        const searchResponse = {
            success: true,
            engine: 'duckduckgo',
            query,
            totalResults: results.length,
            page,

            knowledgeGraph: instantAnswer,

            results,

            relatedSearches: relatedSearches.slice(0, 8),

            peopleAlsoAsk: relatedSearches.slice(0, 4).map(q => ({
                question: q.endsWith('?') ? q : `${q}?`,
                link: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
            })),

            searchMetadata: {
                engine: 'duckduckgo',
                query,
                totalTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            },

            executionTime: `${Date.now() - startTime}ms`
        };

        return searchResponse;

    } catch (error) {
        console.error('DuckDuckGo search error:', error.message);
        throw new Error(`DuckDuckGo search failed: ${error.message}`);
    }
}

export async function searchImages(query, options = {}) {
    const { limit = 20, size, color } = options;
    const startTime = Date.now();

    try {
        const tokenResponse = await axios.get(`${DDG_IMAGE_URL}?q=${encodeURIComponent(query)}`, {
            headers: getHeaders(),
            timeout: config.engines.timeout
        });

        const vqdMatch = tokenResponse.data.match(/vqd=['"]([^'"]+)['"]/);
        if (!vqdMatch) {
            throw new Error('Could not obtain search token');
        }

        const vqd = vqdMatch[1];

        const params = new URLSearchParams({
            q: query,
            vqd,
            o: 'json',
            p: '1',
            s: '0',
            f: buildImageFilters(size, color)
        });

        const imageResponse = await axios.get(
            `${DDG_IMAGE_URL}i.js?${params.toString()}`,
            {
                headers: {
                    ...getHeaders(),
                    'Referer': DDG_IMAGE_URL
                },
                timeout: config.engines.timeout
            }
        );

        const imageData = imageResponse.data;
        const results = [];

        if (imageData.results) {
            imageData.results.slice(0, limit).forEach((img, index) => {
                const sourceDomain = extractDomain(img.url || '');

                results.push({
                    position: index + 1,
                    title: img.title || '',
                    imageUrl: img.image || '',
                    thumbnailUrl: img.thumbnail || '',
                    sourceUrl: img.url || '',
                    width: img.width || 0,
                    height: img.height || 0,

                    source: img.source || sourceDomain,
                    sourceDomain,
                    sourceFavicon: getFaviconUrl(img.url || '', 'google'),

                    format: detectImageFormat(img.image),
                    aspectRatio: img.width && img.height
                        ? (img.width / img.height).toFixed(2)
                        : null,

                    engine: 'duckduckgo'
                });
            });
        }

        return {
            success: true,
            engine: 'duckduckgo',
            type: 'images',
            query,
            totalResults: results.length,
            results,
            searchMetadata: {
                engine: 'duckduckgo',
                query,
                filters: { size, color },
                totalTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            },
            executionTime: `${Date.now() - startTime}ms`
        };

    } catch (error) {
        console.error('DuckDuckGo image search error:', error.message);
        throw new Error(`DuckDuckGo image search failed: ${error.message}`);
    }
}

export async function getSuggestions(query) {
    const startTime = Date.now();

    try {
        const response = await axios.get(DDG_SUGGEST_URL, {
            params: { q: query, type: 'list' },
            headers: getHeaders(),
            timeout: 5000
        });

        const suggestions = response.data
            .filter(item => item.phrase)
            .map(item => ({
                text: item.phrase,
                highlighted: highlightMatch(item.phrase, query)
            }))
            .slice(0, 10);

        return {
            success: true,
            engine: 'duckduckgo',
            query,
            suggestions: suggestions.map(s => s.text),
            suggestionsRich: suggestions,
            executionTime: `${Date.now() - startTime}ms`
        };

    } catch (error) {
        console.error('DuckDuckGo suggestions error:', error.message);
        throw new Error(`DuckDuckGo suggestions failed: ${error.message}`);
    }
}

export async function searchNews(query, options = {}) {
    const { limit = 20, freshness } = options;
    const startTime = Date.now();

    try {
        const tokenResponse = await axios.get(
            `${DDG_IMAGE_URL}?q=${encodeURIComponent(query)}&iar=news`,
            {
                headers: getHeaders(),
                timeout: config.engines.timeout
            }
        );

        const vqdMatch = tokenResponse.data.match(/vqd=['"]([^'"]+)['"]/);
        if (!vqdMatch) {
            throw new Error('Could not obtain search token');
        }

        const vqd = vqdMatch[1];

        const params = new URLSearchParams({
            q: query,
            vqd,
            o: 'json',
            noamp: '1',
            df: freshness || ''
        });

        const newsResponse = await axios.get(
            `${DDG_IMAGE_URL}news.js?${params.toString()}`,
            {
                headers: {
                    ...getHeaders(),
                    'Referer': DDG_IMAGE_URL
                },
                timeout: config.engines.timeout
            }
        );

        const newsData = newsResponse.data;
        const results = [];

        if (newsData.results) {
            newsData.results.slice(0, limit).forEach((article, index) => {
                const sourceDomain = extractDomain(article.url || '');

                results.push({
                    position: index + 1,
                    title: article.title || '',
                    url: article.url || '',
                    snippet: article.excerpt || '',

                    source: article.source || sourceDomain,
                    sourceDomain,
                    sourceFavicon: getFaviconUrl(article.url || '', 'google'),
                    sourceLogo: getFaviconUrl(article.url || '', 'clearbit'),

                    date: article.date || '',
                    relativeDate: article.relative_time || formatRelativeDate(article.date),

                    imageUrl: article.image || '',
                    thumbnail: article.image || '',

                    engine: 'duckduckgo'
                });
            });
        }

        return {
            success: true,
            engine: 'duckduckgo',
            type: 'news',
            query,
            totalResults: results.length,
            results,
            searchMetadata: {
                engine: 'duckduckgo',
                query,
                freshness,
                totalTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            },
            executionTime: `${Date.now() - startTime}ms`
        };

    } catch (error) {
        console.error('DuckDuckGo news search error:', error.message);
        throw new Error(`DuckDuckGo news search failed: ${error.message}`);
    }
}

function buildImageFilters(size, color) {
    const filters = [];

    if (size) {
        const sizeMap = { small: 'Small', medium: 'Medium', large: 'Large', wallpaper: 'Wallpaper' };
        if (sizeMap[size]) filters.push(`size:${sizeMap[size]}`);
    }

    if (color) {
        filters.push(`color:${color}`);
    }

    return filters.join(',');
}

function detectImageFormat(url) {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'jpeg';
    if (lower.includes('.png')) return 'png';
    if (lower.includes('.gif')) return 'gif';
    if (lower.includes('.webp')) return 'webp';
    if (lower.includes('.svg')) return 'svg';
    return 'unknown';
}

function highlightMatch(text, query) {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    return {
        before: text.substring(0, index),
        match: text.substring(index, index + query.length),
        after: text.substring(index + query.length)
    };
}

function formatRelativeDate(dateStr) {
    if (!dateStr) return null;

    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    } catch {
        return null;
    }
}

export default {
    searchWeb,
    searchImages,
    searchNews,
    getSuggestions
};
