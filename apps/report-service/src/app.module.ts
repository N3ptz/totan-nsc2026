import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // TODO: RedisModule (subscribe assessment.completed)
    // TODO: ReportModule (Puppeteer PDF generation)
    // TODO: StorageModule (upload PDF to Object Storage)
  ],
})
export class AppModule {}
