import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * In-memory rate limiter สำหรับ endpoint ที่อ่อนไหว (login / register / OTP)
 * กัน brute-force แบบง่ายๆ โดยไม่ต้องพึ่ง dependency เพิ่ม
 * — ถ้า deploy หลาย instance ควรเปลี่ยนไปใช้ Redis-based limiter
 */
const WINDOW_MS = 60_000; // 1 นาที
const MAX_REQUESTS = 10;  // ต่อ ip+path ต่อ window

const hits = new Map<string, { count: number; resetAt: number }>();

// กัน Map โตไม่จำกัด — กวาด entry หมดอายุทุก 5 นาที
setInterval(() => {
  const now = Date.now();
  for (const [key, v] of hits) {
    if (v.resetAt <= now) hits.delete(key);
  }
}, 5 * 60_000).unref();

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
    const key = `${ip}:${path}`;
    const now = Date.now();

    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }

    entry.count += 1;
    if (entry.count > MAX_REQUESTS) {
      throw new HttpException(
        'พยายามมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    next();
  }
}
