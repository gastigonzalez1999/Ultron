import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Validate critical environment variables
  const requiredEnvVars = [
    'PAYDOCK_LOCAL_API_KEY',
    'PAYDOCK_STAGING_API_KEY',
  ];

  const missingVars: string[] = [];
  for (const envVar of requiredEnvVars) {
    if (!configService.get<string>(envVar)) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    logger.warn(`Missing environment variables: ${missingVars.join(', ')}`);
    logger.warn('Some features may not work correctly. Please check backend/.env file.');
  }

  // Check for OpenAI API key (optional but recommended)
  if (!configService.get<string>('OPENAI_API_KEY')) {
    logger.warn('OPENAI_API_KEY not set - AI features will be disabled');
  }

  // Enable CORS for frontend
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  logger.log(`Ultron Backend running on http://localhost:${port}`);
  logger.log(`CORS enabled for: ${corsOrigin}`);
}
bootstrap();
