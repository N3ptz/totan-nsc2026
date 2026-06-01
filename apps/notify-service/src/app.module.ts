import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // TODO: RedisModule (subscribe assessment.completed, followup.due, recommendation.sent)
    // TODO: MailModule (@nestjs/mailer + nodemailer)
    // TODO: PushModule (firebase-admin)
  ],
})
export class AppModule {}
