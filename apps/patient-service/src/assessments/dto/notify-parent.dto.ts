import { IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// แพทย์กรอกเพื่อส่งผล + วันนัดติดตามให้ผู้ปกครอง
export class NotifyParentDto {
  // วันนัดติดตามผล (YYYY-MM-DD)
  @IsDateString()
  followUpDate: string;

  // เวลานัด (HH:MM) — ไม่บังคับ
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'followUpTime ต้องเป็นรูปแบบ HH:MM' })
  followUpTime?: string;

  // ข้อความ/คำแนะนำถึงผู้ปกครอง — ไม่บังคับ
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
