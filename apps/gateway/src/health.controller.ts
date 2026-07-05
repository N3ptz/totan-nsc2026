import { Controller, Get } from '@nestjs/common';

// Health ของ gateway เอง (ไม่ proxy) — ใช้เป็น healthcheckPath บน Railway
// ต้องลงทะเบียนก่อน ProxyController ใน AppModule ไม่งั้นโดน @All('*') ดักไปก่อน
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', service: 'gateway' };
  }
}
