import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createApiLoggerMiddleware } from 'api-logger-mongodb';

const loggerOptions = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  databaseName: 'api_logger_example',
  collectionName: 'nestjs_logs',
  maskFields: ['password', 'token'],
  logResponseBody: true,
  logRequestBody: true,
  getUserInfo: (req: any) => {
    const user = req.user;
    return user ? { id: user.id, email: user.email, role: user.role } : undefined;
  },
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(createApiLoggerMiddleware(loggerOptions));
  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  console.log(`NestJS example listening on http://localhost:${port}`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
