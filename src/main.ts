import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpLogger } from './common/middleware/http-logger.middleware';

async function bootstrap() {
  const logger = new Logger('Foundation-HR');
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const configService = app.get(ConfigService);

  const allowedOrigins = (configService.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    // allowedHeaders: ['Content-Type', 'Authorization', 'workspace'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = configService.get('PORT');
  app.setGlobalPrefix('api/v2');
  app.use(new HttpLogger().use);

  // port
  await app.listen(port, () => logger.log(`App running on Port: ${port}`));
}
bootstrap();
