import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

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
    if (!this.configured) {
      throw new Error('Storage ยังไม่ได้ตั้งค่า — กรุณากรอก SUPABASE_*/STORAGE_* ใน .env');
    }
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `${folder}/${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    this.logger.log(`✅ Uploaded → ${url}`);
    return url;
  }
}
