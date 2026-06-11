import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Child } from './children/child.entity';
import { Assessment } from './assessments/assessment.entity';
import { Recommendation } from './recommendations/recommendation.entity';
import { RedisService } from './redis/redis.service';
import { FollowupScheduler } from './followup/followup.scheduler';
import { StorageModule } from './storage/storage.module';
import { ChildrenController } from './children/children.controller';
import { ChildrenService } from './children/children.service';
import { AssessmentsController } from './assessments/assessments.controller';
import { AssessmentsService } from './assessments/assessments.service';
import { RecommendationsController } from './recommendations/recommendations.controller';
import { RecommendationsService } from './recommendations/recommendations.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Child, Assessment, Recommendation],
      // ⚠️ สร้างตารางอัตโนมัติ — ปิดใน production ด้วย DB_SYNC=false แล้วใช้ migration แทน
      synchronize: process.env.DB_SYNC !== 'false',
    }),

    TypeOrmModule.forFeature([Child, Assessment, Recommendation]),
    StorageModule,
  ],
  controllers: [ChildrenController, AssessmentsController, RecommendationsController],
  providers: [ChildrenService, AssessmentsService, RecommendationsService, RedisService, FollowupScheduler],
})
export class AppModule {}
