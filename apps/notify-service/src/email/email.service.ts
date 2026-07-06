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
    // ถ้า SMTP ยังไม่ตั้งค่า → โหมด log-only (service ยังรันได้ปกติ)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn('SMTP/Brevo ยังไม่ตั้งค่า — email จะถูก log แทนการส่งจริง');
      return;
    }
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

  async send(to: string, subject: string, bodyHtml: string): Promise<void> {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#6c8eff;margin-bottom:8px">โตทัน</h2>
        ${bodyHtml}
        <p style="color:#8892aa;font-size:12px;margin-top:24px">
          อีเมลนี้ส่งจากระบบโตทันโดยอัตโนมัติ กรุณาอย่าตอบกลับ
        </p>
      </div>
    `;
    const from = parseFrom(process.env.MAIL_FROM ?? '"โตทัน" <noreply@totan.app>');

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
      this.logger.log(`📧 Email sent to ${to} (Brevo)`);
      return;
    }

    if (!this.transporter) {
      this.logger.log(`📧 [log-only] to=${to} subject="${subject}"`);
      return;
    }
    await this.transporter.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to,
      subject,
      html,
    });
    this.logger.log(`📧 Email sent to ${to}`);
  }
}
