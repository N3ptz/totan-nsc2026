import {
  Injectable, ConflictException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

import { User, UserRole, UserStatus } from '../users/user.entity';
import { Doctor } from '../users/doctor.entity';
import { Parent } from '../users/parent.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)   private userRepo: Repository<User>,
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
    @InjectRepository(Parent) private parentRepo: Repository<Parent>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  private static readonly MAX_OTP_ATTEMPTS = 5;

  private generateOtp(): string {
    // ใช้ crypto.randomInt — Math.random() เดาได้ ไม่เหมาะกับรหัสยืนยัน
    return String(randomInt(100000, 1000000));
  }

  // ─── REGISTER ────────────────────────────────────────
  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email นี้ถูกใช้งานแล้ว');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      status: UserStatus.UNVERIFIED,
      verifyOtp: otp,
      verifyOtpExpiresAt: expiresAt,
    });
    await this.userRepo.save(user);

    if (dto.role === UserRole.DOCTOR) {
      await this.doctorRepo.save(
        this.doctorRepo.create({ userId: user.id, fullName: dto.fullName }),
      );
    } else if (dto.role === UserRole.PARENT) {
      await this.parentRepo.save(
        this.parentRepo.create({
          userId: user.id, fullName: dto.fullName,
          phone: dto.phone, relationship: dto.relationship,
        }),
      );
    }

    // ส่ง OTP ทาง email (non-blocking — ไม่ให้ error email ทำให้ register fail)
    this.emailService.sendVerifyOtp(dto.email, otp).catch(() => {});

    return { message: 'ลงทะเบียนสำเร็จ กรุณายืนยัน email', userId: user.id };
  }

  // ─── VERIFY EMAIL ─────────────────────────────────────
  async verifyEmail(email: string, otp: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new BadRequestException('ไม่พบบัญชีนี้');

    if (user.status === UserStatus.ACTIVE) {
      return { message: 'ยืนยัน email แล้ว' };
    }

    // หมดอายุ / กรอกผิดเกิน limit → ต้องขอรหัสใหม่
    if (!user.verifyOtp || !user.verifyOtpExpiresAt || new Date() > user.verifyOtpExpiresAt) {
      throw new BadRequestException('รหัส OTP หมดอายุแล้ว กรุณาขอใหม่');
    }
    if (user.verifyOtpAttempts >= AuthService.MAX_OTP_ATTEMPTS) {
      throw new BadRequestException('กรอกรหัสผิดหลายครั้งเกินไป กรุณาขอรหัสใหม่');
    }

    if (user.verifyOtp !== otp) {
      await this.userRepo.update(user.id, {
        verifyOtpAttempts: user.verifyOtpAttempts + 1,
      });
      throw new BadRequestException('รหัส OTP ไม่ถูกต้อง');
    }

    await this.userRepo.update(user.id, {
      status: UserStatus.ACTIVE,
      verifyOtp: null,
      verifyOtpExpiresAt: null,
      verifyOtpAttempts: 0,
    });

    return { message: 'ยืนยัน email สำเร็จ' };
  }

  // ─── RESEND OTP ───────────────────────────────────────
  async resendVerifyOtp(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new BadRequestException('ไม่พบบัญชีนี้');
    if (user.status === UserStatus.ACTIVE) {
      return { message: 'ยืนยัน email แล้ว' };
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.userRepo.update(user.id, {
      verifyOtp: otp,
      verifyOtpExpiresAt: expiresAt,
      verifyOtpAttempts: 0,
    });

    this.emailService.sendVerifyOtp(email, otp).catch(() => {});

    return { message: 'ส่ง OTP ใหม่แล้ว กรุณาตรวจสอบ email' };
  }

  // ─── LOGIN ───────────────────────────────────────────
  async login(dto: LoginDto) {
    // หา user ด้วย email
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Email หรือ Password ไม่ถูกต้อง');

    // เปรียบเทียบ password กับ hash
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Email หรือ Password ไม่ถูกต้อง');

    if (user.status === UserStatus.UNVERIFIED) {
      throw new UnauthorizedException('กรุณายืนยัน email ก่อนเข้าสู่ระบบ');
    }
    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException('บัญชีนี้กำลังรอการอนุมัติจากผู้ดูแลระบบ');
    }
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
