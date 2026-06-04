import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recommendation } from './recommendation.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(Recommendation)
    private recRepo: Repository<Recommendation>,
    private redisService: RedisService,
  ) {}

  // แพทย์สร้างคำแนะนำ
  async create(data: {
    assessmentId: string;
    doctorId: string;
    parentId: string;
    content: string;
    mediaUrl?: string;
  }) {
    const rec = this.recRepo.create(data);
    await this.recRepo.save(rec);

    // แจ้งเตือนผู้ปกครองว่ามีคำแนะนำใหม่
    await this.redisService.publish('recommendation.sent', {
      recommendationId: rec.id,
      parentId: data.parentId,
      doctorId: data.doctorId,
    });

    return rec;
  }

  // ดูคำแนะนำทั้งหมดของ parent
  findByParent(parentId: string) {
    return this.recRepo.find({
      where: { parentId },
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
