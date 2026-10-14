import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Subimos el límite del body: las fotos de usuario viajan como data URL (base64)
  // y superan el default de 100 kB de Express (si no, la petición se rechaza con 413).
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

  // Validación automática de DTOs (reemplaza las validaciones manuales de WinForms).
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // CORS para que la app web (Next.js) y la caja (Electron) consuman la API.
  app.enableCors();

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API POS escuchando en http://localhost:${port}`);
}

bootstrap();
