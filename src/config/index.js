export const config = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  cache: {
    stdTTL: 300,
    checkperiod: 60,
    maxKeys: 1000
  },

  rateLimit: {
    windowMs: 60 * 1000,
    max: 30,
    message: {
      success: false,
      error: 'Too many requests, please try again later.',
      retryAfter: '60 seconds'
    }
  },

  engines: {
    default: 'duckduckgo',
    available: ['duckduckgo', 'bing', 'google'],
    timeout: 10000,
    maxResults: 50
  },

  scraping: {
    retries: 3,
    retryDelay: 1000,
    concurrentRequests: 2
  }
};

export default config;
