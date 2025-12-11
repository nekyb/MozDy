import { Router } from 'express';
import * as searchController from '../controllers/search.controller.js';
import { apiLimiter, suggestLimiter, strictLimiter } from '../middleware/rateLimiter.js';
import {
    validateWebSearch,
    validateImageSearch,
    validateNewsSearch,
    validateSuggestions,
    validateSearchQuery,
    validateEngine,
    validatePagination
} from '../middleware/validator.js';

const router = Router();

router.get('/', searchController.apiInfo);

router.get('/health', searchController.healthCheck);

router.get('/engines', searchController.getEngines);

router.get('/search',
    apiLimiter,
    ...validateWebSearch,
    searchController.webSearch
);

router.get('/search/images',
    apiLimiter,
    ...validateImageSearch,
    searchController.imageSearch
);

router.get('/search/news',
    apiLimiter,
    ...validateNewsSearch,
    searchController.newsSearch
);

router.get('/search/suggest',
    suggestLimiter,
    ...validateSuggestions,
    searchController.suggestions
);

router.get('/search/multi',
    strictLimiter,
    validateSearchQuery,
    validatePagination,
    searchController.multiEngineSearch
);

router.post('/cache/clear',
    strictLimiter,
    searchController.clearCacheEndpoint
);

router.get('/web',
    apiLimiter,
    ...validateWebSearch,
    searchController.webSearch
);

router.get('/images',
    apiLimiter,
    ...validateImageSearch,
    searchController.imageSearch
);

router.get('/news',
    apiLimiter,
    ...validateNewsSearch,
    searchController.newsSearch
);

router.get('/suggest',
    suggestLimiter,
    ...validateSuggestions,
    searchController.suggestions
);

export default router;
