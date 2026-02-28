# NestJS middleware example

Uses `createApiLoggerMiddleware` to log all API requests and responses to MongoDB. Middleware is applied with `app.use()` in `main.ts`. Alternatively, you can use `NestModule` and `MiddlewareConsumer` (see below).

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

## Alternative: apply via NestModule

Instead of `app.use(createApiLoggerMiddleware(...))` in `main.ts`, you can apply the middleware in `AppModule` with `MiddlewareConsumer`:

```ts
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { createApiLoggerMiddleware } from 'api-logger-mongodb';

@Module({
  imports: [],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(createApiLoggerMiddleware({
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
      }))
      .forRoutes('*'); // or .forRoutes('api/*') to limit to certain routes
  }
}
```

Then remove the `app.use(createApiLoggerMiddleware(...))` call from `main.ts`. This approach is useful when you want route-specific logging or to keep middleware configuration in the module.
