import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import searchRoutes from './routes/search.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (config.server.env === 'development') {
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
        });
        next();
    });
}

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use('/api', searchRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
const startServer = () => {
    const { port, host } = config.server;
    app.listen(port, host, () => {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║                                                          ║');
        console.log('║   🦊 MozDy Search API                                    ║');
        console.log('║                                                          ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║   🌐 Server:     http://${host}:${port}                     ║`);
        console.log(`║   📚 API Docs:   http://${host}:${port}/api                 ║`);
        console.log(`║   💚 Health:     http://${host}:${port}/api/health          ║`);
        console.log('║                                                          ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log('║   Available Endpoints:                                   ║');
        console.log('║   • GET /api/search?q=<query>         Web Search         ║');
        console.log('║   • GET /api/search/images?q=<query>  Image Search       ║');
        console.log('║   • GET /api/search/news?q=<query>    News Search        ║');
        console.log('║   • GET /api/search/suggest?q=<query> Suggestions        ║');
        console.log('║   • GET /api/search/multi?q=<query>   Multi-Engine       ║');
        console.log('║                                                          ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log('║   Search Engines: DuckDuckGo, Bing, Google               ║');
        console.log('║   Default Engine: DuckDuckGo (privacy-focused)           ║');
        console.log('║                                                          ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('');
    });
};

startServer();
export default app;
