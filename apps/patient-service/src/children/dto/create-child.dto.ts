import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(['M', 'F'])
  sex: 'M' | 'F';

  @IsString()
  @IsOptional()
  ethnicity?: string;

  @IsNumber()
  @IsOptional()
  heightCm?: number;

  @IsNumber()
  @IsOptional()
  weightKg?: number;

  @IsNumber()
  @IsOptional()
  fatherHeightCm?: number;

  @IsNumber()
  @IsOptional()
  motherHeightCm?: number;

  @IsString()
  @IsOptional()
  clinicalNotes?: string;

  @IsString()
  @IsOptional()
  parentId?: string; // ID ของผู้ปกครอง — optional เชื่อมภายหลังด้วย invite code
}
