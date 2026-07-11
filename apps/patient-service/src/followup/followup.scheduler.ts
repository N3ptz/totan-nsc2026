import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Assessment } from '../assessments/assessment.entity';
import { Child } from '../children/child.entity';
import { RedisService } from '../redis/redis.service';

/**
 * สแกนหา assessment ที่ถึงกำหนดนัดติดตามผล "วันนี้" แล้ว publish event `followup.due`
 * ให้ notify-service ส่งแจ้งเตือน — เช็คตอน boot และทุก 12 ชั่วโมง
 * (ใช้ setInterval ธรรมดา ไม่เพิ่ม dependency; ถ้า restart ระหว่างวันอาจแจ้งซ้ำได้)
 */
@Injectable()
export class FollowupScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FollowupScheduler.name);
  private timer: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(Assessment) private assessmentRepo: Repository<Assessment>,
    @InjectRepository(Child) private childRepo: Repository<Child>,
    private redisService: RedisService,
  ) {}

  onModuleInit() {
    // หน่วงหลัง boot ให้ DB/Redis พร้อมก่อน
    setTimeout(() => this.checkDueFollowups().catch((e) => this.logger.warn(e.message)), 30_000);
    this.timer = setInterval(
      () => this.checkDueFollowups().catch((e) => this.logger.warn(e.message)),
      12 * 60 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async checkDueFollowups() {
    const today = new Date().toISOString().slice(0, 10);
    const due = await this.assessmentRepo.find({
      // เตือนเฉพาะเคสที่แพทย์กดส่งผลให้ผู้ปกครองแล้ว — listener ฝั่ง notify ส่งเมลหาผู้ปกครองเท่านั้น
      // ถ้าแพทย์แค่ตั้งวันนัดไว้เอง (ยังไม่ปล่อยผล) ผู้ปกครองต้องไม่ได้รับเมลถึงนัดที่ตัวเองไม่รู้จัก
      where: { nextFollowupDate: today as any, parentNotifiedAt: Not(IsNull()) },
    });

    for (const a of due) {
      const child = await this.childRepo.findOne({ where: { id: a.childId } });
      await this.redisService.publish('followup.due', {
        assessmentId: a.id,
        childId: a.childId,
        doctorId: a.doctorId,
        parentId: child?.parentId ?? null,
        childName: child?.name ?? null,
        date: today,
      });
    }

    if (due.length > 0) {
      this.logger.log(`📅 Published followup.due สำหรับ ${due.length} รายการ`);
    }
  }
}
