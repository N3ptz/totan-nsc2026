import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisListener } from './listeners/redis.listener';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [RedisListener],
})
export class AppModule {}
