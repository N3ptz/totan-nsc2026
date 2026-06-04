import {
  Injectable, ConflictException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { User, UserRole, UserStatus } from '../users/user.entity';
import { Doctor } from '../users/doctor.entity';
import { Parent } from '../users/parent.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)   private userRepo: Repository<User>,
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
    @InjectRepository(Parent) private parentRepo: Repository<Parent>,
    private jwtService: JwtService,
  ) {}

  // ─── REGISTER ────────────────────────────────────────
  async register(dto: RegisterDto) {
    // เช็คว่า email ซ้ำมั้ย
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email นี้ถูกใช้งานแล้ว');

    // เข้ารหัส password ด้วย bcrypt (hash 12 รอบ)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // สร้าง user
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      status: UserStatus.ACTIVE,
    });
    await this.userRepo.save(user);

    // สร้าง profile ตาม role
    if (dto.role === UserRole.DOCTOR) {
      const doctor = this.doctorRepo.create({ userId: user.id, fullName: dto.fullName });
      await this.doctorRepo.save(doctor);
    } else if (dto.role === UserRole.PARENT) {
      const parent = this.parentRepo.create({
        userId: user.id,
        fullName: dto.fullName,
        phone: dto.phone,
        relationship: dto.relationship,
      });
      await this.parentRepo.save(parent);
    }

    return { message: 'ลงทะเบียนสำเร็จ', userId: user.id };
  }

  // ─── LOGIN ───────────────────────────────────────────
  async login(dto: LoginDto) {
    // หา user ด้วย email
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Email หรือ Password ไม่ถูกต้อง');

    // เปรียบเทียบ password กับ hash
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Email หรือ Password ไม่ถูกต้อง');

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('บัญชีนี้ถูกระงับการใช้งาน');
    }

    // สร้าง JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  // ─── VERIFY TOKEN (ใช้โดย Gateway) ──────────────────
  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }

  // ─── GET PROFILE ─────────────────────────────────────
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    let profile: any = null;
    if (user.role === UserRole.DOCTOR) {
      profile = await this.doctorRepo.findOne({ where: { userId } });
    } else if (user.role === UserRole.PARENT) {
      profile = await this.parentRepo.findOne({ where: { userId } });
    }

    return { id: user.id, email: user.email, role: user.role, profile };
  }

  // ─── FIND BY EMAIL ───────────────────────────────────
  async findByEmail(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return null;
    return { id: user.id, email: user.email, role: user.role };
  }

  // ─── UPDATE PROFILE ──────────────────────────────────
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const update: any = {};
    if (dto.fullName !== undefined) update.fullName = dto.fullName;
    if (dto.phone !== undefined) update.phone = dto.phone;

    if (user.role === UserRole.DOCTOR) {
      await this.doctorRepo.update({ userId }, update);
    } else if (user.role === UserRole.PARENT) {
      await this.parentRepo.update({ userId }, update);
    }

    return { message: 'อัปเดตโปรไฟล์สำเร็จ' };
  }

  // ─── CHANGE PASSWORD ─────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestException('รหัสผ่านปัจจุบันไม่ถูกต้อง');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.save(user);

    return { message: 'เปลี่ยนรหัสผ่านสำเร็จ' };
  }

  // ─── DELETE ACCOUNT ──────────────────────────────────
  async deleteAccount(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    await this.userRepo.remove(user);
    return { message: 'ลบบัญชีสำเร็จ' };
  }

  // ─── UPDATE AVATAR ───────────────────────────────────
  async updateAvatar(userId: string, avatarBase64: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (user.role === UserRole.DOCTOR) {
      await this.doctorRepo.update({ userId }, { avatarUrl: avatarBase64 });
    } else if (user.role === UserRole.PARENT) {
      await this.parentRepo.update({ userId }, { avatarUrl: avatarBase64 });
    }

    return { avatarUrl: avatarBase64 };
  }
}
