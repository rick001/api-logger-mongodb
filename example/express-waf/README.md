# Express WAF Example

This example shows how to use the package with:

- `apiLoggerExpress(...)`
- WAF soft-block mode
- managed rule selection via `getManagedRules(...)`
- config validation via `validateLoggerOptions(...)`
- metrics endpoint using middleware `getWafMetrics()`

## Run

From the repository root:

```bash
npm run build
node example/express-waf/server.js
```

Optional environment variables:

- `MONGO_URI` (default: `mongodb://localhost:27017`)
- `PORT` (default: `3001`)
- `WAF_MODE` (`detect`, `soft-block`, or `block`; default: `soft-block`)

## Try It

Safe request:

```bash
curl "http://localhost:3001/users"
```

Likely blocked request (SQLi pattern):

```bash
curl "http://localhost:3001/users?search=' OR 1=1 --"
```

See WAF metrics:

```bash
curl "http://localhost:3001/metrics/waf"
```
