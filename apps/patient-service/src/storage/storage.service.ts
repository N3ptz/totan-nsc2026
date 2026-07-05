import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  private readonly configured: boolean;

  constructor() {
    const required = [
      'STORAGE_BUCKET_NAME',
      'STORAGE_PUBLIC_URL',
      'SUPABASE_PROJECT_REF',
      'SUPABASE_S3_ACCESS_KEY',
      'SUPABASE_S3_SECRET_KEY',
    ];
    const missing = required.filter((k) => !process.env[k]);
    this.configured = missing.length === 0;
    if (!this.configured) {
      this.logger.error(
        `Storage ยังใช้งานไม่ได้ — ขาด env: ${missing.join(', ')} (upload จะ error จนกว่าจะตั้งค่า)`,
      );
    }

    this.bucket = process.env.STORAGE_BUCKET_NAME!;
    this.publicUrl = process.env.STORAGE_PUBLIC_URL!;

    // Supabase Storage — S3-compatible API
    this.s3 = new S3Client({
      region: 'ap-southeast-1',
      endpoint: `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3`,
      credentials: {
        accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY ?? '',
      },
      forcePathStyle: true, // จำเป็นสำหรับ Supabase
    });
  }

  async upload(
    file: Express.Multer.File,
    folder: 'avatars' | 'xrays' | 'heatmaps' | 'reports',
  ): Promise<string> {
    const isMockSetup =
      !this.configured ||
      process.env.SUPABASE_PROJECT_REF === 'your-project-ref' ||
      !process.env.SUPABASE_PROJECT_REF;

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;

    if (isMockSetup) {
      // Save file locally and serve via static endpoint instead of mock:// URL
      const uploadsDir = join(process.cwd(), 'uploads', folder);
      mkdirSync(uploadsDir, { recursive: true });
      const filename = `${randomUUID()}.${ext}`;
      const filePath = join(uploadsDir, filename);
      writeFileSync(filePath, file.buffer);
      const port = process.env.PORT ?? 3002;
      // ต้องเป็น URL ที่ทั้ง browser และ ai-service (อาจอยู่คนละเครื่อง/container) เข้าถึงได้
      const baseUrl = process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`;
      const url = `${baseUrl}/uploads/${folder}/${filename}`;
      this.logger.warn(`⚠️ Supabase ไม่ได้ตั้งค่า — บันทึกไฟล์ local: ${url}`);
      return url;
    }

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      // Bucket เป็น private แล้ว — DB เก็บแค่ key ส่วน URL จริงให้ signUrl() เซ็นตอนอ่าน
      this.logger.log(`✅ Uploaded → ${key}`);
      return key;
    } catch (err: any) {
      // ห้ามกลืน error — ถ้าคืน URL ปลอม ไฟล์ X-ray จะหายเงียบ ๆ ทั้งที่ client ได้ 200
      this.logger.error(`❌ Upload failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * แปลงค่าที่เก็บใน DB → URL ที่เปิดดูได้จริง (bucket เป็น private):
   * - key ("xrays/uuid.jpg")          → presigned URL (หมดอายุใน expiresIn วินาที)
   * - URL public ยุคเก่า (object/public/...) → ดึง key ออกมาเซ็นให้ (row เก่าใช้ต่อได้)
   * - mock:// และ URL local-upload    → คืนตามเดิม
   */
  async signUrl(stored: string | null | undefined, expiresIn = 3600): Promise<string | null> {
    if (!stored) return stored ?? null;
    // data: = ภาพ base64 ยุคแรกที่ฝังใน DB ตรง ๆ — ใช้แสดงผลได้เลย ไม่ต้องเซ็น
    if (stored.startsWith('mock://') || stored.startsWith('data:')) return stored;

    let key = stored;
    if (/^https?:\/\//.test(stored)) {
      const marker = `/object/public/${this.bucket}/`;
      const i = stored.indexOf(marker);
      if (i === -1) return stored; // localhost/local-upload — เสิร์ฟจาก static endpoint อยู่แล้ว
      key = stored.slice(i + marker.length);
    }
    if (!this.configured) return stored;
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn });
  }
}
