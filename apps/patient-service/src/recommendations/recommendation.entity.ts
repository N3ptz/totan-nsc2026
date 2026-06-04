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

  @Column({ type: 'text' })
  content: string; // ข้อความคำแนะนำ

  @Column({ nullable: true })
  mediaUrl: string; // URL วิดีโอหรือเอกสารแนบ

  @Column({ default: false })
  isRead: boolean; // ผู้ปกครองอ่านแล้วหรือยัง

  @CreateDateColumn()
  createdAt: Date;
}
