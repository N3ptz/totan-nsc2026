import { Controller, Get } from '@nestjs/common';

@Controller('notify')
export class HealthController {
  // GET /notify/health
  @Get('health')
  health() {
    return { status: 'ok', service: 'notify-service' };
  }
}
