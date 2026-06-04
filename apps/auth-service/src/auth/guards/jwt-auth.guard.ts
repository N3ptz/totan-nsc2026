import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// ใช้ @UseGuards(JwtAuthGuard) บน route ไหนก็ตามที่ต้องการ login ก่อน
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
