import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response envelope interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Xeno AI Decisioning Platform')
    .setDescription(
      'AI-native Customer Intelligence and Decisioning Platform API.\n\n' +
        '**Architecture**: Identity → Behavior → Intelligence → Decision → Execution → Outcome → Learning\n\n' +
        '**Auth**: All endpoints require `Authorization: Bearer <token>` and `x-tenant-id` header.\n' +
        'Use `/api/v1/auth/login` to obtain tokens.',
    )
    .setVersion('0.2.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'x-tenant-id', in: 'header' },
      'tenant-id',
    )
    .addTag('Health', 'System health checks')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Customers', 'Customer management and sub-resources')
    .addTag('Products', 'Product catalog management')
    .addTag('Product Categories', 'Product category hierarchy')
    .addTag('Orders', 'Order management')
    .addTag('Customer Product Affinities', 'Customer-product affinity scores')
    .addTag(
      'Intelligence',
      'Customer Intelligence Engine — 360 views, features, personas, segments',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Xeno Platform running on: http://localhost:${port}`);
  logger.log(`📚 Swagger API docs: http://localhost:${port}/api`);
  logger.log(`🌍 Environment: ${process.env.APP_ENV || 'development'}`);
}

bootstrap();
