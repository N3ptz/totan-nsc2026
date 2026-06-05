import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  DOCTOR = 'doctor',
  PARENT = 'parent',
  ADMIN  = 'admin',
}

export enum UserStatus {
  UNVERIFIED = 'unverified', // รอยืนยัน email
  PENDING    = 'pending',    // รอ admin อนุมัติ (สำหรับแพทย์)
  ACTIVE     = 'active',
  INACTIVE   = 'inactive',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ nullable: true })
  verifyOtp: string;

  @Column({ type: 'timestamptz', nullable: true })
  verifyOtpExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
