/**
 * Standalone axios example – logs outbound HTTP requests to MongoDB
 * Run from repo root: npm run build && cd example/standalone && npm install && npm start
 * Or from example/standalone: npm install && node run.js (requires parent dist/)
 */
const axios = require('axios');
const { StandaloneApiLogger, createAxiosLogger } = require('../../dist');

const options = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  databaseName: 'api_logger_example',
  collectionName: 'standalone_logs',
  maskFields: ['password', 'token'],
  logResponseBody: true,
  logRequestBody: true,
};

async function main() {
  const logger = new StandaloneApiLogger(options);
  await logger.init();

  const axiosLogger = createAxiosLogger(logger, () => ({
    id: 'standalone-user',
    email: 'standalone@example.com',
  }));

  axios.interceptors.request.use(axiosLogger.request);
  axios.interceptors.response.use(axiosLogger.response, axiosLogger.error);

  console.log('Making logged requests...');

  try {
    const getRes = await axios.get('https://httpbin.org/get', { params: { foo: 'bar' } });
    console.log('GET response status:', getRes.status);
  } catch (err) {
    console.log('GET error (may be network):', err.message);
  }

  try {
    const postRes = await axios.post('https://httpbin.org/post', {
      name: 'John',
      email: 'john@example.com',
      password: 'secret',
    });
    console.log('POST response status:', postRes.status);
  } catch (err) {
    console.log('POST error (may be network):', err.message);
  }

  await logger.close();
  console.log('Done. Check api_logger_example.standalone_logs in MongoDB.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
