import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

/**
 * Gateway ตรวจ JWT แล้ว inject ตัวตนผู้ใช้มาทาง header x-user-*
 * (gateway ลบ header พวกนี้จาก request ภายนอกก่อนเสมอ จึงปลอมไม่ได้)
 */
export interface RequestUser {
  userId: string;
  role: string;
}

export function getRequestUser(req: any): RequestUser {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  if (!userId || !role) throw new UnauthorizedException('กรุณาเข้าสู่ระบบก่อน');
  return { userId: String(userId), role: String(role) };
}

export function requireDoctor(req: any): RequestUser {
  const user = getRequestUser(req);
  if (user.role !== 'doctor') throw new ForbiddenException('เฉพาะแพทย์เท่านั้น');
  return user;
}
