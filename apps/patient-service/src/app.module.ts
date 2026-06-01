import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // TODO: TypeOrmModule, ChildrenModule, AssessmentModule, RedisModule
  ],
})
export class AppModule {}
