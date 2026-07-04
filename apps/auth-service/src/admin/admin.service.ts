import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Doctor } from '../users/doctor.entity';
import { Parent } from '../users/parent.entity';
import { PatientServiceClient } from './patient-service.client';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
    @InjectRepository(Parent) private parentRepo: Repository<Parent>,
    private patientClient: PatientServiceClient,
  ) {}

  async getStats() {
    const [totalDoctors, totalParents, totalScans] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.DOCTOR } }),
      this.userRepo.count({ where: { role: UserRole.PARENT } }),
      this.patientClient.getAssessmentCount(),
    ]);
    return { totalDoctors, totalParents, totalScans };
  }

  listDoctors() {
    return this.listByRole(UserRole.DOCTOR, this.doctorRepo);
  }

  listParents() {
    return this.listByRole(UserRole.PARENT, this.parentRepo);
  }

  // ดึงรายชื่อจาก userRepo ก่อนเสมอ แล้วค่อย join profile —
  // เพื่อให้สถานะ/role ที่แสดงมาจาก User เป็นแหล่งความจริงเดียว
  private async listByRole(role: UserRole, profileRepo: Repository<Doctor> | Repository<Parent>) {
    const users = await this.userRepo.find({ where: { role }, order: { createdAt: 'DESC' } });
    if (users.length === 0) return [];
    const profiles = await profileRepo.find({ where: { userId: In(users.map(u => u.id)) } });
    const byUserId = new Map(profiles.map((p: any) => [p.userId, p]));
    return users.map(u => {
      const p: any = byUserId.get(u.id);
      return {
        id: u.id,
        email: u.email,
        status: u.status,
        createdAt: u.createdAt,
        fullName: p?.fullName ?? null,
        phone: p?.phone ?? null,
        avatarUrl: p?.avatarUrl ?? null,
        relationship: p?.relationship ?? undefined,
      };
    });
  }

  async listScans() {
    const rows = await this.patientClient.getAllAssessments();
    if (rows.length === 0) return [];
    const doctorIds = [...new Set(rows.map((r: any) => r.doctorId).filter(Boolean))];
    const doctors = doctorIds.length
      ? await this.doctorRepo.find({ where: { userId: In(doctorIds) } })
      : [];
    const nameByUserId = new Map(doctors.map(d => [d.userId, d.fullName]));
    return rows.map((r: any) => ({ ...r, doctorName: nameByUserId.get(r.doctorId) ?? null }));
  }
}
