import basicAuth from 'express-basic-auth';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication, Logger } from '@nestjs/common';
import { configureApp } from '@common/configure-app';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@modules/app/app.module';
import { join } from 'path';
import express from 'express';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap(): Promise<{ port: number }> {
  /**
   * Create NestJS application
   */
  const app: INestApplication = await NestFactory.create(AppModule, {
    cors: true,
    bodyParser: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app));

  const configService: ConfigService<any, boolean> = app.get(ConfigService);
  const appConfig = configService.get('app');
  const swaggerConfig = configService.get('swagger');

  {
    /**
     * loggerLevel: 'error' | 'warn' | 'log' | 'verbose' | 'debug' | 'silly';
     * https://docs.nestjs.com/techniques/logger#log-levels
     */
    const options = appConfig.loggerLevel;
    app.useLogger(options);
  }

  configureApp(app);

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/api/v1/uploads', express.static(uploadsDir));

  {
    /**
     * Setup Swagger API documentation
     * https://docs.nestjs.com/openapi/introduction
     */
    app.use(
      ['/docs'],
      basicAuth({
        challenge: true,
        users: {
          admin: swaggerConfig.password,
        },
      }),
    );

    const options: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
      .setTitle('Api for KingCoin')
      .setDescription('Starter API v1')
      .setVersion('1.0')
      .addBearerAuth({ in: 'header', type: 'http' })
      .build();
    const document: OpenAPIObject = SwaggerModule.createDocument(app, options);

    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        // If set to true, it persists authorization data,
        // and it would not be lost on browser close/refresh
        persistAuthorization: true,
      },
    });
  }

  await app.listen(appConfig.port);

  return appConfig;
}

bootstrap()
  .then((appConfig) => {
    Logger.log(`Running in http://localhost:${appConfig.port}`, 'Bootstrap');
  })
  .catch((err) => {
    Logger.error(err?.stack ?? err, 'Bootstrap');
    process.exit(1);
  });
