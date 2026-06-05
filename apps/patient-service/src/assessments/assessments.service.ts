import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment, AssessmentStatus } from './assessment.entity';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { RedisService } from '../redis/redis.service';
import { Child } from '../children/child.entity';

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    @InjectRepository(Assessment)
    private assessmentRepo: Repository<Assessment>,
    @InjectRepository(Child)
    private childRepo: Repository<Child>,
    private redisService: RedisService,
  ) {}

  // สร้าง assessment ใหม่ (แพทย์อัปโหลด X-ray)
  async create(dto: CreateAssessmentDto, doctorId: string) {
    const assessment = this.assessmentRepo.create({
      ...dto,
      doctorId,
      status: AssessmentStatus.PENDING,
    });
    await this.assessmentRepo.save(assessment);

    // Fire-and-forget: ส่งงานให้ AI service (non-blocking)
    const child = await this.childRepo.findOne({ where: { id: dto.childId } });
    this._callAiService(assessment, child).catch(
      (err) => this.logger.warn(`AI service call failed (non-fatal): ${err.message}`),
    );

    return assessment;
  }

  private async _callAiService(assessment: Assessment, child: Child | null): Promise<void> {
    const aiUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

    await this.assessmentRepo.update(assessment.id, { status: AssessmentStatus.PROCESSING });

    const response = await fetch(`${aiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: assessment.id,
        xrayImageUrl: assessment.xrayImageUrl,
        sex: child?.sex ?? 'M',
        dateOfBirth: child?.dateOfBirth ?? null,
        heightCm: assessment.heightCm ?? null,
        weightKg: assessment.weightKg ?? null,
        fatherHeightCm: child?.fatherHeightCm ?? null,
        motherHeightCm: child?.motherHeightCm ?? null,
      }),
    });

    if (!response.ok) {
      await this.assessmentRepo.update(assessment.id, { status: AssessmentStatus.FAILED });
      throw new Error(`AI service responded with ${response.status}`);
    }
  }

  // AI เรียก endpoint นี้เพื่อบันทึกผล
  async saveAiResult(
    assessmentId: string,
    result: {
      boneAgeMonths: number;
      confidence: number;
      heatmapUrl: string;
      finalAdultHeightCm: number;
      targetHeightCm: number;
      heightPercentile: number;
      weightPercentile: number;
      bmi: number;
      bmiPercentile: number;
      heightSdScore: number;
      riskFlag: string;
    },
  ) {
    await this.assessmentRepo.update(assessmentId, {
      ...result,
      status: AssessmentStatus.COMPLETED,
    });

    const assessment = await this.assessmentRepo.findOne({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('ไม่พบข้อมูลการประเมิน');

    // Publish event ให้ report-service และ notify-service รับ (non-blocking)
    this.redisService.publish('assessment.completed', {
      assessmentId,
      childId: assessment.childId,
      doctorId: assessment.doctorId,
    }).catch((err) => this.logger.warn(`Redis publish failed (non-fatal): ${err.message}`));

    return assessment;
  }

  // ดูผลการประเมินทั้งหมดของเด็กคนนึง
  findByChild(childId: string) {
    return this.assessmentRepo.find({
      where: { childId },
      order: { createdAt: 'DESC' },
    });
  }

  // ดูรายละเอียดผลการประเมิน
  async findOne(id: string) {
    const assessment = await this.assessmentRepo.findOne({ where: { id } });
    if (!assessment) throw new NotFoundException('ไม่พบข้อมูลการประเมิน');
    return assessment;
  }

  // ── Mock AI (demo only) — delegate ให้ AI service เหมือน flow จริง ──
  async mockAiResult(id: string) {
    const assessment = await this.findOne(id);
    const child = await this.childRepo.findOne({ where: { id: assessment.childId } });
    if (!child) throw new NotFoundException('ไม่พบข้อมูลเด็ก');
    await this._callAiService(assessment, child);
    return assessment;
  }

  // บันทึก follow-up date
  async setFollowup(id: string, date: Date, notes?: string) {
    await this.assessmentRepo.update(id, {
      nextFollowupDate: date,
      followupNotes: notes,
    });
    return this.findOne(id);
  }
}
