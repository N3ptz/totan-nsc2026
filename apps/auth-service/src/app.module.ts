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
      synchronize: true, // ⚠️ dev เท่านั้น — สร้างตารางอัตโนมัติ
    }),

    AuthModule,
  ],
})
export class AppModule {}
