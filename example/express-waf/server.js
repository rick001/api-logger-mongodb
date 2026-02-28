const express = require('express');
const {
  apiLoggerExpress,
  getManagedRules,
  normalizeWafOptions,
  validateLoggerOptions
} = require('../../dist');

const app = express();

const loggerOptions = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  databaseName: 'api_logger_examples',
  collectionName: 'waf_demo_logs',
  maskAllowList: ['body.profile.email', 'query.email'],
  persistenceMode: 'async',
  batchSize: 100,
  flushIntervalMs: 500,
  waf: normalizeWafOptions({
    enabled: true,
    mode: process.env.WAF_MODE || 'soft-block',
    failOpen: true,
    scoreThresholds: {
      log: 15,
      softBlock: 50,
      block: 80
    },
    rateLimit: {
      enabled: true,
      windowMs: 60_000,
      maxRequests: 30,
      blockDurationMs: 60_000
    },
    // Keep a subset of managed rules for this demo.
    rules: getManagedRules({
      includeCategories: ['sqli', 'xss', 'path-traversal', 'command-injection']
    }),
    blockedResponseBody: {
      error: 'Request blocked by WAF policy'
    }
  }),
  onInternalError: (error, context) => {
    console.error(`[Example:${context}]`, error);
  }
};

validateLoggerOptions(loggerOptions);

const loggerMiddleware = apiLoggerExpress(loggerOptions);
app.use(express.json());
app.use(loggerMiddleware);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/users', (req, res) => {
  res.json({ users: [{ id: 1, email: 'user@example.com' }] });
});

app.post('/login', (req, res) => {
  res.json({
    status: 'ok',
    user: { email: req.body.email || 'anonymous@example.com' }
  });
});

app.get('/metrics/waf', (req, res) => {
  const metrics =
    typeof loggerMiddleware.getWafMetrics === 'function'
      ? loggerMiddleware.getWafMetrics()
      : { message: 'WAF metrics unavailable' };
  res.json(metrics);
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Example WAF server listening on http://localhost:${port}`);
});
