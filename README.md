# api-logger-mongodb

[![npm version](https://img.shields.io/npm/v/api-logger-mongodb.svg)](https://www.npmjs.com/package/api-logger-mongodb)
[![npm downloads](https://img.shields.io/npm/dm/api-logger-mongodb.svg)](https://www.npmjs.com/package/api-logger-mongodb)
[![License: MIT](https://img.shields.io/npm/l/api-logger-mongodb.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/api-logger-mongodb.svg)](https://nodejs.org/)
[![CI](https://github.com/rick001/api-logger-mongodb/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rick001/api-logger-mongodb/actions/workflows/ci.yml?query=branch%3Amain)
[![TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-3178c6.svg)](https://www.typescriptlang.org/)

Middleware that logs your API requests and responses to MongoDB—for Express, NestJS, or standalone outbound calls (e.g. axios). One config, optional masking and filtering, TypeScript-ready.

**TL;DR — install and attach to your app:**

```bash
npm install api-logger-mongodb
```

```ts
import { apiLoggerExpress } from 'api-logger-mongodb';
app.use(apiLoggerExpress({ mongoUri: 'mongodb://localhost:27017', databaseName: 'my_logs', collectionName: 'api_audit' }));
```

---

## Why this exists

Debugging and auditing APIs is easier when every request and response is stored in one place. This package gives you a single middleware (or standalone logger) that writes structured logs to MongoDB, with optional masking of sensitive fields and filtering by route or status—without changing your application logic.

---

## Key features

- Log URL, method, request/response bodies, status, duration, and optional user info to MongoDB
- Mask sensitive fields (e.g. `password`, `token`); configurable or use built-in defaults
- Express middleware and NestJS-compatible middleware (or standalone for outbound HTTP e.g. axios)
- Filter by routes, methods, or status codes; optional errors-only logging
- Fail-open: if MongoDB is down, the app keeps running; logging is best-effort
- TypeScript types and validation for options

---

## Package exports

| Export | Description |
|--------|-------------|
| `apiLoggerExpress(options)` | Express middleware factory |
| `createApiLoggerMiddleware(options)` | NestJS-compatible middleware (use with `app.use()` or `MiddlewareConsumer`) |
| `createApiLoggerModule(options)` | NestJS module factory (options only) |
| `StandaloneApiLogger` | Class for logging outbound HTTP requests (e.g. axios) |
| `createAxiosLogger(logger, getUserInfo?)` | Axios interceptor factory for `StandaloneApiLogger` |
| `ApiLogger` | Core logger class |
| `validateLoggerOptions(options)` | Validates options; throws if invalid |
| `DEFAULT_MASK_FIELDS` | Built-in list of masked field names when `maskFields` is not set |
| `ApiLoggerNestMiddleware`, `ApiLoggerModule` | Legacy aliases for NestJS factories |

Types: `ApiLoggerOptions`, `ApiLogEntry`, `ApiLoggerInstance` (and others from `./types`).

---

## Installation

Requires **Node.js 16.20.1 or later** (same as the [MongoDB Node driver](https://www.npmjs.com/package/mongodb)).

**From npm:**

```bash
npm install api-logger-mongodb
```

**From GitHub:**

```bash
npm install git+https://github.com/rick001/api-logger-mongodb.git
```

---

## Examples

Runnable examples are in the [**example/**](./example) folder (repo only; not in the npm package):

| Example | Description |
|--------|-------------|
| [**express**](./example/express) | Express middleware – log incoming API requests/responses |
| [**nestjs**](./example/nestjs) | NestJS middleware – same in a Nest app (`app.use()` or `MiddlewareConsumer`) |
| [**standalone**](./example/standalone) | Standalone Axios – log outbound HTTP requests; no server needed |

**Prerequisites:** Build from repo root (`npm run build`) and MongoDB running (or set `MONGO_URI`).

```bash
npm run build
node example/express/server.js
# or: cd example/nestjs && npm install && npm run build && npm start
# or: cd example/standalone && npm install && npm start
```

- **Express** and **NestJS** log **incoming** requests.
- **Standalone** logs **outbound** requests (e.g. axios to external APIs).

Details: [example/README.md](./example/README.md) and each subfolder’s README.

---

## Quick start

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

app.get('/api/users', (req, res) => res.json({ users: [] }));
app.listen(3000);
```

### NestJS

Apply via `MiddlewareConsumer` or with `app.use(createApiLoggerMiddleware(options))` in `bootstrap()` (see [example/nestjs](./example/nestjs)).

```ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { createApiLoggerMiddleware } from 'api-logger-mongodb';

@Module({ /* ... */ })
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
          return user ? { id: user.id, email: user.email, role: user.role } : undefined;
        }
      }))
      .forRoutes('*');
  }
}
```

### Standalone (Axios)

```ts
import axios from 'axios';
import { StandaloneApiLogger, createAxiosLogger } from 'api-logger-mongodb';

const logger = new StandaloneApiLogger({
  mongoUri: 'mongodb://localhost:27017',
  databaseName: 'my_logs',
  collectionName: 'api_audit',
  maskFields: ['password', 'token'],
  logResponseBody: true,
  logRequestBody: true
});
await logger.init();

const axiosLogger = createAxiosLogger(logger, () => ({ id: 'user123', email: 'user@example.com' }));
axios.interceptors.request.use(axiosLogger.request);
axios.interceptors.response.use(axiosLogger.response, axiosLogger.error);

await axios.get('https://api.example.com/users');
await logger.close();
```

---

## Advanced usage

### Express – filter by routes and methods

```ts
app.use(apiLoggerExpress({
  mongoUri: 'mongodb://localhost:27017',
  databaseName: 'my_logs',
  collectionName: 'api_audit',
  maskFields: ['password', 'token'],
  includeRoutes: [/^\/api\/users/, /^\/api\/orders/],
  excludeRoutes: [/^\/health/, /^\/metrics/],
  includeMethods: ['POST', 'PUT', 'DELETE'],
  logErrorsOnly: true
}));
```

### NestJS – apply to specific routes

```ts
import { RequestMethod } from '@nestjs/common';

configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(createApiLoggerMiddleware({ /* options */ }))
    .forRoutes(
      { path: 'api/users', method: RequestMethod.ALL },
      { path: 'api/orders', method: RequestMethod.ALL }
    );
}
```

### Custom user info

```ts
getUserInfo: (req) => {
  const user = (req as any).user || (req as any).payload;
  return user ? { id: user.id || user.sub, email: user.email, role: user.role } : { type: 'anonymous', ip: req.ip };
}
```

---

## Production considerations

- **Masking:** If you omit `maskFields`, the logger uses a built-in list (`DEFAULT_MASK_FIELDS`). Override with your own array as needed.
- **Fail-open:** If MongoDB init fails, the middleware logs the error and calls `next()` so the app continues; requests are not logged until the connection succeeds.
- **Standalone:** `StandaloneApiLogger` and `createAxiosLogger` use the same masking, filtering, and `transformLog` as the server middleware.
- **Validation:** Invalid options (e.g. missing `mongoUri`) throw at construction; use `validateLoggerOptions(options)` to fail fast.
- **Indexes:** If index creation fails (e.g. permissions), the logger continues and logs a warning.
- **WAF:** This package only logs; it does not block. Run your WAF first, then this logger; attach WAF outcome via `getUserInfo` or `transformLog` if needed.

---

## Options

| Option | Type | Description |
|--------|------|-------------|
| `mongoUri` | string | MongoDB connection URI (required) |
| `databaseName` | string | Database name (default: `api_logs`) |
| `collectionName` | string | Collection name (default: `api_requests`) |
| `maskFields` | string[] | Fields to mask (default: built-in list) |
| `logResponseBody` | boolean | Log response body (default: true) |
| `logRequestBody` | boolean | Log request body (default: true) |
| `logHeaders` | boolean | Log headers (default: true) |
| `logQuery` | boolean | Log query params (default: true) |
| `logParams` | boolean | Log URL params (default: true) |
| `getUserInfo` | function | Extract user info from request |
| `includeRoutes` | RegExp[] | Only log matching routes |
| `excludeRoutes` | RegExp[] | Exclude matching routes |
| `includeMethods` | string[] | Only log these methods |
| `excludeMethods` | string[] | Exclude these methods |
| `minStatusCode` | number | Min status code to log |
| `maxStatusCode` | number | Max status code to log |
| `logErrorsOnly` | boolean | Only log status >= 400 |
| `shouldLog` | function | Custom predicate (req, res) |
| `transformLog` | function | Transform entry before saving |
| `shouldLogEntry` | function | For standalone: filter prebuilt entry |

Exports: `validateLoggerOptions(options)`, `DEFAULT_MASK_FIELDS`.

---

## Log schema example

```json
{
  "url": "/api/users",
  "method": "POST",
  "request": { "headers": {}, "body": {}, "query": {}, "params": {} },
  "response": { "statusCode": 200, "body": {} },
  "user": { "id": "1234", "email": "user@example.com" },
  "createdAt": "2025-07-01T10:00:00Z",
  "durationMs": 145,
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0 ..."
}
```

---

## Querying logs

Example MongoDB queries:

```javascript
// Failed requests
db.api_audit.find({ "response.statusCode": { $gte: 400 } });

// Slow requests (>1s)
db.api_audit.find({ durationMs: { $gt: 1000 } });

// By user
db.api_audit.find({ "user.id": "1234" });

// Last hour
db.api_audit.find({ createdAt: { $gte: new Date(Date.now() - 60*60*1000) } });

// Aggregate by endpoint
db.api_audit.aggregate([
  { $group: { _id: "$url", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

---

## Learn more

A more detailed walkthrough of API logging, audit use cases, and how this middleware fits in (Express, NestJS, and standalone) is available in the post [Node.js API logging middleware: log, audit and debug with ease](https://www.techbreeze.in/node-js-api-logging-middleware-log-audit-and-debug-with-ease/).

---

## Footer

**Install:** `npm install api-logger-mongodb`

**Minimal usage:**

```ts
import { apiLoggerExpress } from 'api-logger-mongodb';
app.use(apiLoggerExpress({ mongoUri: process.env.MONGO_URI, databaseName: 'logs', collectionName: 'api' }));
```

**License:** [MIT](https://opensource.org/licenses/MIT)

**Author:** Sayantan Roy

If this package helped you, consider [starring the repo](https://github.com/rick001/api-logger-mongodb).
