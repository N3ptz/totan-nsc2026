import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';

@Entity('children')
export class Child {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // parentId อ้างอิงถึง user ใน auth-service — nullable รอเชื่อมผ่าน invite code
  @Column({ nullable: true })
  parentId: string;

  @Column()
  doctorId: string; // แพทย์ที่ดูแล

  @Column()
  name: string;

  @Column({ type: 'date' })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: ['M', 'F'] })
  sex: 'M' | 'F';

  @Column({ default: 'Asian' })
  ethnicity: string;

  // ข้อมูลร่างกายเด็ก ณ วันที่เพิ่มเข้าระบบ
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  heightCm: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  weightKg: number;

  // ส่วนสูงบิดา-มารดา สำหรับคำนวณ Target Height
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  fatherHeightCm: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  motherHeightCm: number;

  @Column({ type: 'text', nullable: true })
  clinicalNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
