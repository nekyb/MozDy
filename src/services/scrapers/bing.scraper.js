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

const BING_BASE_URL = 'https://www.bing.com/search';
const BING_IMAGE_URL = 'https://www.bing.com/images/search';
const BING_NEWS_URL = 'https://www.bing.com/news/search';
const BING_SUGGEST_URL = 'https://www.bing.com/AS/Suggestions';

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

export async function searchWeb(query, options = {}) {
    const { page = 1, limit = 10 } = options;
    const startTime = Date.now();
    const first = (page - 1) * 10 + 1;

    try {
        const response = await axios.get(BING_BASE_URL, {
            params: {
                q: query,
                first: first,
                count: limit,
                setmkt: options.market || 'en-US',
                setlang: options.lang || 'en'
            },
            headers: getHeaders(),
            timeout: config.engines.timeout
        });

        const $ = cheerio.load(response.data);
        const results = [];
        let position = 0;

        let knowledgeGraph = null;
        const sidebarEl = $('.b_entityTP, .lite-entcard-main');
        if (sidebarEl.length > 0) {
            const kgTitle = sidebarEl.find('.b_entityTitle, .enttitle').text().trim();
            const kgDesc = sidebarEl.find('.b_paractl, .lite-entcard-text').text().trim();
            const kgImage = sidebarEl.find('img').first().attr('src');

            if (kgTitle) {
                knowledgeGraph = {
                    type: 'knowledge_panel',
                    title: kgTitle,
                    description: kgDesc || null,
                    image: kgImage || null,
                    source: 'Bing',
                    attributes: []
                };

                sidebarEl.find('.b_vList li, .b_factrow').each((i, el) => {
                    const label = $(el).find('.b_hide, .l_ecrd_snptfltr span:first').text().trim();
                    const value = $(el).find('a, span:last').text().trim();
                    if (label && value && label !== value) {
                        knowledgeGraph.attributes.push({ label, value });
                    }
                });
            }
        }

        $('#b_results .b_algo').each((index, element) => {
            if (position >= limit) return false;

            const $el = $(element);
            const titleEl = $el.find('h2 a');
            const snippetEl = $el.find('.b_caption p, .b_algoSlug');
            const urlEl = $el.find('cite');
            const thumbnailEl = $el.find('.cico img, .rms_img');
            const dateEl = $el.find('.news_dt');

            const siteLinks = [];
            $el.find('.b_deep a, .b_vlist2col a').each((i, link) => {
                const text = $(link).text().trim();
                const href = $(link).attr('href');
                if (text && href) {
                    siteLinks.push({ title: text, url: href });
                }
            });

            const title = titleEl.text().trim();
            const url = titleEl.attr('href');
            const rawSnippet = snippetEl.text().trim();
            const displayUrl = urlEl.text().trim();
            const thumbnail = thumbnailEl.attr('src') || thumbnailEl.attr('data-src');
            const publishedDate = dateEl.text().trim();

            if (title && url) {
                position++;

                const { date, cleanSnippet } = extractDate(rawSnippet);
                const domain = extractDomain(url);

                const result = {
                    position,
                    title,
                    url,
                    displayUrl,
                    snippet: cleanSnippet,

                    domain,
                    favicon: getFaviconUrl(url, 'google'),
                    faviconHD: getFaviconUrl(url, 'clearbit'),
                    siteName: getSiteName(url),
                    thumbnail: thumbnail || null,

                    breadcrumbs: extractBreadcrumbs(url),
                    contentType: detectContentType({ title, snippet: cleanSnippet, url }),
                    datePublished: date || publishedDate || null,

                    siteLinks: siteLinks.length > 0 ? siteLinks.slice(0, 6) : null,

                    isSecure: url.startsWith('https'),

                    engine: 'bing'
                };

                result.qualityScore = calculateQualityScore(result);

                results.push(result);
            }
        });

        const relatedSearches = [];
        $('.b_rs a').each((index, element) => {
            const text = $(element).text().trim();
            if (text && !relatedSearches.includes(text)) {
                relatedSearches.push(text);
            }
        });

        let estimatedTotal = null;
        const statsText = $('.sb_count').text();
        const match = statsText.match(/[\d,]+/);
        if (match) {
            estimatedTotal = parseInt(match[0].replace(/,/g, ''), 10);
        }

        const peopleAlsoAsk = [];
        $('.df_qas .b_1linetrunc, .qna_header').each((i, el) => {
            const question = $(el).text().trim();
            if (question) {
                peopleAlsoAsk.push({
                    question,
                    link: null
                });
            }
        });

        return {
            success: true,
            engine: 'bing',
            query,
            totalResults: results.length,
            estimatedTotal,
            page,

            knowledgeGraph,

            results,

            relatedSearches: relatedSearches.slice(0, 8),

            peopleAlsoAsk: peopleAlsoAsk.slice(0, 5),

            searchMetadata: {
                engine: 'bing',
                query,
                totalTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString(),
                estimatedTotalResults: estimatedTotal
            },

            executionTime: `${Date.now() - startTime}ms`
        };

    } catch (error) {
        console.error('Bing search error:', error.message);
        throw new Error(`Bing search failed: ${error.message}`);
    }
}

export async function searchImages(query, options = {}) {
    const { limit = 20, size, color } = options;
    const startTime = Date.now();

    try {
        const filters = [];
        if (size) {
            const sizeMap = { small: 'Small', medium: 'Medium', large: 'Large', wallpaper: 'Wallpaper' };
            if (sizeMap[size]) filters.push(`filterui:imagesize-${size.toLowerCase()}`);
        }
        if (color && color !== 'any') {
            filters.push(`filterui:color2-${color}`);
        }

        const response = await axios.get(BING_IMAGE_URL, {
            params: {
                q: query,
                qft: filters.join('+'),
                form: 'HDRSC2'
            },
            headers: getHeaders(),
            timeout: config.engines.timeout
        });

        const $ = cheerio.load(response.data);
        const results = [];
        let position = 0;

        $('.iusc').each((index, element) => {
            if (position >= limit) return false;

            try {
                const $el = $(element);
                const dataM = $el.attr('m');

                if (dataM) {
                    const imgData = JSON.parse(dataM);
                    const sourceDomain = extractDomain(imgData.purl || '');

                    position++;
                    results.push({
                        position,
                        title: imgData.t || '',
                        imageUrl: imgData.murl || '',
                        thumbnailUrl: imgData.turl || '',
                        sourceUrl: imgData.purl || '',
                        width: imgData.mw || 0,
                        height: imgData.mh || 0,

                        source: sourceDomain,
                        sourceDomain,
                        sourceFavicon: getFaviconUrl(imgData.purl || '', 'google'),

                        format: detectImageFormat(imgData.murl),
                        fileSize: imgData.fs || null,
                        aspectRatio: imgData.mw && imgData.mh
                            ? (imgData.mw / imgData.mh).toFixed(2)
                            : null,

                        engine: 'bing'
                    });
                }
            } catch (e) {
            }
        });

        return {
            success: true,
            engine: 'bing',
            type: 'images',
            query,
            totalResults: results.length,
            results,
            searchMetadata: {
                engine: 'bing',
                query,
                filters: { size, color },
                totalTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            },
            executionTime: `${Date.now() - startTime}ms`
        };

    } catch (error) {
        console.error('Bing image search error:', error.message);
        throw new Error(`Bing image search failed: ${error.message}`);
    }
}

export async function getSuggestions(query) {
    const startTime = Date.now();

    try {
        const response = await axios.get(BING_SUGGEST_URL, {
            params: {
                qry: query,
                cvid: generateCvid(),
                pt: 'page.serp',
                mkt: 'en-US'
            },
            headers: {
                ...getHeaders(),
                'Accept': 'application/json'
            },
            timeout: 5000
        });

        const $ = cheerio.load(response.data);
        const suggestions = [];

        $('li').each((index, element) => {
            const text = $(element).text().trim();
            if (text && suggestions.length < 10) {
                suggestions.push({
                    text,
                    highlighted: highlightMatch(text, query)
                });
            }
        });

        return {
            success: true,
            engine: 'bing',
            query,
            suggestions: suggestions.map(s => s.text),
            suggestionsRich: suggestions,
            executionTime: `${Date.now() - startTime}ms`
        };

    } catch (error) {
        console.error('Bing suggestions error:', error.message);
        throw new Error(`Bing suggestions failed: ${error.message}`);
    }
}

export async function searchNews(query, options = {}) {
    const { limit = 20, freshness } = options;
    const startTime = Date.now();

    try {
        const params = { q: query };

        if (freshness) {
            const freshnessMap = { day: 'Day', week: 'Week', month: 'Month' };
            if (freshnessMap[freshness]) {
                params.qft = `sortbydate:1+interval:"${freshnessMap[freshness]}"`;
            }
        }

        const response = await axios.get(BING_NEWS_URL, {
            params,
            headers: getHeaders(),
            timeout: config.engines.timeout
        });

        const $ = cheerio.load(response.data);
        const results = [];
        let position = 0;

        $('.news-card, .newsitem').each((index, element) => {
            if (position >= limit) return false;

            const $el = $(element);
            const titleEl = $el.find('a.title, .title a');
            const snippetEl = $el.find('.snippet');
            const sourceEl = $el.find('.source a, .source span');
            const timeEl = $el.find('.source span[aria-label], time, .source span:last');
            const imgEl = $el.find('img');

            const title = titleEl.text().trim() || titleEl.attr('title') || '';
            const url = titleEl.attr('href');

            if (title && url) {
                const cleanUrl = url.startsWith('http') ? url : `https://www.bing.com${url}`;
                const sourceDomain = extractDomain(cleanUrl);

                position++;
                results.push({
                    position,
                    title,
                    url: cleanUrl,
                    snippet: snippetEl.text().trim(),

                    source: sourceEl.text().trim() || sourceDomain,
                    sourceDomain,
                    sourceFavicon: getFaviconUrl(cleanUrl, 'google'),
                    sourceLogo: getFaviconUrl(cleanUrl, 'clearbit'),

                    date: timeEl.attr('aria-label') || timeEl.text().trim(),

                    imageUrl: imgEl.attr('src') || imgEl.attr('data-src') || '',

                    engine: 'bing'
                });
            }
        });

        return {
            success: true,
            engine: 'bing',
            type: 'news',
            query,
            totalResults: results.length,
            results,
            searchMetadata: {
                engine: 'bing',
                query,
                freshness,
                totalTime: `${Date.now() - startTime}ms`,
                timestamp: new Date().toISOString()
            },
            executionTime: `${Date.now() - startTime}ms`
        };

    } catch (error) {
        console.error('Bing news search error:', error.message);
        throw new Error(`Bing news search failed: ${error.message}`);
    }
}

function generateCvid() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
