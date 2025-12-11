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

const GOOGLE_BASE_URL = 'https://www.google.com/search';
const GOOGLE_SUGGEST_URL = 'https://suggestqueries.google.com/complete/search';
function getHeaders() {
    return {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'Upgrade-Insecure-Requests': '1'
    };
}
export async function searchWeb(query, options = {}) {
    const { page = 1, limit = 10 } = options;
    const startTime = Date.now();
    const start = (page - 1) * 10;
    try {
        const response = await axios.get(GOOGLE_BASE_URL, {
            params: {
                q: query,
                start: start,
                num: Math.min(limit, 10), // limite de las paginas
                hl: options.lang || 'en',
                gl: options.country || 'us',
                safe: options.safe || 'off'
            },
            headers: getHeaders(),
            timeout: config.engines.timeout
        });

        const $ = cheerio.load(response.data);
        const results = [];
        let position = 0;
        let knowledgeGraph = null;
        const kgEl = $('.kp-wholepage, .knowledge-panel, [data-attrid="title"]');
        if (kgEl.length > 0) {
            const kgTitle = kgEl.find('[data-attrid="title"], .kno-ecr-pt').text().trim();
            const kgDesc = kgEl.find('[data-attrid="description"], .kno-rdesc span').first().text().trim();
            const kgImage = kgEl.find('img[src^="http"]').first().attr('src');
            const kgType = kgEl.find('[data-attrid="subtitle"], .kno-title-sub').text().trim();
            if (kgTitle) {
                knowledgeGraph = {
                    type: 'knowledge_panel',
                    title: kgTitle,
                    subtitle: kgType || null,
                    description: kgDesc || null,
                    image: kgImage || null,
                    source: 'Google Knowledge Graph',
                    attributes: []
                };
                kgEl.find('[data-attrid]:not([data-attrid="title"]):not([data-attrid="description"])').each((i, el) => {
                    const attrid = $(el).attr('data-attrid');
                    const value = $(el).text().trim();
                    if (attrid && value && !attrid.includes('action')) {
                        const label = attrid.split('/').pop().replace(/_/g, ' ');
                        knowledgeGraph.attributes.push({
                            label: label.charAt(0).toUpperCase() + label.slice(1),
                            value
                        });
                    }
                });
            }
        }
        let featuredSnippet = null;
        const fsEl = $('.xpdopen .LGOjhe, .IZ6rdc, [data-attrid="wa:/description"]');
        if (fsEl.length > 0) {
            const fsTitle = fsEl.find('.LC20lb, .DKV0Md').text().trim();
            const fsContent = fsEl.find('.LGOjhe, .hgKElc').text().trim();
            const fsUrl = fsEl.find('a[href^="http"]').attr('href');
            if (fsContent) {
                featuredSnippet = {
                    type: 'featured_snippet',
                    title: fsTitle || null,
                    content: fsContent,
                    url: fsUrl || null,
                    source: fsUrl ? extractDomain(fsUrl) : null
                };
            }
        }
        const resultSelectors = [
            'div.g',
            'div[data-sokoban-container]',
            'div.SoaBEf',
            'div.MjjYud'
        ];
        $(resultSelectors.join(',')).each((index, element) => {
            if (position >= limit) return false;
            const $el = $(element);
            if ($el.find('[data-text-ad]').length > 0) return;
            if ($el.closest('.kp-wholepage').length > 0) return;
            if ($el.parents(resultSelectors.join(',')).length > 0) return;
            const titleEl = $el.find('h3').first();
            const linkEl = $el.find('a[href^="http"]').first();
            const snippetEl = $el.find('[data-sncf], [data-content-feature], .VwiC3b, .st, .lEBKkf, .ITZIwc, .yXK7lf').first();
            const thumbnailEl = $el.find('img[src^="http"], g-img img').first();
            const dateEl = $el.find('.LEwnzc, .f, .MUxGbd:has(.wHYlTd), .OSrXXb').first();
            const siteLinks = [];
            $el.find('.usJj9c a, .HiHjCd a').each((i, link) => {
                const text = $(link).text().trim();
                const href = $(link).attr('href');
                if (text && href && href.startsWith('http')) {
                    siteLinks.push({ title: text, url: href });
                }
            });
            const title = titleEl.text().trim();
            const url = linkEl.attr('href');
            const rawSnippet = snippetEl.text().trim();
            const thumbnail = thumbnailEl.attr('src');
            const pubDate = dateEl.text().trim();
            let cleanSnippet = rawSnippet.replace(/^[A-Za-z]{3} \d+, \d{4} — /, '').trim();
            if (title && url && url.startsWith('http') && !url.includes('google.com/search')) {
                position++;
                const { date, cleanSnippet: snippetWithoutDate } = extractDate(cleanSnippet);
                cleanSnippet = snippetWithoutDate;
                const domain = extractDomain(url);
                let displayUrl;
                try {
                    const urlObj = new URL(url);
                    displayUrl = urlObj.hostname + urlObj.pathname;
                } catch {
                    displayUrl = url;
                }
                const result = {
                    position,
                    title,
                    url,
                    displayUrl: displayUrl.length > 60 ? displayUrl.substring(0, 60) + '...' : displayUrl,
                    snippet: cleanSnippet,
                    domain,
                    favicon: getFaviconUrl(url, 'google'),
                    faviconHD: getFaviconUrl(url, 'clearbit'),
                    siteName: getSiteName(url),
                    thumbnail: thumbnail || null,
                    breadcrumbs: extractBreadcrumbs(url),
                    contentType: detectContentType({ title, snippet: cleanSnippet, url }),
                    datePublished: date || pubDate || null,
                    siteLinks: siteLinks.length > 0 ? siteLinks.slice(0, 6) : null,
                    isSecure: url.startsWith('https'),
                    engine: 'google'
                };
                result.qualityScore = calculateQualityScore(result);
                results.push(result);
            }
        });
        const relatedSearches = [];
        $('a[href*="/search?q="]').each((index, element) => {
            const $el = $(element);
            const text = $el.text().trim();
            const href = $el.attr('href');
            if (text && href && !href.includes('&start=') && text.length > 2 && text.length < 100) {
                if (!relatedSearches.includes(text) && relatedSearches.length < 8) {
                    relatedSearches.push(text);
                }
            }
        });
        let estimatedTotal = null;
        const statsText = $('#result-stats').text();
        const match = statsText.match(/[\d,]+/);
        if (match) {
            estimatedTotal = parseInt(match[0].replace(/,/g, ''), 10);
        }
        const peopleAlsoAsk = [];
        $('.related-question-pair, .xpc [data-q]').each((i, el) => {
            const question = $(el).find('[role="button"], .CSkcDe').text().trim() ||
                $(el).attr('data-q');
            if (question && peopleAlsoAsk.length < 5) {
                peopleAlsoAsk.push({
                    question,
                    link: null
                });
            }
        });
        return {
            success: true,
            engine: 'google',
            query,
            totalResults: results.length,
            estimatedTotal,
            page,
            featuredSnippet,
            knowledgeGraph,
            results,
            relatedSearches,
            peopleAlsoAsk,
            searchMetadata: {
                engine: 'google',
                query,
                totalTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString(),
                estimatedTotalResults: estimatedTotal
            },
            executionTime: `${Date.now() - startTime}ms`
        };
    } catch (error) {
        console.error('Google search error:', error.message);
        throw new Error(`Google search failed: ${error.message}`);
    }
}
export async function searchImages(query, options = {}) {
    const { limit = 20, size, color } = options;
    const startTime = Date.now();
    try {
        const params = {
            q: query,
            tbm: 'isch',
            hl: 'en'
        };
        const filters = [];
        if (size) {
            const sizeMap = { small: 'isz:s', medium: 'isz:m', large: 'isz:l', xlarge: 'isz:lt,islt:4mp' };
            if (sizeMap[size]) filters.push(sizeMap[size]);
        }
        if (color && color !== 'any') {
            const colorMap = {
                black: 'black', white: 'white', red: 'red', orange: 'orange',
                yellow: 'yellow', green: 'green', blue: 'blue', purple: 'purple',
                pink: 'pink', gray: 'gray', brown: 'brown', teal: 'teal'
            };
            if (colorMap[color]) filters.push(`ic:specific,isc:${colorMap[color]}`);
        }
        if (filters.length > 0) {
            params.tbs = filters.join(',');
        }
        const response = await axios.get(GOOGLE_BASE_URL, {
            params,
            headers: getHeaders(),
            timeout: config.engines.timeout
        });
        const $ = cheerio.load(response.data);
        const results = [];
        const scripts = $('script').toArray();
        for (const script of scripts) {
            const content = $(script).html() || '';
            const imgPattern = /\["(https?:\/\/[^"]+\.(jpg|jpeg|png|gif|webp)[^"]*)",\s*(\d+),\s*(\d+)\]/gi;
            let match;
            while ((match = imgPattern.exec(content)) !== null && results.length < limit) {
                const imageUrl = match[1].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
                const width = parseInt(match[3], 10);
                const height = parseInt(match[4], 10);
                if (width > 100 && height > 100 && !imageUrl.includes('gstatic.com')) {
                    results.push({
                        position: results.length + 1,
                        title: '',
                        imageUrl,
                        thumbnailUrl: imageUrl,
                        sourceUrl: '',
                        width,
                        height,
                        source: '',
                        sourceDomain: '',
                        format: detectImageFormat(imageUrl),
                        aspectRatio: (width / height).toFixed(2),
                        engine: 'google'
                    });
                }
            }
        }
        return {
            success: true,
            engine: 'google',
            type: 'images',
            query,
            totalResults: results.length,
            results,
            searchMetadata: {
                engine: 'google',
                query,
                filters: { size, color },
                totalTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            },
            executionTime: `${Date.now() - startTime}ms`
        };
    } catch (error) {
        console.error('Google image search error:', error.message);
        throw new Error(`Google image search failed: ${error.message}`);
    }
}
export async function getSuggestions(query) {
    const startTime = Date.now();
    try {
        const response = await axios.get(GOOGLE_SUGGEST_URL, {
            params: {
                q: query,
                client: 'firefox',
                hl: 'en'
            },
            headers: {
                ...getHeaders(),
                'Accept': 'application/json'
            },
            timeout: 5000
        })
        const data = response.data;
        let suggestions = [];
        if (Array.isArray(data) && data.length >= 2 && Array.isArray(data[1])) {
            suggestions = data[1].slice(0, 10).map(text => ({
                text,
                highlighted: highlightMatch(text, query)
            }));
        }
        return {
            success: true,
            engine: 'google',
            query,
            suggestions: suggestions.map(s => s.text),
            suggestionsRich: suggestions,
            executionTime: `${Date.now() - startTime}ms`
        };
    } catch (error) {
        console.error('Google suggestions error:', error.message);
        throw new Error(`Google suggestions failed: ${error.message}`);
    }
}
export async function searchNews(query, options = {}) {
    const { limit = 20, freshness } = options;
    const startTime = Date.now();
    try {
        const params = {
            q: query,
            tbm: 'nws', // News search
            hl: 'en'
        };
        if (freshness) {
            const freshnessMap = { day: 'qdr:d', week: 'qdr:w', month: 'qdr:m' };
            if (freshnessMap[freshness]) {
                params.tbs = freshnessMap[freshness];
            }
        }
        const response = await axios.get(GOOGLE_BASE_URL, {
            params,
            headers: getHeaders(),
            timeout: config.engines.timeout
        });
        const $ = cheerio.load(response.data);
        const results = [];
        let position = 0;
        $('div.g, div[data-hveid], .SoaBEf').each((index, element) => {
            if (position >= limit) return false;
            const $el = $(element);
            const titleEl = $el.find('a[href^="http"] div[role="heading"], h3, .mCBkyc').first();
            const linkEl = $el.find('a[href^="http"]').first();
            const snippetEl = $el.find('.GI74Re, .st, .Y3v8qd').first();
            const sourceEl = $el.find('.NUnG9d span, .CEMjEf span, cite').first();
            const timeEl = $el.find('.LfVVr, .WG9SHc span, .OSrXXb').first();
            const imgEl = $el.find('img.YQ4gaf, img[src^="http"]').first();
            const title = titleEl.text().trim();
            const url = linkEl.attr('href');
            if (title && url && url.startsWith('http') && !url.includes('google.com')) {
                const sourceDomain = extractDomain(url);
                position++;
                results.push({
                    position,
                    title,
                    url,
                    snippet: snippetEl.text().trim(),
                    source: sourceEl.text().trim() || sourceDomain,
                    sourceDomain,
                    sourceFavicon: getFaviconUrl(url, 'google'),
                    sourceLogo: getFaviconUrl(url, 'clearbit'),
                    date: timeEl.text().trim(),
                    imageUrl: imgEl.attr('src') || '',
                    thumbnail: imgEl.attr('src') || '',
                    engine: 'google'
                });
            }
        });
        return {
            success: true,
            engine: 'google',
            type: 'news',
            query,
            totalResults: results.length,
            results,
            searchMetadata: {
                engine: 'google',
                query,
                freshness,
                totalTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            },
            executionTime: `${Date.now() - startTime}ms`
        };
    } catch (error) {
        console.error('Google news search error:', error.message);
        throw new Error(`Google news search failed: ${error.message}`);
    }
}
function detectImageFormat(url) {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'jpeg';
    if (lower.includes('.png')) return 'png';
    if (lower.includes('.gif')) return 'gif';
    if (lower.includes('.webp')) return 'webp';
    return 'unknown';
}
function highlightMatch(text, query) {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return { before: '', match: text, after: '' };
    return {
        before: text.substring(0, index),
        match: text.substring(index, index + query.length),
        after: text.substring(index + query.length)
    };
}
export default {
    searchWeb,
    searchImages,
    searchNews,
    getSuggestions
};
