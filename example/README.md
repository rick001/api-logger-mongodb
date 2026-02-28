# Examples

This folder contains runnable examples for **api-logger-mongodb** in three modes:

| Example | Description |
|--------|-------------|
| [**express**](./express) | Express middleware – logs incoming API requests/responses to MongoDB |
| [**nestjs**](./nestjs) | NestJS middleware – same as Express but in a NestJS app |
| [**standalone**](./standalone) | Standalone axios – logs **outbound** HTTP requests (e.g. axios calls) to MongoDB |

## Prerequisites

- **MongoDB** running (e.g. `mongodb://localhost:27017`) or set `MONGO_URI`
- **Root package built**: from repo root run `npm run build` before running any example

## Quick run

```bash
# From repo root
npm run build

# Express (no extra install)
node example/express/server.js

# NestJS (install deps in example first)
cd example/nestjs && npm install && npm run build && npm start

# Standalone axios (install deps in example first)
cd example/standalone && npm install && npm start
```

See each subfolder’s README for details.
