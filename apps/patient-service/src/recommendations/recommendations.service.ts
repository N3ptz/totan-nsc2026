import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recommendation } from './recommendation.entity';
import { Assessment } from '../assessments/assessment.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(Recommendation)
    private recRepo: Repository<Recommendation>,
    @InjectRepository(Assessment)
    private assessmentRepo: Repository<Assessment>,
    private redisService: RedisService,
  ) {}

  // แพทย์สร้างคำแนะนำ — ต้องเป็นเจ้าของ assessment นั้น
  async create(data: {
    assessmentId: string;
    doctorId: string;
    parentId: string;
    content: string;
    mediaUrl?: string;
  }) {
    const assessment = await this.assessmentRepo.findOne({ where: { id: data.assessmentId } });
    if (!assessment) throw new NotFoundException('ไม่พบข้อมูลการประเมิน');
    if (assessment.doctorId !== data.doctorId) {
      throw new ForbiddenException('ไม่มีสิทธิ์ส่งคำแนะนำสำหรับการประเมินนี้');
    }

    const rec = this.recRepo.create(data);
    await this.recRepo.save(rec);

    // แจ้งเตือนผู้ปกครองว่ามีคำแนะนำใหม่ (non-blocking — Redis ล่มไม่ควรทำให้บันทึกล้มเหลว)
    this.redisService.publish('recommendation.sent', {
      recommendationId: rec.id,
      parentId: data.parentId,
      doctorId: data.doctorId,
    }).catch(() => {});

    return rec;
  }

  // ดูคำแนะนำทั้งหมดของ parent
  findByParent(parentId: string) {
    return this.recRepo.find({
      where: { parentId },
      order: { createdAt: 'DESC' },
    });
  }

  // ดูคำแนะนำทั้งหมดที่แพทย์คนนี้ส่งไป
  findByDoctor(doctorId: string) {
    return this.recRepo.find({
      where: { doctorId },
      order: { createdAt: 'DESC' },
    });
  }

  // ดูคำแนะนำรายการเดียว
  async findOne(id: string) {
    const rec = await this.recRepo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException('ไม่พบคำแนะนำ');
    return rec;
  }

  // ผู้ปกครองกดอ่านแล้ว
  async markRead(id: string) {
    await this.recRepo.update(id, { isRead: true });
    return { success: true };
  }
}
