# api-logger-mongodb

A comprehensive API logging middleware for Node.js applications (Express, NestJS, etc.) that logs requests and responses to MongoDB for auditing and debugging.

## Features
-  Logs API URL, method, request/response data, status, user info, timestamps, and duration
-  Mask sensitive fields (e.g., password, token)
-  In-process WAF detection with managed rules (SQLi, XSS, path traversal, command injection, protocol anomalies)
-  Soft-block and block modes with score thresholds
-  Optional in-memory rate limiting and abuse controls
-  WAF decision metadata stored with request audit logs
-  Configurable via options (MongoDB URI, collection, etc.)
-  Express middleware support
-  NestJS middleware support
-  TypeScript support
-  Filter by routes, methods, status codes
-  Custom user info extraction
-  Response body logging (configurable)

## Installation

Install directly from GitHub:

```bash
npm install git+https://github.com/rick001/api-logger-mongodb.git
```

Or, with yarn:

```bash
yarn add git+https://github.com/rick001/api-logger-mongodb.git
```

## Quick Start

### Express.js
```ts
import express from 'express';
import { apiLoggerExpress } from 'api-logger-mongodb';

const app = express();

app.use(express.json());
app.use(apiLoggerExpress({
  mongoUri: 'mongodb://localhost:27017',
  databaseName: 'my_logs',
  collectionName: 'api_audit',
  maskFields: ['password', 'token'],
  logResponseBody: true,
  logRequestBody: true,
  getUserInfo: req => req.user ? { id: req.user.id, email: req.user.email } : undefined
}));

// ... your routes
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
```

## Example Folder

A runnable Express WAF demo is included at `example/express-waf`.
A runnable outbound Axios security demo is included at `example/standalone-axios-waf`.

```bash
npm run build
node example/express-waf/server.js
node example/standalone-axios-waf/client.js
```

Or run them via npm scripts:

```bash
npm run example:express
npm run example:axios
```

See:
- `example/express-waf/README.md`
- `example/standalone-axios-waf/README.md`

### NestJS
```ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { createApiLoggerMiddleware } from 'api-logger-mongodb';

@Module({
  // ... your modules
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(createApiLoggerMiddleware({
        mongoUri: 'mongodb://localhost:27017',
        databaseName: 'my_nestjs_logs',
        collectionName: 'api_audit',
        maskFields: ['password', 'token'],
        logResponseBody: true,
        logRequestBody: true,
        getUserInfo: (req) => {
          const user = (req as any).user;
          return user
            ? {
                id: user.id,
                email: user.email,
                role: user.role,
              }
            : undefined;
        }
      }))
      .forRoutes('*'); // Apply to all routes
  }
}
```

### Standalone (Axios, Fetch, etc.)
```ts
import axios from 'axios';
import { StandaloneApiLogger, createAxiosLogger } from 'api-logger-mongodb';

// Create logger instance
const logger = new StandaloneApiLogger({
  mongoUri: 'mongodb://localhost:27017',
  databaseName: 'my_logs',
  collectionName: 'api_audit',
  maskFields: ['password', 'token'],
  logResponseBody: true,
  logRequestBody: true
});

// Initialize logger
await logger.init();

// Create axios interceptor for automatic logging
const axiosLogger = createAxiosLogger(logger, () => ({
  id: 'user123',
  email: 'user@example.com'
}));

// Add interceptors to axios
axios.interceptors.request.use(axiosLogger.request);
axios.interceptors.response.use(axiosLogger.response, axiosLogger.error);

// Now all axios calls will be automatically logged
const response = await axios.get('https://api.example.com/users');
const postResponse = await axios.post('https://api.example.com/users', {
  name: 'John',
  email: 'john@example.com'
});

// Manual logging (for fetch or other HTTP clients)
await logger.logRequest(
  'https://api.example.com/users',
  'GET',
  {
    headers: { 'Authorization': 'Bearer token' },
    query: { page: 1 }
  },
  {
    statusCode: 200,
    body: { users: [] }
  },
  { id: 'user123', email: 'user@example.com' },
  150 // duration in ms
);

// Close connection when done
await logger.close();
```

## Advanced Usage Examples

### WAF (Soft-Block Rollout)
```ts
app.use(apiLoggerExpress({
  mongoUri: 'mongodb://localhost:27017',
  databaseName: 'security_logs',
  collectionName: 'api_audit',
  // Keep masking defaults and avoid false positives for known safe fields
  maskAllowList: ['body.user.email', 'query.email'],
  // Enable WAF
  waf: {
    enabled: true,
    mode: 'soft-block', // detect | soft-block | block
    failOpen: true,
    scoreThresholds: {
      log: 15,
      softBlock: 50,
      block: 80
    },
    rateLimit: {
      enabled: true,
      windowMs: 60_000,
      maxRequests: 120,
      blockDurationMs: 60_000,
      statusCode: 429
    },
    blockedResponseBody: {
      error: 'Request blocked by security policy'
    }
  },
  // Async persistence recommended for high traffic
  persistenceMode: 'async',
  batchSize: 200,
  flushIntervalMs: 500
}));
```

### Standalone Axios (Outbound Security + Audit Logging)
```ts
import axios from 'axios';
import {
  StandaloneApiLogger,
  createAxiosLogger,
  normalizeLoggerOptions
} from 'api-logger-mongodb';

const logger = new StandaloneApiLogger(
  normalizeLoggerOptions({
    mongoUri: 'mongodb://localhost:27017',
    databaseName: 'security_logs',
    collectionName: 'outbound_audit'
  })
);
await logger.init();

const axiosLogger = createAxiosLogger(logger);
axios.interceptors.request.use(axiosLogger.request);
axios.interceptors.response.use(axiosLogger.response, axiosLogger.error);
```

### New WAF Utility Exports

The latest version also exports helper utilities:

```ts
import {
  getManagedRules,
  normalizeWafOptions,
  normalizeLoggerOptions,
  validateLoggerOptions,
  WafEngine
} from 'api-logger-mongodb';

const waf = normalizeWafOptions({
  enabled: true,
  mode: 'soft-block',
  rules: getManagedRules({ includeCategories: ['sqli', 'xss'] })
});

const options = normalizeLoggerOptions({
  mongoUri: 'mongodb://localhost:27017',
  waf
});

validateLoggerOptions(options);
```

### Express - Filter by Routes and Methods
```ts
app.use(apiLoggerExpress({
  mongoUri: 'mongodb://localhost:27017',
  databaseName: 'my_logs',
  collectionName: 'api_audit',
  maskFields: ['password', 'token'],
  // Only log specific routes
  includeRoutes: [/^\/api\/users/, /^\/api\/orders/],
  // Exclude health check routes
  excludeRoutes: [/^\/health/, /^\/metrics/],
  // Only log POST, PUT, DELETE methods
  includeMethods: ['POST', 'PUT', 'DELETE'],
  // Only log errors (status >= 400)
  logErrorsOnly: true
}));
```

### NestJS - Apply to Specific Routes
```ts
import { RequestMethod } from '@nestjs/common';

configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(createApiLoggerMiddleware({
      mongoUri: 'mongodb://localhost:27017',
      databaseName: 'my_nestjs_logs',
      collectionName: 'api_audit',
      maskFields: ['password', 'token'],
      logResponseBody: true,
      logRequestBody: true
    }))
    .forRoutes(
      { path: 'api/users', method: RequestMethod.ALL },
      { path: 'api/orders', method: RequestMethod.ALL },
      { path: 'api/products', method: RequestMethod.ALL }
    );
}
```

### Custom User Info Extraction
```ts
getUserInfo: (req) => {
  // Extract from JWT payload
  const user = (req as any).user || (req as any).payload;
  return user ? {
    id: user.id || user.sub,
    email: user.email,
    role: user.role,
    tenant: user.tenant
  } : {
    type: 'anonymous',
    ip: req.ip
  };
}
```

## Options
| Option            | Type            | Description |
|-------------------|----------------|-------------|
| mongoUri          | string         | MongoDB connection URI (required) |
| databaseName      | string         | Database name (default: `api_logs`) |
| collectionName    | string         | Collection name (default: `api_requests`) |
| maskFields        | string[]       | Fields to mask in logs |
| logResponseBody   | boolean        | Log response body (default: true) |
| logRequestBody    | boolean        | Log request body (default: true) |
| logHeaders        | boolean        | Log headers (default: true) |
| logQuery          | boolean        | Log query params (default: true) |
| logParams         | boolean        | Log URL params (default: true) |
| getUserInfo       | function       | Extract user info from request |
| includeRoutes     | RegExp[]       | Only log matching routes |
| excludeRoutes     | RegExp[]       | Exclude matching routes |
| includeMethods    | string[]       | Only log these HTTP methods |
| excludeMethods    | string[]       | Exclude these HTTP methods |
| minStatusCode     | number         | Minimum status code to log |
| maxStatusCode     | number         | Maximum status code to log |
| logErrorsOnly     | boolean        | Only log errors (status >= 400) |
| shouldLog         | function       | Custom function to decide logging |
| transformLog      | function       | Transform log entry before saving |
| persistenceMode   | `sync` \| `async` | Log write strategy (default: `sync`) |
| batchSize         | number         | Async write batch size (default: 100) |
| flushIntervalMs   | number         | Async write flush interval ms (default: 500) |
| maxQueueSize      | number         | Async write queue cap (default: 1000) |
| waf               | object         | WAF options (mode, rules, thresholds, rate limiting, callbacks) |

### WAF Options (high-level)
| Option | Type | Description |
|--------|------|-------------|
| `waf.enabled` | boolean | Enables WAF evaluation pipeline |
| `waf.mode` | `detect` \| `soft-block` \| `block` | Enforcement mode |
| `waf.failOpen` | boolean | Allow requests on evaluation errors when true |
| `waf.statusCode` | number | HTTP status for blocked requests |
| `waf.scoreThresholds` | object | `log`, `softBlock`, `block` risk thresholds |
| `waf.rules` | `WafRule[]` | Custom rule definitions with regex targets |
| `waf.rateLimit` | object | Windowed per-key in-memory rate limiting |
| `waf.routeOverrides` | array | Route-level mode/threshold overrides |
| `waf.sizeLimits` | object | Inspection/truncation limits for headers/body/query/params |

### Masking Options (false-positive control)
| Option | Type | Description |
|--------|------|-------------|
| `maskFields` | `string[]` | Exact key/path fields to mask |
| `maskFieldPatterns` | `RegExp[]` | Regex match for key/path masking |
| `maskAllowList` | `string[]` | Key/path exceptions that should not be masked |
| `maskCaseSensitive` | `boolean` | Case-sensitive matching for mask rules |
| `maskValue` | `string` | Replacement value for masked fields |

## Production Rollout Checklist
1. Start with `waf.mode: 'detect'` for at least one traffic cycle.
2. Review `waf.matches`, `waf.score`, and route-level false positives in MongoDB.
3. Add `maskAllowList` and route overrides for known-safe flows (auth/profile updates).
4. Move to `soft-block` with conservative thresholds.
5. Enable `block` only after monitored tuning, with incident rollback plan.
6. Track `Retry-After` behavior and client handling for rate-limited responses.

## Log Schema Example
```json
{
  "url": "/api/users",
  "method": "POST",
  "request": {
    "headers": {},
    "body": {},
    "query": {},
    "params": {}
  },
  "response": {
    "statusCode": 200,
    "body": {}
  },
  "user": {
    "id": "1234",
    "email": "user@example.com"
  },
  "createdAt": "2025-07-01T10:00:00Z",
  "durationMs": 145,
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0 ..."
}
```

## Querying Logs

You can query your MongoDB collection to analyze API usage:

```javascript
// Find all failed requests
db.api_audit.find({ "response.statusCode": { $gte: 400 } })

// Find slow requests (>1 second)
db.api_audit.find({ durationMs: { $gt: 1000 } })

// Find requests by user
db.api_audit.find({ "user.id": "1234" })

// Find requests in the last hour
db.api_audit.find({ 
  createdAt: { $gte: new Date(Date.now() - 60*60*1000) } 
})

// Find requests by endpoint
db.api_audit.find({ url: /\/api\/users/ })

// Find requests by method
db.api_audit.find({ method: "POST" })

// Aggregate by endpoint usage
db.api_audit.aggregate([
  { $group: { _id: "$url", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

## License
MIT 