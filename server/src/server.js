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

import {
  resultsRouter,
} from './routes/results.routes.js';

import {
  studentResultsRouter,
} from './routes/studentResults.routes.js';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(
  __filename
);

/* =========================================================
   UPLOAD ROOT
========================================================= */

const uploadRoot = path.resolve(
  __dirname,
  '..',
  'uploads'
);

/* =========================================================
   ENSURE UPLOAD DIRECTORIES EXIST
========================================================= */

[
  uploadRoot,
  path.join(
    uploadRoot,
    'recordings'
  ),
  path.join(
    uploadRoot,
    'knowledgehub'
  ),
  path.join(
    uploadRoot,
    'materials'
  ),
  path.join(
    uploadRoot,
    'assignments'
  ),
].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(
      dir,
      {
        recursive: true,
      }
    );
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
    .map((value) =>
      value.trim()
    )
    .filter(Boolean);

  function isAllowedLocalDevOrigin(
    origin
  ) {
    try {
      const url = new URL(
        origin
      );

      const hostAllowed =
        url.hostname ===
          'localhost' ||
        url.hostname ===
          '127.0.0.1';

      const portAllowed =
        /^517\d$/.test(
          url.port
        );

      return (
        url.protocol ===
          'http:' &&
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
        policy:
          'cross-origin',
      },
    })
  );

  /* =======================================================
     CORS MIDDLEWARE
  ======================================================= */

  app.use(
    cors({
      origin(
        origin,
        callback
      ) {
        /*
          Requests from Postman,
          curl and some server-side
          requests may not contain
          an Origin header.
        */

        if (!origin) {
          return callback(
            null,
            true
          );
        }

        /*
          Production origins from .env
        */

        if (
          envOrigins.length >
          0
        ) {
          const allowed =
            envOrigins.includes(
              origin
            ) ||
            isAllowedLocalDevOrigin(
              origin
            );

          return callback(
            null,
            allowed
          );
        }

        /*
          If CLIENT_ORIGIN is not set,
          allow local Vite development.
        */

        return callback(
          null,
          isAllowedLocalDevOrigin(
            origin
          )
        );
      },

      credentials: true,

      methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ],

      allowedHeaders: [
        'Content-Type',
        'Authorization',
      ],
    })
  );

  /* =======================================================
     REQUEST LOGGING
  ======================================================= */

  app.use(
    morgan('dev')
  );

  /* =======================================================
     REQUEST BODY SIZE
  ======================================================= */

  /*
    Your old value was 1mb.

    Knowledge Hub uploads can easily exceed
    that when multiple images are submitted.

    NOTE:
    multer/file-upload middleware has its own
    file limits too. We will check that separately.
  */

  app.use(
    express.json({
      limit: '30mb',
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '30mb',
    })
  );

  /* =======================================================
     COOKIES
  ======================================================= */

  app.use(
    cookieParser()
  );

  /* =======================================================
     STATIC UPLOADS
  ======================================================= */

  /*
    Example:

    file on disk:
    server/uploads/knowledgehub/photo.jpg

    public URL:
    /uploads/knowledgehub/photo.jpg

    production:
    https://iaaccampus.com/uploads/knowledgehub/photo.jpg
  */

  app.use(
    '/uploads',
    express.static(
      uploadRoot,
      {
        fallthrough: true,

        maxAge:
          process.env.NODE_ENV ===
          'production'
            ? '1d'
            : 0,

        setHeaders(res) {
          res.setHeader(
            'Cross-Origin-Resource-Policy',
            'cross-origin'
          );
        },
      }
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
     STUDENT / LECTURER SCHEDULE
  ======================================================= */

  app.use(
    '/api/schedule',
    scheduleRouter
  );

  /* =======================================================
     STUDENT / LECTURER RECORDINGS
  ======================================================= */

  app.use(
    '/api/recordings',
    recordingsRouter
  );

  /* =======================================================
     KNOWLEDGE HUB
  ======================================================= */

  app.use(
    '/api/knowledge-hub',
    knowledgeHubRouter
  );

  /* =======================================================
     STUDENT ASSIGNMENTS
  ======================================================= */

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