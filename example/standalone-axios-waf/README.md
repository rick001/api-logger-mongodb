# Standalone Axios WAF Example

This example demonstrates an outbound-client pattern:

- `StandaloneApiLogger` + `createAxiosLogger(...)` for request/response audit logs
- a lightweight preflight policy that soft-blocks suspicious payloads before sending
- storing blocked attempt metadata in MongoDB

## Run

From the repository root:

```bash
npm run build
node example/standalone-axios-waf/client.js
```

Optional environment variables:

- `MONGO_URI` (default: `mongodb://localhost:27017`)

## What it does

1. Sends one safe request to `https://httpbin.org/get`.
2. Attempts one suspicious request (`' OR 1=1 --`) that is blocked locally.
3. Logs both events into MongoDB collection `axios_waf_demo_logs`.
