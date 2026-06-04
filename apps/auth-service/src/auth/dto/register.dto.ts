import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
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

  // สำหรับ parent: ความสัมพันธ์กับเด็ก
  relationship?: string;

  // สำหรับ parent: เบอร์โทร
  phone?: string;
}
