import { Injectable, Logger } from '@nestjs/common';

export interface UserInfo {
  id: string;
  email: string;
  role: string;
  fullName: string | null;
}

/**
 * เรียก auth-service (internal endpoint) เพื่อขอ email/ชื่อของผู้ใช้
 * ใช้ตอนจะส่งแจ้งเตือน — event จาก Redis มีแค่ userId
 */
@Injectable()
export class UsersClient {
  private readonly logger = new Logger(UsersClient.name);

  async getUser(userId: string): Promise<UserInfo | null> {
    const base = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
    const secret = process.env.INTERNAL_SECRET;
    if (!secret) {
      this.logger.warn('INTERNAL_SECRET ไม่ได้ตั้งค่า — ขอข้อมูลผู้ใช้จาก auth-service ไม่ได้');
      return null;
    }
    try {
      const res = await fetch(`${base}/auth/internal/users/${userId}`, {
        headers: { 'x-internal-secret': secret },
      });
      if (!res.ok) return null;
      return (await res.json()) as UserInfo;
    } catch (err: any) {
      this.logger.warn(`เรียก auth-service ไม่สำเร็จ: ${err.message}`);
      return null;
    }
  }
}
