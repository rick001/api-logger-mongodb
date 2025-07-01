# api-logger-mongodb

A comprehensive API logging middleware for Node.js applications (Express, NestJS, etc.) that logs requests and responses to MongoDB for auditing and debugging.

## Features
- Logs API URL, method, request/response data, status, user info, timestamps, and duration
- Mask sensitive fields (e.g., password, token)
- Configurable via options (MongoDB URI, collection, etc.)
- Express middleware (NestJS module coming soon)
- TypeScript support

## Installation
```bash
npm install api-logger-mongodb
```

## Usage (Express)
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

app.listen(3000);
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

## License
MIT 