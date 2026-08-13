import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import { createServer } from './server.js';
import { closeDb, connectDb } from './config/db.js';
import { DEFAULT_LMS_DATA } from './data/defaultLmsData.js';
import { Admin } from './models/Admin.js';
import { seedDefaultAppData } from './services/appData.service.js';

dotenv.config();

/* =========================================================
   PORT CONFIGURATION
========================================================= */

const initialPort = Number(process.env.PORT || 5000);

/* =========================================================
   DATABASE INITIALIZATION
========================================================= */

async function initializeDatabase() {
  try {
    const dbConnected = await connectDb();

    if (!dbConnected) {
      console.warn(
        'MongoDB connection was not established. Server will continue without database initialization.'
      );

      return;
    }

    /* =====================================================
       SEED DEFAULT LMS DATA
    ===================================================== */

    await seedDefaultAppData(DEFAULT_LMS_DATA);

    /* =====================================================
       BOOTSTRAP SUPER ADMIN
    ===================================================== */

    const bootstrapEmail = String(
      process.env.ADMIN_EMAIL || ''
    )
      .trim()
      .toLowerCase();

    const bootstrapPassword = String(
      process.env.ADMIN_PASSWORD || ''
    ).trim();

    const bootstrapName = String(
      process.env.ADMIN_NAME || 'Super Admin'
    ).trim();

    if (!bootstrapEmail || !bootstrapPassword) {
      console.warn(
        'ADMIN_EMAIL or ADMIN_PASSWORD is not configured. Super Admin bootstrap skipped.'
      );

      return;
    }

    const existingAdmin = await Admin.findOne({
      email: bootstrapEmail,
    }).lean();

    if (existingAdmin) {
      console.log(
        `Admin account already exists: ${bootstrapEmail}`
      );

      return;
    }

    const passwordHash = await bcrypt.hash(
      bootstrapPassword,
      12
    );

    await Admin.create({
      name: bootstrapName,
      email: bootstrapEmail,
      passwordHash,
      role: 'superadmin',
    });

    console.log(
      `Bootstrapped Super Admin: ${bootstrapEmail}`
    );
  } catch (error) {
    console.error(
      'Database initialization failed:',
      error?.message || error
    );

    throw error;
  }
}

/* =========================================================
   CREATE EXPRESS SERVER
========================================================= */

const app = createServer();

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

async function shutdown(signal) {
  console.log(
    `${signal} received. Shutting down server...`
  );

  try {
    await closeDb();

    console.log(
      'MongoDB connection closed successfully.'
    );
  } catch (error) {
    console.warn(
      `Failed to close database on ${signal}:`,
      error?.message || error
    );
  } finally {
    process.exit(0);
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

/* =========================================================
   START SERVER
========================================================= */

function listenWithRetry(
  startPort,
  maxAttempts = 10
) {
  let port = startPort;

  const attempt = () => {
    const server = app.listen(
      port,
      () => {
        process.env.PORT =
          String(port);

        console.log(
          `API listening on http://localhost:${port}`
        );
      }
    );

    server.on(
      'error',
      (error) => {
        if (
          error?.code ===
            'EADDRINUSE' &&
          port <
            startPort +
              maxAttempts -
              1
        ) {
          console.warn(
            `Port ${port} is already in use. Trying ${port + 1}...`
          );

          port += 1;

          attempt();

          return;
        }

        console.error(
          'Failed to start API server:',
          error
        );

        process.exit(1);
      }
    );
  };

  attempt();
}

/* =========================================================
   APPLICATION STARTUP
========================================================= */

async function startApplication() {
  try {
    await initializeDatabase();

    listenWithRetry(initialPort);
  } catch (error) {
    console.error(
      'Application startup failed:',
      error?.message || error
    );

    process.exit(1);
  }
}

void startApplication();