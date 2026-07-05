import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * Payload ที่ AI service ส่งกลับมาที่ POST /assessments/:id/ai-result
 * — validate + whitelist กันการ overwrite column อื่น (เช่น doctorId/childId)
 */
export class AiResultDto {
  @IsNumber()
  boneAgeMonths: number;

  @IsNumber()
  confidence: number;

  @IsOptional()
  @IsString()
  heatmapUrl?: string | null;

  @IsOptional()
  @IsNumber()
  finalAdultHeightCm?: number | null;

  @IsOptional()
  @IsNumber()
  targetHeightCm?: number | null;

  @IsOptional()
  @IsNumber()
  heightPercentile?: number | null;

  @IsOptional()
  @IsNumber()
  weightPercentile?: number | null;

  @IsOptional()
  @IsNumber()
  bmi?: number | null;

  @IsOptional()
  @IsNumber()
  bmiPercentile?: number | null;

  @IsOptional()
  @IsNumber()
  heightSdScore?: number | null;

  @IsOptional()
  @IsIn(['normal', 'short_stature', 'tall_stature', 'advanced', 'delayed'])
  riskFlag?: string;

  // true เมื่อผลมาจาก mock pipeline (ยังไม่ได้ใช้ model จริง)
  @IsOptional()
  @IsBoolean()
  isMock?: boolean;

  // mock | external_demo — บอกแหล่งที่มาของ bone age ให้ UI แสดงป้ายกำกับถูกต้อง
  @IsOptional()
  @IsIn(['mock', 'external_demo'])
  aiProvider?: string;
}
