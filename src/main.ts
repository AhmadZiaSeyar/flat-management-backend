import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || !allowedOrigins.length) {
        callback(null, true);
        return;
      }

      callback(null, isOriginAllowed(origin, allowedOrigins));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

function parseAllowedOrigins(value?: string) {
  return [...DEFAULT_ALLOWED_ORIGINS, ...(value ?? '').split(',')]
    .map((item) => item.trim())
    .filter(Boolean);
}

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19006',
  'https://*.vercel.app',
];

function isOriginAllowed(origin: string, allowedOrigins: string[]) {
  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === '*') {
      return true;
    }

    if (allowedOrigin.includes('*')) {
      return matchesWildcardOrigin(origin, allowedOrigin);
    }

    return origin === allowedOrigin;
  });
}

function matchesWildcardOrigin(origin: string, pattern: string) {
  try {
    const originUrl = new URL(origin);
    const patternUrl = new URL(pattern.replace('*.', 'placeholder.'));

    if (originUrl.protocol !== patternUrl.protocol) {
      return false;
    }

    const expectedHostSuffix = patternUrl.host.replace('placeholder.', '.');

    return originUrl.host.endsWith(expectedHostSuffix);
  } catch {
    return false;
  }
}
