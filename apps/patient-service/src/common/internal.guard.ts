import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';

/**
 * ป้องกัน endpoint ภายใน (service-to-service) ด้วย x-internal-secret
 * — main.ts ตรวจตอน boot แล้วว่า INTERNAL_SECRET ต้องถูกตั้งค่า
 */
@Injectable()
export class InternalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.INTERNAL_SECRET;
    const req = context.switchToHttp().getRequest();
    if (!secret || req.headers['x-internal-secret'] !== secret) {
      throw new UnauthorizedException('Internal endpoint');
    }
    return true;
  }
}
