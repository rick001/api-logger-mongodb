/**
 * Express middleware example
 * Run from repo root: npm run build && node example/express/server.js
 */
const express = require('express');
const { apiLoggerExpress, validateLoggerOptions } = require('../../dist');

const options = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  databaseName: 'api_logger_example',
  collectionName: 'express_logs',
  maskFields: ['password', 'token'],
  logResponseBody: true,
  logRequestBody: true,
  getUserInfo: (req) => (req.user ? { id: req.user.id, email: req.user.email } : undefined)
};

validateLoggerOptions(options);

const app = express();
app.use(express.json());
app.use(apiLoggerExpress(options));

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/api/users', (req, res) => {
  res.json({ users: [{ id: 1, email: 'user@example.com' }] });
});

app.post('/api/login', (req, res) => {
  // In real app you'd authenticate; here we just echo back
  res.json({ message: 'ok', user: { email: req.body?.email || 'anonymous' } });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Express example listening on http://localhost:${port}`);
});
