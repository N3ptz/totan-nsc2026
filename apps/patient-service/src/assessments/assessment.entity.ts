import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';

export enum AssessmentStatus {
  PENDING    = 'pending',    // รอ AI ประมวลผล
  PROCESSING = 'processing', // AI กำลังทำงาน
  COMPLETED  = 'completed',  // เสร็จแล้ว
  FAILED     = 'failed',     // ผิดพลาด
}

@Entity('assessments')
export class Assessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  childId: string;

  @Column()
  doctorId: string;

  @Column()
  xrayImageUrl: string; // URL ภาพ X-ray ที่อัปโหลดไว้ใน Object Storage

  @Column({ type: 'enum', enum: AssessmentStatus, default: AssessmentStatus.PENDING })
  status: AssessmentStatus;

  // ── ข้อมูลวัดตอนที่ตรวจ ─────────────────────────────
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  heightCm: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  weightKg: number;

  // ── ผลจาก AI (กรอกเมื่อ status = completed) ─────────
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, transformer: numericTransformer })
  boneAgeMonths: number; // อายุกระดูกในหน่วยเดือน

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  confidence: number; // ความมั่นใจของ AI (0-1)

  @Column({ nullable: true })
  heatmapUrl: string; // URL ภาพ Grad-CAM heatmap

  // true = ผลจาก mock pipeline (model จริงยังไม่ถูกโหลด) — UI/รายงานต้องระบุว่าเป็นผลจำลอง
  @Column({ default: false })
  isMock: boolean;

  // mock | external_demo — แหล่งที่มาของ bone age (external_demo = โมเดลของทีมบน
  // HF Space เวอร์ชันทดลอง ยังไม่ผ่านการตรวจสอบความแม่นยำทางคลินิก — UI ต้องแสดงป้ายกำกับ)
  @Column({ default: 'mock' })
  aiProvider: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  finalAdultHeightCm: number; // FAH จาก Bayley-Pinneau method (bone age + current height)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  targetHeightCm: number; // TH คำนวณจากส่วนสูงบิดา-มารดา

  // ── Percentile จาก Thai Growth Standards 2564 ───────
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  heightPercentile: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  weightPercentile: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  bmi: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  bmiPercentile: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  heightSdScore: number; // Z-score

  // ── Risk flag ────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ['normal', 'short_stature', 'tall_stature', 'advanced', 'delayed'],
    nullable: true,
  })
  riskFlag: string;

  // ── Follow-up ────────────────────────────────────────
  @Column({ type: 'date', nullable: true })
  nextFollowupDate: Date;

  @Column({ type: 'text', nullable: true })
  followupNotes: string;

  // เวลาที่แพทย์กดส่งผลให้ผู้ปกครองล่าสุด (null = ยังไม่เคยส่ง)
  // สำคัญ: ใช้เป็นตัวกั้นการมองเห็นของผู้ปกครองด้วย — ผู้ปกครองเห็นผลเฉพาะ assessment ที่แพทย์กดส่งแล้ว
  @Column({ type: 'timestamptz', nullable: true })
  parentNotifiedAt: Date;

  // เวลาที่แพทย์แก้ไขผล AI ล่าสุด (null = ยังไม่เคยแก้) — UI ใช้แสดงป้าย "แพทย์ปรับผลแล้ว"
  @Column({ type: 'timestamptz', nullable: true })
  resultEditedAt: Date;

  // เวลาที่แพทย์รีวิวผลแล้ว (ยืนยันตามเดิมหรือปรับค่าก็ตาม) — ป้าย "แพทย์ตรวจสอบแล้ว"
  // แยกจาก resultEditedAt เพราะรีวิวโดยไม่แก้ค่าก็ต้องบอกผู้ใช้ได้ว่าผ่านตาแพทย์แล้ว
  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  // ── ค่าดิบจาก AI (snapshot ตอน AI ตอบ) ─────────────────
  // คอลัมน์หลัก (boneAgeMonths ฯลฯ) คือ "ค่าที่ใช้จริง" ซึ่งแพทย์แก้ทับได้ —
  // ชุดนี้เก็บค่าดั้งเดิมจาก AI ไว้ให้ UI ฝั่งแพทย์โชว์เทียบ "AI ให้ → แพทย์ปรับเป็น"
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, transformer: numericTransformer })
  aiBoneAgeMonths: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  aiFinalAdultHeightCm: number;

  @Column({ type: 'varchar', nullable: true })
  aiRiskFlag: string;

  @Column({ type: 'text', nullable: true })
  clinicalNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
