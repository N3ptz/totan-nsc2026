import { IsEmail, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../users/user.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password: string;

  @IsEnum([UserRole.DOCTOR, UserRole.PARENT], {
    message: 'role ต้องเป็น doctor หรือ parent เท่านั้น',
  })
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  // สำหรับ parent: ความสัมพันธ์กับเด็ก (ต้องมี validator ไม่งั้น ValidationPipe whitelist ตัดทิ้ง)
  @IsOptional()
  @IsIn(['father', 'mother', 'guardian'])
  relationship?: string;

  // สำหรับ parent: เบอร์โทร
  @IsOptional()
  @IsString()
  phone?: string;
}
