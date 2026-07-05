import { Injectable, Logger } from '@nestjs/common';

/**
 * เรียก patient-service (internal endpoint) เพื่อขอจำนวน/รายการ assessment
 * ใช้สำหรับ admin stats/scans list — auth-service ไม่มีข้อมูล assessment เอง
 */
@Injectable()
export class PatientServiceClient {
  private readonly logger = new Logger(PatientServiceClient.name);

  private base() {
    return process.env.PATIENT_SERVICE_URL ?? 'http://localhost:3002';
  }

  private headers() {
    return { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' };
  }

  async getAssessmentCount(): Promise<number | null> {
    try {
      const res = await fetch(`${this.base()}/assessments/internal/count`, {
        headers: this.headers(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.count;
    } catch (err: any) {
      this.logger.warn(`เรียก patient-service (count) ไม่สำเร็จ: ${err.message}`);
      return null; // stats endpoint ต้องไม่ 500 แค่เพราะ patient-service ล่ม
    }
  }

  async getAllAssessments(): Promise<any[]> {
    try {
      const res = await fetch(`${this.base()}/assessments/internal/all`, {
        headers: this.headers(),
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (err: any) {
      this.logger.warn(`เรียก patient-service (list) ไม่สำเร็จ: ${err.message}`);
      return [];
    }
  }
}
