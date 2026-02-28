# Examples

This folder contains runnable examples for **api-logger-mongodb** in three ways:

| Example | Description |
|--------|-------------|
| [**express**](./express) | **Express middleware** – log incoming API requests/responses to MongoDB |
| [**nestjs**](./nestjs) | **NestJS middleware** – same in a NestJS app (via `app.use()` or `MiddlewareConsumer`) |
| [**standalone**](./standalone) | **Standalone Axios** – log **outbound** HTTP requests (e.g. axios) to MongoDB; no server needed |

## Prerequisites

- **MongoDB** running (e.g. `mongodb://localhost:27017`) or set `MONGO_URI`
- **Root package built**: from repo root run `npm run build` before running any example

## Quick run

```bash
# 1. Build the package (from repo root)
npm run build

# 2a. Express – no extra install
node example/express/server.js

# 2b. NestJS – install and run from example folder
cd example/nestjs && npm install && npm run build && npm start

# 2c. Standalone Axios – install and run from example folder
cd example/standalone && npm install && npm start
```

- **Express** and **NestJS** log **incoming** requests to your server.
- **Standalone** logs **outbound** requests made by your app (e.g. axios to external APIs).

See each subfolder’s README for details and sample requests.
