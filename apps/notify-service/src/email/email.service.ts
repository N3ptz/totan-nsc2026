import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // ถ้า SMTP ยังไม่ตั้งค่า → โหมด log-only (service ยังรันได้ปกติ)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn('SMTP ยังไม่ตั้งค่า — email จะถูก log แทนการส่งจริง');
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
    if (!this.transporter) {
      this.logger.log(`📧 [log-only] to=${to} subject="${subject}"`);
      return;
    }
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM ?? '"โตทัน" <noreply@totan.app>',
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#6c8eff;margin-bottom:8px">โตทัน</h2>
          ${bodyHtml}
          <p style="color:#8892aa;font-size:12px;margin-top:24px">
            อีเมลนี้ส่งจากระบบโตทันโดยอัตโนมัติ กรุณาอย่าตอบกลับ
          </p>
        </div>
      `,
    });
    this.logger.log(`📧 Email sent to ${to}`);
  }
}
