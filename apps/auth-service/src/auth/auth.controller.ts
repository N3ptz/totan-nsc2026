import { Controller, Post, Get, Patch, Delete, Body, Query, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
  getMe(@Request() req: any) {
    return this.authService.getProfile(req.user.userId);
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
    const avatarUrl = await this.storageService.upload(file, 'avatars');
    return this.authService.updateAvatar(req.user.userId, avatarUrl);
  }

  // DELETE /auth/account
  @UseGuards(JwtAuthGuard)
  @Delete('account')
  deleteAccount(@Request() req: any) {
    return this.authService.deleteAccount(req.user.userId);
  }

  // GET /auth/find-by-email?email=xxx — หา user จากอีเมล (เฉพาะแพทย์ใช้)
  @UseGuards(JwtAuthGuard)
  @Get('find-by-email')
  findByEmail(@Query('email') email: string) {
    return this.authService.findByEmail(email);
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
