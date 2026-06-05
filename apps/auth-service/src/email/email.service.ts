import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerifyOtp(to: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? '"โตทัน" <noreply@totan.app>',
      to,
      subject: 'ยืนยัน Email ของคุณ — โตทัน',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#6c8eff;margin-bottom:8px">โตทัน</h2>
          <p style="color:#333;margin-bottom:24px">ขอบคุณที่สมัครสมาชิก กรุณายืนยัน email โดยใช้รหัส OTP ด้านล่าง</p>

          <div style="background:#f4f6ff;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <p style="color:#8892aa;font-size:13px;margin:0 0 8px">รหัส OTP ของคุณ</p>
            <p style="font-size:40px;font-weight:800;letter-spacing:12px;color:#6c8eff;margin:0">${otp}</p>
            <p style="color:#8892aa;font-size:12px;margin:12px 0 0">หมดอายุใน 10 นาที</p>
          </div>

          <p style="color:#8892aa;font-size:12px">
            ถ้าคุณไม่ได้สมัครสมาชิก กรุณาเพิกเฉยต่ออีเมลนี้
          </p>
        </div>
      `,
    });
    this.logger.log(`OTP sent to ${to}`);
  }
}
