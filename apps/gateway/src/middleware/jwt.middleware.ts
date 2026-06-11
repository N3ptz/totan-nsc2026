import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

// PUBLIC routes ที่ไม่ต้อง login (เทียบแบบ exact path เพื่อกัน /auth/login-xxx หลุด)
const PUBLIC_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/health',
  '/auth/verify-email',
  '/auth/resend-verify',
]);

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // ลบ x-user-* ที่ client แอบส่งมาทิ้งเสมอ — header พวกนี้ต้องมาจาก gateway เท่านั้น
    delete req.headers['x-user-id'];
    delete req.headers['x-user-role'];
    delete req.headers['x-user-email'];
    // internal secret ใช้เฉพาะ service-to-service ไม่รับจากภายนอก
    delete req.headers['x-internal-secret'];

    // req.originalUrl คือ full path เสมอ ไม่ถูก Express/NestJS strip
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];

    // ให้ผ่านถ้าเป็น OPTIONS (CORS preflight) หรือ public route
    if (req.method === 'OPTIONS') return next();
    if (PUBLIC_PATHS.has(path)) return next();

    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('กรุณาเข้าสู่ระบบก่อน');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      // ส่ง user info ไปให้ service downstream ผ่าน header
      req.headers['x-user-id'] = payload.sub;
      req.headers['x-user-role'] = payload.role;
      req.headers['x-user-email'] = payload.email;
      next();
    } catch {
      throw new UnauthorizedException('Token ไม่ถูกต้องหรือหมดอายุ');
    }
  }
}
