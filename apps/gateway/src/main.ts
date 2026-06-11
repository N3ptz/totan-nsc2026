import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require('express');
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  // จำกัด origin เฉพาะหน้าเว็บของเรา (ตั้งเพิ่มผ่าน WEB_ORIGIN คั่นด้วย comma)
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:3100')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚪 API Gateway running on port ${port}`);
}
bootstrap();
