import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

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
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heightCm: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightKg: number;

  // ── ผลจาก AI (กรอกเมื่อ status = completed) ─────────
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  boneAgeMonths: number; // อายุกระดูกในหน่วยเดือน

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence: number; // ความมั่นใจของ AI (0-1)

  @Column({ nullable: true })
  heatmapUrl: string; // URL ภาพ Grad-CAM heatmap

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalAdultHeightCm: number; // FAH จาก Tanner-Whitehouse 3

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  targetHeightCm: number; // TH คำนวณจากส่วนสูงบิดา-มารดา

  // ── Percentile จาก Thai Growth Standards 2564 ───────
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heightPercentile: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightPercentile: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  bmi: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  bmiPercentile: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
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

  @Column({ type: 'text', nullable: true })
  clinicalNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
