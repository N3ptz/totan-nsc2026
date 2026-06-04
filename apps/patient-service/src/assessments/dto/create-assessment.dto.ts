import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsString()
  @IsNotEmpty()
  xrayImageUrl: string; // URL ที่ได้หลัง upload ภาพขึ้น Object Storage

  @IsNumber()
  @IsOptional()
  heightCm?: number;

  @IsNumber()
  @IsOptional()
  weightKg?: number;

  @IsString()
  @IsOptional()
  clinicalNotes?: string;
}
