import './instrument';
import 'reflect-metadata';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import type { EnvConfig } from './config/env.validation';
import { LOCAL_UPLOADS_DIR } from './modules/uploads/local-disk-image-uploader';

// Body parser padrão do Express aceita só 100kb — pequeno demais para o
// Provador Digital (Módulo 7), que envia a foto do cliente como data URL no
// corpo JSON. `bodyParser: false` + registro manual abaixo é a forma
// suportada de aumentar esse limite sem duplicar o parser que o Nest já
// registraria sozinho.
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.use(json({ limit: '4mb' }));
  app.use(urlencoded({ extended: true, limit: '4mb' }));
  const config = app.get(ConfigService<EnvConfig, true>);

  const trustProxyHops = config.get('TRUST_PROXY_HOPS', { infer: true });
  if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);

  app.use(helmet());
  // Imagens enviadas pelo painel sem Cloudinary (só em desenvolvimento —
  // ver `LocalDiskImageUploader`). `cross-origin` porque o site (outra
  // porta) exibe essas imagens; o padrão do helmet (`same-origin`) faria o
  // navegador bloquear a prévia no formulário do admin.
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    app.useStaticAssets(join(process.cwd(), LOCAL_UPLOADS_DIR), {
      prefix: '/uploads/',
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    });
  }
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors({
    origin: config.get('CORS_ALLOWED_ORIGINS', { infer: true }).split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  Logger.log(`ASN Supply API rodando em http://localhost:${port}`, 'Bootstrap');
  if (!config.get('INTERNAL_API_KEY', { infer: true })) {
    Logger.warn(
      'INTERNAL_API_KEY ausente — o limite de requisições vai tratar todos os visitantes do site como um só (a loja pode responder 429 com pouco movimento).',
      'Bootstrap',
    );
  }
}

bootstrap().catch((error: unknown) => {
  Logger.error(
    'Falha ao inicializar a aplicação',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
