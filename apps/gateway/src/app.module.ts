import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // TODO: ProxyModule, AuthGuard, RateLimitModule
  ],
})
export class AppModule {}
