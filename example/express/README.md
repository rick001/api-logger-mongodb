# Express middleware example

Uses `apiLoggerExpress` to log all API requests and responses to MongoDB.

## Run

From the repo root (build the package first):

```bash
npm run build
node example/express/server.js
```

Or with env vars:

```bash
MONGO_URI=mongodb://localhost:27017 PORT=3000 node example/express/server.js
```

## Try

- `GET http://localhost:3000/health`
- `GET http://localhost:3000/api/users`
- `POST http://localhost:3000/api/login` with body `{ "email": "user@example.com", "password": "secret" }` (password is masked in logs)

Logs are written to the `api_logger_example.express_logs` collection.
