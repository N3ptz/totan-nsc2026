import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { EmailService } from '../email/email.service';
import { UsersClient } from '../users/users.client';

// กัน HTML/script หลุดเข้า template เมล (note + ชื่อเด็ก เป็น input จากผู้ใช้)
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

@Injectable()
export class RedisListener implements OnModuleInit {
  private subscriber: Redis;
  private readonly logger = new Logger(RedisListener.name);

  constructor(
    private emailService: EmailService,
    private usersClient: UsersClient,
  ) {}

  onModuleInit() {
    this.subscriber = new Redis(process.env.REDIS_URL);

    // แจ้งเตือน "ผู้ปกครอง" เท่านั้น (ตัดแจ้งเตือนฝั่งหมอออกแล้ว)
    this.subscriber.subscribe(
      'parent.notify',        // แพทย์กดส่งผล + วันนัดให้ผู้ปกครอง
      'recommendation.sent',  // แพทย์ส่งคำแนะนำเพิ่มเติม
      'followup.due',         // ถึงวันนัดติดตามผล (auto reminder)
    );

    this.subscriber.on('message', (channel, message) => {
      let data: any;
      try {
        data = JSON.parse(message);
      } catch {
        this.logger.warn(`ข้อความใน [${channel}] ไม่ใช่ JSON — ข้าม`);
        return;
      }
      this.logger.log(`📬 Received [${channel}]`);

      switch (channel) {
        case 'parent.notify':
          this.onParentNotify(data).catch((e) => this.logger.warn(e.message));
          break;
        case 'recommendation.sent':
          this.onRecommendationSent(data).catch((e) => this.logger.warn(e.message));
          break;
        case 'followup.due':
          this.onFollowupDue(data).catch((e) => this.logger.warn(e.message));
          break;
      }
    });
  }

  // ส่งผลการประเมิน + วันนัดติดตาม ให้ผู้ปกครอง (แพทย์กดส่งเอง)
  private async onParentNotify(data: {
    parentId: string;
    childName: string | null;
    assessmentId: string;
    reportUrl: string;
    followUpDateText: string;
    followUpTime: string | null;
    note: string | null;
    summary: Record<string, string | null>;
  }) {
    const parent = await this.usersClient.getUser(data.parentId);
    if (!parent?.email) {
      this.logger.warn(`parent.notify: ไม่พบอีเมลผู้ปกครอง (${data.parentId}) — ข้าม`);
      return;
    }

    const S = data.summary ?? {};
    const rows: [string, string | null | undefined][] = [
      ['อายุกระดูก', S.boneAgeText],
      ['อายุจริง', S.chronoAgeText],
      ['ส่วนเบี่ยงเบน', S.deviationText],
      ['การแปลผล', S.riskTh],
      ['ส่วนสูง', S.heightText],
      ['น้ำหนัก', S.weightText],
      ['BMI', S.bmiText],
      ['ส่วนสูงที่คาดการณ์เมื่อโตเต็มวัย (FAH)', S.fahText],
      ['ส่วนสูงเป้าหมายตามพันธุกรรม (TH)', S.targetHeightText],
    ];
    const summaryHtml = rows
      .filter(([, v]) => v)
      .map(
        ([k, v]) => `
        <tr>
          <td style="padding:6px 10px;color:#667085;font-size:13px;border-bottom:1px solid #eef2f7">${k}</td>
          <td style="padding:6px 10px;color:#1e293b;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #eef2f7">${v}</td>
        </tr>`,
      )
      .join('');

    const childLabel = data.childName ? `ของ ${esc(data.childName)}` : 'ของบุตรหลานของท่าน';
    const followTime = data.followUpTime ? ` เวลา ${esc(data.followUpTime)} น.` : '';

    await this.emailService.send(
      parent.email,
      `ผลการประเมินอายุกระดูก${data.childName ? ` ${esc(data.childName)}` : ''} — โตทัน`,
      `
        <p style="color:#333">เรียน ${parent.fullName ?? 'ผู้ปกครอง'}</p>
        <p style="color:#333">แพทย์ได้ตรวจและยืนยันผลการประเมินอายุกระดูก${childLabel}เรียบร้อยแล้ว สรุปผลดังนี้</p>
        <table style="width:100%;border-collapse:collapse;margin:8px 0 16px">${summaryHtml}</table>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;margin-bottom:14px">
          <p style="margin:0;color:#9a3412;font-weight:700;font-size:13px">📅 นัดติดตามผลครั้งถัดไป</p>
          <p style="margin:4px 0 0;color:#7c2d12;font-size:14px">${esc(data.followUpDateText)}${followTime}</p>
        </div>
        ${data.note ? `<p style="color:#333"><b>คำแนะนำจากแพทย์:</b><br>${esc(data.note)}</p>` : ''}
        <p style="margin-top:16px">
          <a href="${data.reportUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600">ดูรายงานฉบับเต็ม</a>
        </p>
        <p style="color:#8892aa;font-size:12px;margin-top:8px">หากกดปุ่มแล้วระบบให้เข้าสู่ระบบ กรุณาล็อกอินด้วยบัญชีผู้ปกครองของท่านก่อน</p>
      `,
    );
  }

  // แจ้งเตือนผู้ปกครองว่ามีคำแนะนำใหม่จากแพทย์
  private async onRecommendationSent(data: { recommendationId: string; parentId: string }) {
    const parent = await this.usersClient.getUser(data.parentId);
    if (!parent?.email) return;
    await this.emailService.send(
      parent.email,
      'คุณมีคำแนะนำใหม่จากแพทย์ — โตทัน',
      `
        <p style="color:#333">เรียน ${parent.fullName ?? 'ผู้ปกครอง'}</p>
        <p style="color:#333">
          แพทย์ได้ส่งคำแนะนำใหม่เกี่ยวกับการเจริญเติบโตของบุตรหลานของท่าน
          กรุณาเข้าสู่ระบบโตทันเพื่ออ่านรายละเอียด
        </p>
      `,
    );
  }

  // ถึงกำหนดนัดติดตามผล — แจ้ง "ผู้ปกครอง" เท่านั้น
  private async onFollowupDue(data: {
    assessmentId: string;
    parentId: string | null;
    childName: string | null;
    date: string;
  }) {
    if (!data.parentId) return; // ยังไม่ได้ผูกบัญชีผู้ปกครอง → ข้าม
    const parent = await this.usersClient.getUser(data.parentId);
    if (!parent?.email) return;
    const childLabel = data.childName ? `ของ ${esc(data.childName)}` : '';
    await this.emailService.send(
      parent.email,
      'ถึงกำหนดนัดติดตามผล — โตทัน',
      `
        <p style="color:#333">เรียน ${parent.fullName ?? 'ผู้ปกครอง'}</p>
        <p style="color:#333">วันนี้ (${esc(data.date)}) ถึงกำหนดนัดติดตามผลการเจริญเติบโต${childLabel}</p>
        <p style="color:#333">กรุณาติดต่อสถานพยาบาลเพื่อนัดหมายการตรวจครั้งถัดไป</p>
      `,
    );
  }
}
