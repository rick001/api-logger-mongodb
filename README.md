# api-logger-mongodb

A comprehensive API logging middleware for Node.js applications (Express, NestJS, etc.) that logs requests and responses to MongoDB for auditing and debugging.

## Features
-  Logs API URL, method, request/response data, status, user info, timestamps, and duration
-  Mask sensitive fields (e.g., password, token)
-  Configurable via options (MongoDB URI, collection, etc.)
-  Express middleware support
-  NestJS middleware support
-  TypeScript support
-  Filter by routes, methods, status codes
-  Custom user info extraction
-  Response body logging (configurable)

## Package exports

| Export | Description |
|--------|-------------|
| `apiLoggerExpress(options)` | Express middleware factory |
| `createApiLoggerMiddleware(options)` | NestJS-compatible middleware factory (use with `app.use()` or `MiddlewareConsumer`) |
| `createApiLoggerModule(options)` | NestJS module factory (options only) |
| `StandaloneApiLogger` | Class for logging outbound HTTP requests (e.g. axios) |
| `createAxiosLogger(logger, getUserInfo?)` | Axios request/response/error interceptor factory for `StandaloneApiLogger` |
| `ApiLogger` | Core logger class (used by middleware and standalone) |
| `validateLoggerOptions(options)` | Validates options; throws if invalid (e.g. missing `mongoUri`) |
| `DEFAULT_MASK_FIELDS` | Built-in list of field names that are masked when `maskFields` is not set |
| `ApiLoggerNestMiddleware`, `ApiLoggerModule` | Legacy aliases for NestJS middleware/module factories |

Types: `ApiLoggerOptions`, `ApiLogEntry`, `ApiLoggerInstance` (and others from `./types`).

## Installation

Requires **Node.js 16.20.1 or later** (same as the [MongoDB Node driver](https://www.npmjs.com/package/mongodb)). Install from [npm](https://www.npmjs.com/package/api-logger-mongodb):

```bash
npm install api-logger-mongodb
```

Or install from GitHub:

```bash
npm install git+https://github.com/rick001/api-logger-mongodb.git
```

## Examples

Runnable examples are in the [**example/**](./example) folder (in the repo only; not included in the npm package). They show the three ways to use the package:

| Example | Description |
|--------|-------------|
| [**express**](./example/express) | **Express middleware** – log incoming API requests/responses |
| [**nestjs**](./example/nestjs) | **NestJS middleware** – same in a Nest app (via `app.use()` or `MiddlewareConsumer`) |
| [**standalone**](./example/standalone) | **Standalone Axios** – log outbound HTTP requests; no server needed |

**Prerequisites:** Build the package from repo root (`npm run build`) and have MongoDB running (e.g. `mongodb://localhost:27017`) or set `MONGO_URI`.

**How to run (from repo root):**

```bash
# 1. Build the package once
npm run build

# 2a. Express – no extra install
node example/express/server.js

# 2b. NestJS – install deps and run from example folder
cd example/nestjs && npm install && npm run build && npm start

# 2c. Standalone Axios – install deps and run from example folder
cd example/standalone && npm install && npm start
```

- **Express** and **NestJS** log **incoming** requests to your server.
- **Standalone** logs **outbound** requests made by your app (e.g. axios to external APIs).

Full details and sample requests: [example/README.md](./example/README.md) and each subfolder's README.

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

### NestJS

Apply via `MiddlewareConsumer` (below) or with `app.use(createApiLoggerMiddleware(options))` in your `bootstrap()` (see [example/nestjs](./example/nestjs)).

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

## Production considerations

- **Secure default masking:** If you do not set `maskFields`, the logger uses a built-in list of sensitive field names (e.g. `password`, `token`, `authorization`). You can import `DEFAULT_MASK_FIELDS` from the package to inspect or extend it. Pass your own `maskFields` to override.
- **Fail-open behavior:** If MongoDB connection or middleware initialization fails, the middleware logs the error and calls `next()` so your app keeps running. Requests are not logged until the connection succeeds.
- **Standalone logging:** `StandaloneApiLogger` and `createAxiosLogger` use the same masking, filtering (`includeRoutes`, `excludeRoutes`, `logErrorsOnly`, etc.), and `transformLog` as the Express/NestJS middleware. Outbound requests are logged through the same pipeline.
- **Config validation:** Options are validated at construction. Invalid `mongoUri` (missing or blank) throws. You can call `validateLoggerOptions(options)` before creating the logger to fail fast.
- **Index creation:** If creating indexes on the log collection fails (e.g. permissions), the logger continues without them and logs a warning. Connection and logging still work.

- **Using with a separate WAF:** This package only logs requests; it does not block them. To audit WAF decisions, run your WAF middleware first, then this logger. You can attach WAF outcome to each log entry via `getUserInfo` or `transformLog` (e.g. read from `req` or `res.locals` and add a `waf` field to the entry).

## Options
| Option            | Type            | Description |
|-------------------|----------------|-------------|
| mongoUri          | string         | MongoDB connection URI (required) |
| databaseName      | string         | Database name (default: `api_logs`) |
| collectionName    | string         | Collection name (default: `api_requests`) |
| maskFields        | string[]       | Fields to mask in logs (default: built-in list; see `DEFAULT_MASK_FIELDS`) |
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
| shouldLogEntry    | function       | For standalone: custom function to decide if a prebuilt entry is logged |

You can also use the exported `validateLoggerOptions(options)` and `DEFAULT_MASK_FIELDS` from the package.

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