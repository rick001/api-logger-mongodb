# Standalone (Axios) example

Uses `StandaloneApiLogger` and `createAxiosLogger` to log **outbound** HTTP requests made with axios to MongoDB. No Express or NestJS required.

## Run

From the repo root, build the main package then run the example:

```bash
npm run build
cd example/standalone
npm install
npm start
```

With env:

```bash
MONGO_URI=mongodb://localhost:27017 npm start
```

The script sends a GET and a POST to `https://httpbin.org`; both requests (and responses) are logged to MongoDB. Sensitive fields like `password` are masked. Logs are written to the `api_logger_example.standalone_logs` collection.

## Manual logging

For fetch or other HTTP clients, use `logger.logRequest()` after each call. See the main package README “Standalone (Axios, Fetch, etc.)” section.
