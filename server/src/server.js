import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  notFoundHandler,
  errorHandler,
} from './middleware/errorHandlers.js';

import {
  requireAuth,
} from './middleware/auth.js';

import {
  requireAdmin,
  requireAdminRole,
} from './middleware/adminAuth.js';

import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { adminAuthRouter } from './routes/adminAuth.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { entitiesRouter } from './routes/entities.routes.js';
import { lmsRouter } from './routes/lms.routes.js';

import materialsRouter from './routes/materials.routes.js';

import {
  studyMaterialsRouter,
} from './routes/studyMaterials.routes.js';

import {
  scheduleRouter,
  scheduleAdminRouter,
} from './routes/schedule.routes.js';

import {
  recordingsRouter,
  recordingsAdminRouter,
} from './routes/recordings.routes.js';

import {
  knowledgeHubRouter,
  knowledgeHubAdminRouter,
} from './routes/knowledgehub.routes.js';

import {
  feedbackRouter,
} from './routes/feedback.routes.js';

import {
  adminFeedbackRouter,
} from './routes/adminFeedback.routes.js';

import {
  lecturersRouter,
} from './routes/lecturers.routes.js';

import {
  adminAssignmentsRouter,
  studentAssignmentsRouter,
} from './routes/assignments.routes.js';

/* =========================================================
   ADMIN RESULTS
========================================================= */

import {
  resultsRouter,
} from './routes/results.routes.js';

/* =========================================================
   STUDENT RESULTS
========================================================= */

import {
  studentResultsRouter,
} from './routes/studentResults.routes.js';

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

/* =========================================================
   ENSURE UPLOAD DIRECTORIES EXIST
========================================================= */

[
  'uploads/recordings',
  'uploads/knowledgehub',
  'uploads/materials',
  'uploads/assignments',
].forEach((dir) => {
  const abs = path.resolve(
    __dirname,
    '..',
    dir
  );

  if (!fs.existsSync(abs)) {
    fs.mkdirSync(abs, {
      recursive: true,
    });
  }
});

/* =========================================================
   CREATE EXPRESS SERVER
========================================================= */

export function createServer() {
  const app = express();

  /* =======================================================
     CORS
  ======================================================= */

  const envOrigins = (
    process.env.CLIENT_ORIGIN || ''
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  function isAllowedLocalDevOrigin(origin) {
    try {
      const url = new URL(origin);

      const hostAllowed =
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1';

      const portAllowed =
        /^517\d$/.test(url.port);

      return (
        url.protocol === 'http:' &&
        hostAllowed &&
        portAllowed
      );
    } catch {
      return false;
    }
  }

  /* =======================================================
     SECURITY
  ======================================================= */

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }

        if (envOrigins.length > 0) {
          const allowed =
            envOrigins.includes(origin) ||
            isAllowedLocalDevOrigin(origin);

          return callback(
            null,
            allowed
          );
        }

        return callback(
          null,
          isAllowedLocalDevOrigin(origin)
        );
      },

      credentials: true,
    })
  );

  /* =======================================================
     COMMON MIDDLEWARE
  ======================================================= */

  app.use(
    morgan('dev')
  );

  app.use(
    express.json({
      limit: '1mb',
    })
  );

  app.use(
    cookieParser()
  );

  /* =======================================================
     STATIC FILES
  ======================================================= */

  app.use(
    '/uploads',
    express.static(
      path.resolve(
        __dirname,
        '..',
        'uploads'
      )
    )
  );

  /* =======================================================
     ROOT
  ======================================================= */

  app.get(
    '/',
    (req, res) => {
      res.json({
        name: 'lms-api',
        status: 'ok',
      });
    }
  );

  /* =======================================================
     HEALTH
  ======================================================= */

  app.use(
    '/api/health',
    healthRouter
  );

  /* =======================================================
     STUDENT / GENERAL AUTH
  ======================================================= */

  app.use(
    '/api/auth',
    authRouter
  );

  /* =======================================================
     ADMIN AUTH
  ======================================================= */

  app.use(
    '/api/admin/auth',
    adminAuthRouter
  );

  /* =======================================================
     ADMIN CORE
  ======================================================= */

  app.use(
    '/api/admin',
    requireAdmin,
    adminRouter
  );

  /* =======================================================
     ADMIN RESULTS
  ======================================================= */

  app.use(
    '/api/results',
    requireAdmin,
    resultsRouter
  );

  /* =======================================================
     STUDENT RESULTS
  ======================================================= */

  /*
    Student endpoint:

    GET /api/student/results

    Authentication is handled inside
    studentResultsRouter using:

    requireAuth
    requireStudent
  */

  app.use(
    '/api/student/results',
    studentResultsRouter
  );

  /* =======================================================
     ADMIN SCHEDULE
  ======================================================= */

  app.use(
    '/api/admin/schedule',
    requireAdmin,
    scheduleAdminRouter
  );

  /* =======================================================
     ADMIN RECORDINGS
  ======================================================= */

  app.use(
    '/api/admin/recordings',
    requireAdmin,
    recordingsAdminRouter
  );

  /* =======================================================
     ADMIN KNOWLEDGE HUB
  ======================================================= */

  app.use(
    '/api/admin/knowledge-hub',
    requireAdmin,
    knowledgeHubAdminRouter
  );

  /* =======================================================
     ADMIN ASSIGNMENTS
  ======================================================= */

  app.use(
    '/api/admin/assignments',
    requireAdmin,
    adminAssignmentsRouter
  );

  /* =======================================================
     ADMIN FEEDBACK
  ======================================================= */

  app.use(
    '/api/admin/feedback',
    adminFeedbackRouter
  );

  /* =======================================================
     GENERIC HIERARCHICAL MANAGEMENT
  ======================================================= */

  app.use(
    '/api/entities',
    requireAdmin,
    requireAdminRole(
      'superadmin'
    ),
    entitiesRouter
  );

  /* =======================================================
     MATERIALS
  ======================================================= */

  app.use(
    '/api/materials',
    materialsRouter
  );

  app.use(
    '/api',
    studyMaterialsRouter
  );

  /* =======================================================
     STUDENT / LECTURER MODULES
  ======================================================= */

  app.use(
    '/api/schedule',
    scheduleRouter
  );

  app.use(
    '/api/recordings',
    recordingsRouter
  );

  app.use(
    '/api/knowledge-hub',
    knowledgeHubRouter
  );

  app.use(
    '/api/student/assignments',
    studentAssignmentsRouter
  );

  /* =======================================================
     LECTURERS
  ======================================================= */

  app.use(
    '/api/lecturers',
    lecturersRouter
  );

  /* =======================================================
     FEEDBACK
  ======================================================= */

  app.use(
    '/api/feedback',
    feedbackRouter
  );

  /* =======================================================
     PROTECTED LMS ROUTES
  ======================================================= */

  app.use(
    '/api',
    requireAuth,
    lmsRouter
  );

  /* =======================================================
     NOT FOUND
  ======================================================= */

  app.use(
    notFoundHandler
  );

  /* =======================================================
     ERROR HANDLER
  ======================================================= */

  app.use(
    errorHandler
  );

  return app;
}