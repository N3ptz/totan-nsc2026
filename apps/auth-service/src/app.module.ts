import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { User } from './users/user.entity';
import { Doctor } from './users/doctor.entity';
import { Parent } from './users/parent.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // เชื่อม PostgreSQL
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Doctor, Parent],
      // ⚠️ สร้างตารางอัตโนมัติ — ปิดใน production ด้วย DB_SYNC=false แล้วใช้ migration แทน
      synchronize: process.env.DB_SYNC !== 'false',
    }),

    AuthModule,
  ],
})
export class AppModule {}
