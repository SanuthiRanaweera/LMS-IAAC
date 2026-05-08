import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { notFoundHandler, errorHandler } from './middleware/errorHandlers.js';
import { requireAuth } from './middleware/auth.js';
import { requireAdmin, requireAdminRole } from './middleware/adminAuth.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { adminAuthRouter } from './routes/adminAuth.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { entitiesRouter } from './routes/entities.routes.js';
import { lmsRouter } from './routes/lms.routes.js';
import materialsRouter from './routes/materials.routes.js';
import { scheduleRouter, scheduleAdminRouter } from './routes/schedule.routes.js';
import { recordingsRouter, recordingsAdminRouter } from './routes/recordings.routes.js';
import { knowledgeHubRouter, knowledgeHubAdminRouter } from './routes/knowledgehub.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure upload directories exist
['uploads/recordings', 'uploads/knowledgehub', 'uploads/materials'].forEach((dir) => {
  const abs = path.resolve(__dirname, '..', dir);
  if (!fs.existsSync(abs)) fs.mkdirSync(abs, { recursive: true });
});

export function createServer() {
  const app = express();

  const envOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const isAllowedLocalDevOrigin = (origin) => {
    try {
      const url = new URL(origin);
      const hostOk = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      const portOk = /^517\d$/.test(url.port);
      return url.protocol === 'http:' && hostOk && portOk;
    } catch {
      return false;
    }
  };

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (envOrigins.length > 0) {
          return callback(null, envOrigins.includes(origin) || isAllowedLocalDevOrigin(origin));
        }
        return callback(null, isAllowedLocalDevOrigin(origin));
      },
      credentials: true,
    })
  );
  app.use(morgan('dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/', (req, res) => {
    res.json({ name: 'lms-api', status: 'ok' });
  });

  app.use('/api/health', healthRouter);

  app.use('/api/auth', authRouter);

  app.use('/api/admin/auth', adminAuthRouter);
  app.use('/api/admin', requireAdmin, adminRouter);
  app.use('/api/admin/schedule', requireAdmin, scheduleAdminRouter);
  app.use('/api/admin/recordings', requireAdmin, recordingsAdminRouter);
  app.use('/api/admin/knowledge-hub', requireAdmin, knowledgeHubAdminRouter);

  // Generic hierarchical management (superadmin only for management)
  app.use('/api/entities', requireAdmin, requireAdminRole('superadmin'), entitiesRouter);

  // Materials management (branch-intake-batch hierarchy)
  app.use('/api/materials', materialsRouter);

  // Schedule, Recordings, Knowledge Hub — student & lecturer access
  app.use('/api/schedule', scheduleRouter);
  app.use('/api/recordings', recordingsRouter);
  app.use('/api/knowledge-hub', knowledgeHubRouter);

  app.use('/api', requireAuth, lmsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
