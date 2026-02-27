import { logger } from '../utils/logger';
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import net from 'net';
import apiRoutes from './api-routes';

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Liste des origins autorisés (SÉCURITÉ)
  const allowedOrigins = [
    'https://8081-irwl1yzlwbswmhi7zu2m2-c84b8aca.us1.manus.computer',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'exp://localhost:8081',
    'exp://127.0.0.1:8081',
  ];

  // CORS restreint aux origins autorisés uniquement
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Vérifier si l'origin est autorisé
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else if (origin) {
      logger.warn(`[SECURITY] Requête bloquée depuis origin non autorisé: ${origin}`);
      // Ne pas définir les headers CORS pour les origins non autorisés
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use('/api', apiRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  const preferredPort = parseInt(process.env.PORT || '3000');
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.debug(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, '0.0.0.0', () => {
    logger.debug(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
