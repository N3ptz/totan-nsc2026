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
    return assessment;
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

  // ── Mock AI (demo only) ──────────────────────────────────
  async mockAiResult(id: string) {
    const assessment = await this.findOne(id);
    const child = await this.childRepo.findOne({ where: { id: assessment.childId } });
    if (!child) throw new NotFoundException('ไม่พบข้อมูลเด็ก');

    // คำนวณอายุจริงในหน่วยเดือน
    const dob = new Date(child.dateOfBirth);
    const now = new Date();
    const chronAgeMonths = (now.getFullYear() - dob.getFullYear()) * 12
      + (now.getMonth() - dob.getMonth());

    // Bone age = อายุจริง ± deviation (-8 ถึง +8 เดือน)
    const deviation = Math.round((Math.random() - 0.5) * 16);
    const boneAgeMonths = Math.max(6, chronAgeMonths + deviation);
    const confidence   = 0.82 + Math.random() * 0.14; // 0.82–0.96

    // Risk flag
    let riskFlag = 'normal';
    if (deviation <= -6)      riskFlag = 'delayed';
    else if (deviation >= 6)  riskFlag = 'advanced';

    // ส่วนสูง (ใช้จาก assessment ถ้ามี ไม่งั้นใช้จาก child)
    const heightCm = Number(assessment.heightCm ?? child.heightCm ?? 0);
    const weightKg = Number(assessment.weightKg ?? child.weightKg ?? 0);

    // Target Height (Tanner-Whitehouse)
    let targetHeightCm: number | undefined;
    if (child.fatherHeightCm && child.motherHeightCm) {
      const f = Number(child.fatherHeightCm);
      const m = Number(child.motherHeightCm);
      targetHeightCm = child.sex === 'M' ? (f + m + 13) / 2 : (f + m - 13) / 2;
    }

    // Final adult height (Bayley-Pinneau approximation — simplified)
    let finalAdultHeightCm: number | undefined;
    if (heightCm > 0) {
      const boneAgeYears = boneAgeMonths / 12;
      // rough multiplier based on bone age
      const mult = boneAgeYears < 11 ? 1.18 : boneAgeYears < 13 ? 1.10 : 1.04;
      finalAdultHeightCm = Math.round(heightCm * mult * 10) / 10;
    }

    // Percentile (Thai Growth Standards 2564 — simplified z-score ±2σ)
    let heightPercentile: number | undefined;
    let heightSdScore: number | undefined;
    if (heightCm > 0 && chronAgeMonths > 0) {
      const ageYears = chronAgeMonths / 12;
      // rough median & SD by sex/age
      const medianH = child.sex === 'M' ? 76 + ageYears * 6.5 : 75 + ageYears * 6.2;
      const sdH = 4.5;
      const z = (heightCm - medianH) / sdH;
      heightSdScore = Math.round(z * 100) / 100;
      // z → percentile approximation
      const p = 50 + 34.1 * Math.tanh(z * 0.82);
      heightPercentile = Math.round(Math.max(1, Math.min(99, p)));
      if (heightPercentile < 3)  riskFlag = riskFlag === 'normal' ? 'short_stature' : riskFlag;
      if (heightPercentile > 97) riskFlag = riskFlag === 'normal' ? 'tall_stature'  : riskFlag;
    }

    // BMI
    let bmi: number | undefined;
    let bmiPercentile: number | undefined;
    if (heightCm > 0 && weightKg > 0) {
      bmi = Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10;
      bmiPercentile = Math.round(40 + Math.random() * 30);
    }

    const result = {
      boneAgeMonths,
      confidence: Math.round(confidence * 1000) / 1000,
      heatmapUrl: 'mock://heatmap',
      finalAdultHeightCm,
      targetHeightCm,
      heightPercentile,
      weightPercentile: weightKg > 0 ? Math.round(30 + Math.random() * 40) : undefined,
      bmi,
      bmiPercentile,
      heightSdScore,
      riskFlag,
    };

    return this.saveAiResult(id, result);
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
