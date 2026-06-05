import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Child } from './children/child.entity';
import { Assessment } from './assessments/assessment.entity';
import { Recommendation } from './recommendations/recommendation.entity';
import { RedisService } from './redis/redis.service';
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
      synchronize: true,
    }),

    TypeOrmModule.forFeature([Child, Assessment, Recommendation]),
    StorageModule,
  ],
  controllers: [ChildrenController, AssessmentsController, RecommendationsController],
  providers: [ChildrenService, AssessmentsService, RecommendationsService, RedisService],
})
export class AppModule {}
