import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// Railway บล็อก outbound SMTP ทุกพอร์ต (ยกเว้น Pro plan) — production จึงส่งผ่าน
// Brevo HTTP API (port 443) เมื่อตั้ง BREVO_API_KEY; ถ้าไม่ตั้งจะใช้ SMTP ตามเดิม (dev)
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: 'โตทัน', email: raw.trim() };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.BREVO_API_KEY) return;
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

  private async deliver(to: string, subject: string, html: string): Promise<void> {
    const from = parseFrom(process.env.SMTP_FROM ?? '"โตทัน" <noreply@totan.app>');

    if (process.env.BREVO_API_KEY) {
      const res = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: from,
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        throw new Error(`Brevo API ${res.status}: ${await res.text()}`);
      }
      return;
    }

    await this.transporter!.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to,
      subject,
      html,
    });
  }

  async sendVerifyOtp(to: string, otp: string): Promise<void> {
    await this.deliver(
      to,
      'ยืนยัน Email ของคุณ — โตทัน',
      `
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
    );
    this.logger.log(`OTP sent to ${to}`);
  }
}
