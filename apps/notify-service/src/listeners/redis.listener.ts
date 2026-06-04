import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisListener implements OnModuleInit {
  private subscriber: Redis;
  private readonly logger = new Logger(RedisListener.name);

  onModuleInit() {
    this.subscriber = new Redis(process.env.REDIS_URL);

    // Subscribe ทุก event ที่ต้องการ
    this.subscriber.subscribe(
      'assessment.completed',
      'recommendation.sent',
      'followup.due',
    );

    this.subscriber.on('message', (channel, message) => {
      const data = JSON.parse(message);
      this.logger.log(`📬 Received [${channel}]`);

      switch (channel) {
        case 'assessment.completed':
          this.onAssessmentCompleted(data);
          break;
        case 'recommendation.sent':
          this.onRecommendationSent(data);
          break;
        case 'followup.due':
          this.onFollowupDue(data);
          break;
      }
    });
  }

  // แจ้งเตือนแพทย์และผู้ปกครองว่าผลการประเมินเสร็จแล้ว
  private async onAssessmentCompleted(data: {
    assessmentId: string;
    childId: string;
    doctorId: string;
  }) {
    this.logger.log(`📧 Sending "assessment completed" email for ${data.assessmentId}`);
    // TODO: ใช้ @nestjs/mailer ส่ง email จริงๆ
    // await this.mailService.send({ to: doctorEmail, subject: 'ผลการประเมินเสร็จแล้ว', ... })
  }

  // แจ้งเตือนผู้ปกครองว่ามีคำแนะนำใหม่จากแพทย์
  private async onRecommendationSent(data: {
    recommendationId: string;
    parentId: string;
  }) {
    this.logger.log(`🔔 Push notification to parent ${data.parentId}`);
    // TODO: ใช้ firebase-admin ส่ง push notification
  }

  // แจ้งเตือนว่าถึงกำหนดติดตามผล
  private async onFollowupDue(data: {
    assessmentId: string;
    parentId: string;
  }) {
    this.logger.log(`⏰ Followup due reminder for assessment ${data.assessmentId}`);
    // TODO: ส่ง email/push แจ้งเตือนผู้ปกครองให้ติดต่อสถานพยาบาล
  }
}
