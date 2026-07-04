import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisListener } from './listeners/redis.listener';
import { EmailService } from './email/email.service';
import { UsersClient } from './users/users.client';
import { HealthController } from './health/health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
  providers: [RedisListener, EmailService, UsersClient],
})
export class AppModule {}
