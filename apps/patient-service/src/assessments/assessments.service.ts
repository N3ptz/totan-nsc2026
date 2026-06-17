import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment, AssessmentStatus } from './assessment.entity';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { AiResultDto } from './dto/ai-result.dto';
import { NotifyParentDto } from './dto/notify-parent.dto';
import { RedisService } from '../redis/redis.service';
import { Child } from '../children/child.entity';
import { Recommendation } from '../recommendations/recommendation.entity';
import { RequestUser } from '../common/request-user';

// ป้ายแปลผล (ภาษาไทย) สำหรับใส่ในเมลถึงผู้ปกครอง
const RISK_TH: Record<string, string> = {
  normal: 'ปกติ — อยู่ในเกณฑ์',
  short_stature: 'เตี้ยกว่าเกณฑ์',
  tall_stature: 'สูงกว่าเกณฑ์',
  advanced: 'อายุกระดูกมากกว่าอายุจริง',
  delayed: 'อายุกระดูกน้อยกว่าอายุจริง',
};

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    @InjectRepository(Assessment)
    private assessmentRepo: Repository<Assessment>,
    @InjectRepository(Child)
    private childRepo: Repository<Child>,
    @InjectRepository(Recommendation)
    private recRepo: Repository<Recommendation>,
    private redisService: RedisService,
  ) {}

  // ตรวจว่า user มีสิทธิ์เข้าถึงข้อมูลของเด็กคนนี้ (แพทย์เจ้าของเคส / ผู้ปกครองของเด็ก)
  private async assertChildAccess(childId: string, user: RequestUser): Promise<Child> {
    const child = await this.childRepo.findOne({ where: { id: childId } });
    if (!child) throw new NotFoundException('ไม่พบข้อมูลเด็ก');
    const isOwnerDoctor = user.role === 'doctor' && child.doctorId === user.userId;
    const isOwnerParent = child.parentId === user.userId;
    if (!isOwnerDoctor && !isOwnerParent) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }
    return child;
  }

  // สร้าง assessment ใหม่ (แพทย์อัปโหลด X-ray) — ต้องเป็นแพทย์เจ้าของเคส
  async create(dto: CreateAssessmentDto, doctorId: string) {
    const child = await this.childRepo.findOne({ where: { id: dto.childId } });
    if (!child) throw new NotFoundException('ไม่พบข้อมูลเด็ก');
    if (child.doctorId !== doctorId) {
      throw new ForbiddenException('ไม่มีสิทธิ์สร้างการประเมินให้ผู้ป่วยรายนี้');
    }

    const assessment = this.assessmentRepo.create({
      ...dto,
      doctorId,
      status: AssessmentStatus.PENDING,
    });
    await this.assessmentRepo.save(assessment);

    // Fire-and-forget: ส่งงานให้ AI service (non-blocking)
    this._callAiService(assessment, child).catch(
      (err) => this.logger.warn(`AI service call failed (non-fatal): ${err.message}`),
    );

    return assessment;
  }

  private async _callAiService(assessment: Assessment, child: Child): Promise<void> {
    const aiUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

    await this.assessmentRepo.update(assessment.id, { status: AssessmentStatus.PROCESSING });

    const response = await fetch(`${aiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: assessment.id,
        xrayImageUrl: assessment.xrayImageUrl,
        sex: child.sex ?? 'M',
        dateOfBirth: child.dateOfBirth ?? null,
        heightCm: assessment.heightCm ?? null,
        weightKg: assessment.weightKg ?? null,
        fatherHeightCm: child.fatherHeightCm ?? null,
        motherHeightCm: child.motherHeightCm ?? null,
      }),
    });

    if (!response.ok) {
      await this.assessmentRepo.update(assessment.id, { status: AssessmentStatus.FAILED });
      throw new Error(`AI service responded with ${response.status}`);
    }
  }

  // AI เรียก endpoint นี้เพื่อบันทึกผล (ผ่าน InternalGuard + AiResultDto แล้ว)
  async saveAiResult(assessmentId: string, result: AiResultDto) {
    const exists = await this.assessmentRepo.findOne({ where: { id: assessmentId } });
    if (!exists) throw new NotFoundException('ไม่พบข้อมูลการประเมิน');

    await this.assessmentRepo.update(assessmentId, {
      ...result,
      status: AssessmentStatus.COMPLETED,
    } as Partial<Assessment>);

    const assessment = await this.assessmentRepo.findOne({ where: { id: assessmentId } });
    // ไม่แจ้งเตือนหมออัตโนมัติแล้ว — หมอ review ผลแล้วกด "ส่งผลให้ผู้ปกครอง" เอง (ดู notifyParent)
    return assessment;
  }

  // AI แจ้งว่า pipeline ล้มเหลว — เปลี่ยนสถานะเป็น failed (ไม่ค้าง processing ตลอดไป)
  async markFailed(assessmentId: string) {
    const exists = await this.assessmentRepo.findOne({ where: { id: assessmentId } });
    if (!exists) throw new NotFoundException('ไม่พบข้อมูลการประเมิน');
    await this.assessmentRepo.update(assessmentId, { status: AssessmentStatus.FAILED });
    return { message: 'marked as failed' };
  }

  // ดูผลการประเมินทั้งหมดของเด็กคนนึง — เช็คสิทธิ์ก่อน
  async findByChildAuthorized(childId: string, user: RequestUser) {
    await this.assertChildAccess(childId, user);
    return this.assessmentRepo.find({
      where: { childId },
      order: { createdAt: 'DESC' },
    });
  }

  // ดูรายละเอียดผลการประเมิน — เช็คสิทธิ์ผ่านเด็กเจ้าของผล
  async findOneAuthorized(id: string, user: RequestUser) {
    const assessment = await this.findOne(id);
    await this.assertChildAccess(assessment.childId, user);
    return assessment;
  }

  // ใช้ภายใน service เท่านั้น (ไม่เช็คสิทธิ์)
  async findOne(id: string) {
    const assessment = await this.assessmentRepo.findOne({ where: { id } });
    if (!assessment) throw new NotFoundException('ไม่พบข้อมูลการประเมิน');
    return assessment;
  }

  // ── Mock AI (demo only) — delegate ให้ AI service เหมือน flow จริง ──
  async mockAiResult(id: string, doctorId: string) {
    const assessment = await this.findOne(id);
    if (assessment.doctorId !== doctorId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }
    const child = await this.childRepo.findOne({ where: { id: assessment.childId } });
    if (!child) throw new NotFoundException('ไม่พบข้อมูลเด็ก');
    await this._callAiService(assessment, child);
    return assessment;
  }

  // บันทึก follow-up date — เฉพาะแพทย์เจ้าของเคส
  async setFollowup(id: string, doctorId: string, date: Date, notes?: string) {
    const assessment = await this.findOne(id);
    if (assessment.doctorId !== doctorId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }
    await this.assessmentRepo.update(id, {
      nextFollowupDate: date,
      followupNotes: notes,
    });
    return this.findOne(id);
  }

  // แพทย์กด "ส่งผลให้ผู้ปกครอง" — บันทึกวันนัด + รวบรวมผลประเมิน → publish ให้ notify-service ส่งเมล
  async notifyParent(id: string, doctorId: string, dto: NotifyParentDto) {
    const assessment = await this.findOne(id);
    if (assessment.doctorId !== doctorId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }
    if (assessment.status !== AssessmentStatus.COMPLETED) {
      throw new BadRequestException('ผลการประเมินยังไม่เสร็จ — รอ AI วิเคราะห์ให้เสร็จก่อนส่งผล');
    }

    const child = await this.childRepo.findOne({ where: { id: assessment.childId } });
    if (!child) throw new NotFoundException('ไม่พบข้อมูลเด็ก');
    if (!child.parentId) {
      throw new BadRequestException('เด็กคนนี้ยังไม่ได้ผูกบัญชีผู้ปกครอง');
    }

    // บันทึกวันนัด follow-up (เวลา/โน้ตเก็บรวมใน followupNotes เพราะคอลัมน์วันเป็นชนิด date)
    const composedNotes =
      [dto.followUpTime ? `เวลานัด ${dto.followUpTime} น.` : null, dto.note?.trim() || null]
        .filter(Boolean)
        .join(' — ') || null;

    await this.assessmentRepo.update(id, {
      nextFollowupDate: dto.followUpDate as any,
      followupNotes: composedNotes,
      parentNotifiedAt: new Date(), // บันทึกว่าส่งให้ผู้ปกครองแล้ว (ไว้โชว์สถานะ + ปุ่มส่งใหม่)
    });

    // ── บันทึก "คำแนะนำ" ให้ผู้ปกครองดูในแอป (โมดูล Recommendations) ──
    // upsert ต่อ assessment+parent กันคำแนะนำซ้ำเวลาแพทย์กดส่งใหม่ — ส่งใหม่ = อัปเดตเนื้อหา + เด้งเป็นยังไม่อ่าน
    const recContent = dto.note?.trim() || '';
    const existingRec = await this.recRepo.findOne({
      where: { assessmentId: id, parentId: child.parentId },
    });
    if (existingRec) {
      await this.recRepo.update(existingRec.id, {
        content: recContent,
        followUpDate: dto.followUpDate,
        followUpTime: dto.followUpTime ?? null,
        isRead: false,
      });
    } else {
      const rec = this.recRepo.create({
        assessmentId: id,
        doctorId,
        parentId: child.parentId,
        content: recContent,
        followUpDate: dto.followUpDate,
        followUpTime: dto.followUpTime ?? null,
      });
      await this.recRepo.save(rec);
    }

    // ── รวบรวมผลประเมินเป็นข้อความสรุป (ส่งให้ notify-service จัดเป็นเมล) ──
    const boneAge = Number(assessment.boneAgeMonths ?? 0);
    const chrono = child.dateOfBirth ? this._monthsBetween(child.dateOfBirth, assessment.createdAt) : 0;
    const dev = boneAge - chrono;
    const ym = (m: number) => `${Math.floor(m / 12)} ปี ${m % 12} เดือน`;

    const summary = {
      boneAgeText: assessment.boneAgeMonths != null ? ym(boneAge) : null,
      chronoAgeText: child.dateOfBirth ? ym(chrono) : null,
      deviationText:
        assessment.boneAgeMonths != null
          ? `${dev >= 0 ? '+' : ''}${dev} เดือน (${dev >= 0 ? 'มากกว่า' : 'น้อยกว่า'}อายุจริง)`
          : null,
      riskTh: assessment.riskFlag ? RISK_TH[assessment.riskFlag] ?? assessment.riskFlag : null,
      heightText: assessment.heightCm
        ? `${assessment.heightCm} ซม.${assessment.heightPercentile ? ` (P${Math.round(Number(assessment.heightPercentile))})` : ''}`
        : null,
      weightText: assessment.weightKg ? `${assessment.weightKg} กก.` : null,
      bmiText: assessment.bmi ? `${assessment.bmi}` : null,
      fahText: assessment.finalAdultHeightCm ? `${assessment.finalAdultHeightCm} ซม.` : null,
      targetHeightText: assessment.targetHeightCm ? `${assessment.targetHeightCm} ซม.` : null,
    };

    const webUrl = process.env.WEB_URL ?? 'http://localhost:3100';
    const fmtDate = (d: string) =>
      new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    // publish → notify-service ส่งเมลผู้ปกครอง (non-blocking; Redis ล่มไม่ทำให้บันทึกล้มเหลว)
    this.redisService
      .publish('parent.notify', {
        parentId: child.parentId,
        childId: child.id,
        childName: child.name,
        assessmentId: assessment.id,
        reportUrl: `${webUrl}/print/${child.id}/${assessment.id}?view=1`,
        followUpDateText: fmtDate(dto.followUpDate),
        followUpTime: dto.followUpTime ?? null,
        note: dto.note?.trim() || null,
        summary,
      })
      .catch((err) => this.logger.warn(`Redis publish failed (non-fatal): ${err.message}`));

    return this.findOne(id);
  }

  // จำนวนเดือนระหว่างวันเกิด → วันตรวจ
  private _monthsBetween(dob: string | Date, at: string | Date): number {
    const b = new Date(dob), d = new Date(at);
    return (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
  }
}
