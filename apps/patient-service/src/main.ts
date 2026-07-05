import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import { mkdirSync } from 'fs';

async function bootstrap() {
  // fail-fast: ไม่มี secret = endpoint ภายใน (ai-result/upload-heatmap) เปิดโล่ง
  if (!process.env.INTERNAL_SECRET) {
    throw new Error('INTERNAL_SECRET ยังไม่ได้ตั้งค่า — copy .env.example เป็น .env แล้วกรอกก่อนรัน');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require('express');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors();

  // Serve local uploads folder as static files (used when Supabase is not configured)
  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`👶 Patient Service running on port ${port}`);
}
bootstrap();
