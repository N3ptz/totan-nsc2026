import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // fail-fast: ไม่มี secret = endpoint ภายใน (ai-result/upload-heatmap) เปิดโล่ง
  if (!process.env.INTERNAL_SECRET) {
    throw new Error('INTERNAL_SECRET ยังไม่ได้ตั้งค่า — copy .env.example เป็น .env แล้วกรอกก่อนรัน');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require('express');
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors();
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`👶 Patient Service running on port ${port}`);
}
bootstrap();
