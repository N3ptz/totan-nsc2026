import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtMiddleware } from './middleware/jwt.middleware';
import { ProxyController } from './proxy/proxy.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      useFactory: () => ({ secret: process.env.JWT_SECRET }),
    }),
  ],
  controllers: [ProxyController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // ใช้ JWT middleware กับทุก route
    consumer.apply(JwtMiddleware).forRoutes('*');
  }
}
