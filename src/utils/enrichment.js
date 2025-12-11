import axios from 'axios';
import { getRandomUserAgent } from './userAgents.js';

const FAVICON_PROVIDERS = [
    (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    (domain) => `https://icon.horse/icon/${domain}`,
    (domain) => `https://favicone.com/${domain}?s=128`,
    (domain) => `https://api.faviconkit.com/${domain}/128`,
    (domain) => `https://${domain}/favicon.ico`
];

export function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return url;
    }
}

export function getFaviconUrl(url, provider = 'google') {
    const domain = extractDomain(url);
    const providers = {
        google: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        horse: `https://icon.horse/icon/${domain}`,
        faviconkit: `https://api.faviconkit.com/${domain}/128`,
        clearbit: `https://logo.clearbit.com/${domain}`,
        duckduckgo: `https://icons.duckduckgo.com/ip3/${domain}.ico`
    };

    return providers[provider] || providers.google;
}
export function getSiteName(url) {
    const domain = extractDomain(url);
    const cleanDomain = domain.replace(/^www\./, '');
    const parts = cleanDomain.split('.');
    const mainPart = parts[0];
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
}

export function extractBreadcrumbs(url) {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        if (!path || path === '/') {
            return [urlObj.hostname];
        }

        const parts = path.split('/').filter(p => p.length > 0);
        const cleanParts = parts.map(part => {
            return part
                .replace(/[-_]/g, ' ')
                .replace(/\.(html|php|aspx?)$/i, '')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        });
        return [urlObj.hostname, ...cleanParts].slice(0, 4);
    } catch {
        return [];
    }
}

export function detectContentType(result) {
    const title = (result.title || '').toLowerCase();
    const snippet = (result.snippet || '').toLowerCase();
    const url = (result.url || '').toLowerCase();
    if (url.includes('youtube.com') || url.includes('vimeo.com') ||
        url.includes('dailymotion.com') || title.includes('video')) {
        return 'video';
    }
    if (url.includes('/blog/') || url.includes('/article/') ||
        url.includes('/post/') || url.includes('/news/')) {
        return 'article';
    }
    if (url.includes('/docs/') || url.includes('/documentation/') ||
        url.includes('/api/') || url.includes('/reference/')) {
        return 'documentation';
    }
    if (url.includes('stackoverflow.com') || url.includes('reddit.com') ||
        url.includes('quora.com') || url.includes('/forum/')) {
        return 'forum';
    }
    if (url.includes('amazon.') || url.includes('ebay.') ||
        url.includes('/shop/') || url.includes('/product/')) {
        return 'product';
    }
    if (url.includes('twitter.com') || url.includes('facebook.com') ||
        url.includes('linkedin.com') || url.includes('instagram.com')) {
        return 'social';
    }
    if (url.includes('wikipedia.org') || url.includes('wiki')) {
        return 'wiki';
    }
    return 'website';
}

export function extractDate(snippet) {
    if (!snippet) return { date: null, cleanSnippet: snippet };
    const datePatterns = [
        /^(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})\s*[—–-]\s*/i,
        /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[—–-]\s*/,
        /^(\d{4}-\d{2}-\d{2})\s*[—–-]\s*/,
        /^(hace?\s+\d+\s+(?:hora|día|semana|mes|año)s?)\s*[—–-]\s*/i,
        /^(\d+\s+(?:hour|day|week|month|year)s?\s+ago)\s*[—–-]\s*/i
    ];
    for (const pattern of datePatterns) {
        const match = snippet.match(pattern);
        if (match) {
            return {
                date: match[1],
                cleanSnippet: snippet.replace(pattern, '').trim()
            };
        }
    }

    return { date: null, cleanSnippet: snippet };
}
export function enrichResult(result) {
    const domain = extractDomain(result.url);
    const { date, cleanSnippet } = extractDate(result.snippet);
    return {
        ...result,
        snippet: cleanSnippet,
        domain,
        favicon: getFaviconUrl(result.url, 'google'),
        faviconHD: getFaviconUrl(result.url, 'clearbit'),
        siteName: getSiteName(result.url),
        breadcrumbs: extractBreadcrumbs(result.url),
        contentType: detectContentType(result),
        datePublished: date,
        meta: {
            isSecure: result.url.startsWith('https'),
            domain,
            tld: domain.split('.').pop()
        }
    };
}

export function enrichResults(results) {
    return results.map(result => enrichResult(result));
}
export function calculateQualityScore(result) {
    let score = 50;
    if (result.url?.startsWith('https')) score += 10;
    if (result.snippet && result.snippet.length > 50) score += 10;
    if (result.title && result.title.length > 20 && result.title.length < 100) score += 10;
    const trustedDomains = ['wikipedia.org', 'github.com', 'stackoverflow.com', 'mozilla.org', 'w3.org'];
    if (trustedDomains.some(d => result.url?.includes(d))) score += 15;
    if (result.position <= 3) score += 5;
    return Math.min(100, score);
}

export default {
    extractDomain,
    getFaviconUrl,
    getSiteName,
    extractBreadcrumbs,
    detectContentType,
    extractDate,
    enrichResult,
    enrichResults,
    calculateQualityScore
};