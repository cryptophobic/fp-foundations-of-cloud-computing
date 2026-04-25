const express = require('express');
const os = require('os');
const { Pool } = require('pg');

const PORT = Number(process.env.PORT) || 8080;

const dbPool = process.env.DB_HOST
  ? new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : null;

const app = express();

app.get('/', (req, res) => {
  res.json({
    message: 'Happy developing',
    instance: os.hostname(),
    uptime_seconds: Math.round(process.uptime()),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/db', async (req, res) => {
  if (!dbPool) {
    return res.status(503).json({ status: 'db not configured' });
  }
  try {
    const { rows } = await dbPool.query('SELECT NOW() AS now');
    res.json({ status: 'ok', now: rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Listening on :${PORT}`);
});

const shutdown = (signal) => {
  console.log(`Received ${signal}, shutting down`);
  server.close(async () => {
    if (dbPool) await dbPool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
