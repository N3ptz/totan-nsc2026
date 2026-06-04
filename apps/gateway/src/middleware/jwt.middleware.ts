import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

// PUBLIC routes ที่ไม่ต้อง login
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/health'];

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // req.originalUrl คือ full path เสมอ ไม่ถูก Express/NestJS strip
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];

    // ให้ผ่านถ้าเป็น OPTIONS (CORS preflight) หรือ public route
    if (req.method === 'OPTIONS') return next();
    if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return next();

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
