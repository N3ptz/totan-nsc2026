import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('recommendations')
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assessmentId: string;

  @Column()
  doctorId: string;

  @Column()
  parentId: string; // ส่งถึงผู้ปกครองคนนี้

  @Column({ type: 'text', default: '' })
  content: string; // ข้อความคำแนะนำจากแพทย์

  @Column({ nullable: true })
  mediaUrl: string; // URL วิดีโอหรือเอกสารแนบ

  // วันนัดติดตามครั้งถัดไป (แนบมากับคำแนะนำเมื่อแพทย์กด "ส่งผลให้ผู้ปกครอง")
  @Column({ type: 'date', nullable: true })
  followUpDate: string | null;

  // เวลานัด (HH:MM) — ไม่บังคับ
  @Column({ nullable: true })
  followUpTime: string | null;

  @Column({ default: false })
  isRead: boolean; // ผู้ปกครองอ่านแล้วหรือยัง

  @CreateDateColumn()
  createdAt: Date;
}
