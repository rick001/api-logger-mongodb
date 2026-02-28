const axios = require('axios');
const {
  StandaloneApiLogger,
  createAxiosLogger,
  normalizeLoggerOptions,
  validateLoggerOptions
} = require('../../dist');

const loggerOptions = normalizeLoggerOptions({
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  databaseName: 'api_logger_examples',
  collectionName: 'axios_waf_demo_logs',
  maskAllowList: ['body.email'],
  logRequestBody: true,
  logResponseBody: true,
  persistenceMode: 'async'
});

validateLoggerOptions(loggerOptions);

const logger = new StandaloneApiLogger(loggerOptions);
const axiosLogger = createAxiosLogger(logger, () => ({
  id: 'demo-client',
  role: 'service'
}));

// Simple outbound policy check. This demonstrates a "soft-block before send"
// pattern for non-Express clients.
function evaluateOutboundPolicy(config) {
  const url = String(config.url || '');
  const body = JSON.stringify(config.data || {});
  const hasSqli = /(\bor\b\s+1=1|union\s+select|--)/i.test(url + ' ' + body);
  const hasXss = /<\s*script|javascript:/i.test(url + ' ' + body);

  if (hasSqli || hasXss) {
    return {
      blocked: true,
      reason: hasSqli ? 'Outbound SQLi-like payload detected' : 'Outbound XSS-like payload detected',
      statusCode: 403
    };
  }

  return { blocked: false };
}

async function requestInterceptor(config) {
  const decision = evaluateOutboundPolicy(config);
  if (!decision.blocked) {
    return axiosLogger.request(config);
  }

  // Audit blocked outbound attempt into MongoDB.
  await logger.logRequest(
    config.url || 'unknown-url',
    (config.method || 'GET').toUpperCase(),
    {
      headers: config.headers || {},
      body: config.data || {},
      query: config.params || {}
    },
    {
      statusCode: decision.statusCode,
      body: {
        blocked: true,
        reason: decision.reason
      }
    },
    { id: 'demo-client', role: 'service' },
    0
  );

  const error = new Error(`Request blocked by outbound policy: ${decision.reason}`);
  error.name = 'OutboundPolicyError';
  throw error;
}

async function runDemo() {
  await logger.init();

  axios.interceptors.request.use(requestInterceptor);
  axios.interceptors.response.use(axiosLogger.response, axiosLogger.error);

  try {
    const ok = await axios.get('https://httpbin.org/get', {
      params: { page: 1 }
    });
    console.log('Safe request status:', ok.status);
  } catch (error) {
    console.error('Safe request failed:', error.message);
  }

  try {
    await axios.get('https://httpbin.org/get', {
      params: { search: "' OR 1=1 --" }
    });
  } catch (error) {
    console.error('Blocked request:', error.message);
  }

  await logger.close();
  console.log('Standalone Axios WAF demo completed.');
}

runDemo().catch(async (error) => {
  console.error('Demo failed:', error);
  await logger.close();
  process.exit(1);
});
