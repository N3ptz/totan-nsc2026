import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { StorageService } from '../storage/storage.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private storageService: StorageService,
  ) {}

  // POST /auth/register
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /auth/login
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // GET /auth/me — ต้อง login ก่อน
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    const me = await this.authService.getProfile(req.user.userId);
    // bucket เป็น private — DB เก็บ key ต้องเซ็นเป็น URL ก่อนส่งให้ frontend
    if (me.profile?.avatarUrl) {
      me.profile.avatarUrl = await this.storageService.signUrl(me.profile.avatarUrl);
    }
    return me;
  }

  // PATCH /auth/profile — อัปเดตชื่อ/เบอร์โทร
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  // POST /auth/change-password
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  // POST /auth/avatar — รับไฟล์รูปภาพ → upload ไป R2
  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async updateAvatar(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('ไม่พบไฟล์');
    const key = await this.storageService.upload(file, 'avatars'); // DB เก็บ key
    await this.authService.updateAvatar(req.user.userId, key);
    // ส่ง signed URL กลับให้ UI แสดงรูปได้ทันที
    return { avatarUrl: await this.storageService.signUrl(key) };
  }

  // DELETE /auth/account
  @UseGuards(JwtAuthGuard)
  @Delete('account')
  deleteAccount(@Request() req: any) {
    return this.authService.deleteAccount(req.user.userId);
  }

  // GET /auth/find-by-email?email=xxx — หา user จากอีเมล (เฉพาะแพทย์เท่านั้น กัน enumerate ผู้ใช้)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Get('find-by-email')
  findByEmail(@Query('email') email: string) {
    return this.authService.findByEmail(email);
  }

  // GET /auth/internal/users/:id — service อื่นขอ email/ชื่อผู้ใช้ (internal เท่านั้น)
  @Get('internal/users/:id')
  async internalGetUser(@Param('id') id: string, @Request() req: any) {
    const secret = process.env.INTERNAL_SECRET;
    if (!secret || req.headers['x-internal-secret'] !== secret) {
      throw new UnauthorizedException('Internal endpoint');
    }
    const user = await this.authService.getProfile(id).catch(() => null);
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.profile?.fullName ?? null,
    };
  }

  // POST /auth/verify-email — ยืนยัน email ด้วย OTP
  @Post('verify-email')
  verifyEmail(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyEmail(body.email, body.otp);
  }

  // POST /auth/resend-verify — ขอ OTP ใหม่
  @Post('resend-verify')
  resendVerify(@Body() body: { email: string }) {
    return this.authService.resendVerifyOtp(body.email);
  }

  // GET /auth/health
  @Get('health')
  health() {
    return { status: 'ok', service: 'auth-service' };
  }
}
