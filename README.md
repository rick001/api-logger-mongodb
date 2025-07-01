# api-logger-mongodb

A comprehensive API logging middleware for Node.js applications (Express, NestJS, etc.) that logs requests and responses to MongoDB for auditing and debugging.

## Features
- ✅ Logs API URL, method, request/response data, status, user info, timestamps, and duration
- ✅ Mask sensitive fields (e.g., password, token)
- ✅ Configurable via options (MongoDB URI, collection, etc.)
- ✅ Express middleware support
- ✅ NestJS middleware support
- ✅ TypeScript support
- ✅ Filter by routes, methods, status codes
- ✅ Custom user info extraction
- ✅ Response body logging (configurable)

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