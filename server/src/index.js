import { createServer } from './server.js';
import { closeDb, connectDb } from './config/db.js';
import dotenv from 'dotenv';

import bcrypt from 'bcryptjs';
import { DEFAULT_LMS_DATA } from './data/defaultLmsData.js';
import { Admin } from './models/Admin.js';
import { seedDefaultAppData } from './services/appData.service.js';

dotenv.config();

const initialPort = Number(process.env.PORT || 5000);

const dbConnected = await connectDb();
if (dbConnected) {
  await seedDefaultAppData(DEFAULT_LMS_DATA);

  const bootstrapEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const bootstrapPassword = (process.env.ADMIN_PASSWORD || '').trim();
  const bootstrapName = (process.env.ADMIN_NAME || 'Super Admin').trim();

  if (bootstrapEmail && bootstrapPassword) {
    const existing = await Admin.findOne({ email: bootstrapEmail }).lean();
    if (!existing) {
      const passwordHash = await bcrypt.hash(bootstrapPassword, 12);
      await Admin.create({ name: bootstrapName, email: bootstrapEmail, passwordHash, role: 'superadmin' });
      // eslint-disable-next-line no-console
      console.log(`Bootstrapped admin: ${bootstrapEmail}`);
    }
  }
}

const app = createServer();

async function shutdown(signal) {
  try {
    await closeDb();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`Failed to close database on ${signal}:`, err?.message || err);
  } finally {
    process.exit(0);
  }
}

process.once('SIGINT', () => { void shutdown('SIGINT'); });
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });

function listenWithRetry(startPort, maxAttempts = 10) {
  let port = startPort;

  const attempt = () => {
    const server = app.listen(port, () => {
      process.env.PORT = String(port);
      // eslint-disable-next-line no-console
      console.log(`API listening on http://localhost:${port}`);
    });

    server.on('error', (err) => {
      if (err?.code === 'EADDRINUSE' && port < startPort + maxAttempts - 1) {
        // eslint-disable-next-line no-console
        console.warn(`Port ${port} is in use, trying ${port + 1}...`);
        port += 1;
        attempt();
        return;
      }

      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
  };

  attempt();
}

listenWithRetry(initialPort);
