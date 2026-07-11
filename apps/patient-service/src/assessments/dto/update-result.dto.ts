import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Payload ที่แพทย์ส่งมาที่ PATCH /assessments/:id/result เพื่อปรับผล AI ก่อนส่งให้ผู้ปกครอง
 * — validate + whitelist กันการ overwrite column อื่น (เช่น doctorId/childId/status)
 */
export class UpdateResultDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  boneAgeMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(250)
  finalAdultHeightCm?: number;

  @IsOptional()
  @IsIn(['normal', 'short_stature', 'tall_stature', 'advanced', 'delayed'])
  riskFlag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clinicalNotes?: string;
}
