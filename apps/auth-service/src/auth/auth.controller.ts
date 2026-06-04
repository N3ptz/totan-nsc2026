import { Controller, Post, Get, Patch, Delete, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

  // POST /auth/avatar — รับ base64 string
  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  updateAvatar(@Request() req: any, @Body('avatarBase64') avatarBase64: string) {
    return this.authService.updateAvatar(req.user.userId, avatarBase64);
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

  // GET /auth/health
  @Get('health')
  health() {
    return { status: 'ok', service: 'auth-service' };
  }
}
