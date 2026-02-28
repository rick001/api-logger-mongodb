# NestJS middleware example

Uses `createApiLoggerMiddleware` to log all API requests and responses to MongoDB. Middleware is applied with `app.use()` in `main.ts` (you can also use `NestModule` and `configure(consumer)` for route-specific application).

## Run

From the repo root, build the main package and the example:

```bash
npm run build
cd example/nestjs
npm install
npm run build
npm start
```

Or run with ts-node (from `example/nestjs`):

```bash
npm install
npm run start:ts
```

With env vars:

```bash
MONGO_URI=mongodb://localhost:27017 PORT=3001 npm start
```

## Try

- `GET http://localhost:3001/health`
- `GET http://localhost:3001/api/users`
- `POST http://localhost:3001/api/login` with body `{ "email": "user@example.com", "password": "secret" }` (password is masked in logs)

Logs are written to the `api_logger_example.nestjs_logs` collection.
