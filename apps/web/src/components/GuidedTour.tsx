"use client";

import {
  createContext, useContext, useState, useEffect, useLayoutEffect,
  useCallback, useRef, ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useI18n, Lang } from "@/lib/i18n";

// มาสคอต 3D ลาก three.js (~670KB) + โมเดล 1.8MB มาด้วย — dynamic import เพื่อไม่ให้
// chunk นี้ติดไปกับ root layout (เดิมทุกหน้ารวม login/print ต้องโหลดทั้งก้อน)
const HippoMascot = dynamic(
  () => import("@/components/3d/BotModel").then((m) => m.HippoMascot),
  { ssr: false },
);

// ── Types ──────────────────────────────────────────────────────────────────────
interface TourStep {
  selector:   string;
  title:      { th: string; en: string };
  body:       { th: string; en: string };
  placement?: "top" | "bottom" | "left" | "right" | "auto";
  // คลิก element นี้ตอนกด "ถัดไป" (เช่น เปิด/ปิดพาเนลรายละเอียดผล) — ทัวร์จะรอให้
  // step ถัดไปโผล่ใน DOM ก่อนค่อยเดินต่อ; ไม่คลิกถ้าเป็น step สุดท้าย (ไม่มีที่ให้ไปต่อ)
  advanceClick?: string;
  // คลิก element นี้ตอนกด "ถัดไป" เพื่อ "เปลี่ยนหน้า" (Next.js Link) แล้วทัวร์ไปต่อ
  // อัตโนมัติบนหน้าใหม่ (ผ่าน sessionStorage "tourResume") — ใช้กับ step สุดท้ายของหน้า
  navigateNext?: string;
}

interface SpotRect { top: number; left: number; width: number; height: number }
type Placement = "top" | "bottom" | "left" | "right";

interface TourCtx {
  start:           () => void;
  stop:            () => void;
  isActive:        boolean;
  isWelcomeActive: boolean;
}

// ── Localized UI strings ───────────────────────────────────────────────────────
const UI: Record<Lang, {
  prev: string; skip: string; next: string; done: string; btn: string; aria: string;
  welcomeEyebrow: string; welcomeTitle: string; welcomeBody: string;
  welcomeSteps: (n: number) => string; welcomeStart: string; welcomeSkip: string; welcomeHint: string;
}> = {
  th: {
    prev: "← ก่อนหน้า", skip: "ข้าม", next: "ถัดไป →", done: "เสร็จสิ้น ✓",
    btn: "คู่มือการใช้", aria: "เริ่ม Tutorial",
    welcomeEyebrow: "เริ่มต้นใช้งาน",
    welcomeTitle:   "ยินดีต้อนรับสู่ โตทัน 👋",
    welcomeBody:    "มาทำความรู้จักกับระบบในเวลาเพียง 1 นาที ทัวร์แบบ interactive จะนำคุณผ่านฟีเจอร์หลักของ Dashboard",
    welcomeSteps:   (n) => `${n} ขั้นตอน · ประมาณ 1 นาที`,
    welcomeStart:   "เริ่มทัวร์ →",
    welcomeSkip:    "ข้ามไปก่อน",
    welcomeHint:    "กด Enter เพื่อเริ่ม · Esc เพื่อข้าม",
  },
  en: {
    prev: "← Back", skip: "Skip", next: "Next →", done: "Finish ✓",
    btn: "Tutorial", aria: "Start Tutorial",
    welcomeEyebrow: "Getting Started",
    welcomeTitle:   "Welcome to โตทัน 👋",
    welcomeBody:    "Get familiar with the system in just 1 minute. An interactive tour will walk you through the key features of your Dashboard.",
    welcomeSteps:   (n) => `${n} steps · ~1 minute`,
    welcomeStart:   "Start Tour →",
    welcomeSkip:    "Skip for now",
    welcomeHint:    "Press Enter to start · Esc to skip",
  },
};

// ── Bilingual step definitions ─────────────────────────────────────────────────
const LANDING_STEPS: TourStep[] = [
  {
    selector: "#hero-heading",
    title: { th: "ยินดีต้อนรับสู่ โตทัน 👋", en: "Welcome to โตทัน 👋" },
    body: {
      th: "ระบบ AI ประเมินอายุกระดูกสำหรับเด็กไทย ตามมาตรฐาน Greulich & Pyle ใช้เวลาเพียง 30 วินาทีต่อเคส",
      en: "AI bone age assessment for Thai children — Greulich & Pyle standard, 30 seconds per case.",
    },
    placement: "bottom",
  },
  {
    selector: "[data-tour='lang-toggle']",
    title: { th: "สลับภาษา", en: "Language Toggle" },
    body: {
      th: "กดปุ่มนี้เพื่อสลับระหว่างภาษาไทยและภาษาอังกฤษ ข้อความทั่วทั้งเว็บจะเปลี่ยนทันที",
      en: "Press this to switch between Thai and English. All text across the site updates instantly.",
    },
    placement: "bottom",
  },
  {
    selector: "[data-tour='nav-cta']",
    title: { th: "เริ่มใช้งานฟรี", en: "Get Started Free" },
    body: {
      th: "คลิกเพื่อเข้าสู่ระบบหรือสมัครสมาชิก รองรับทั้งแพทย์เด็กและผู้ปกครอง ไม่มีค่าใช้จ่าย",
      en: "Click to sign in or register. Available for pediatricians and parents — no cost.",
    },
    placement: "bottom",
  },
  {
    selector: "#how",
    title: { th: "ขั้นตอนการใช้งาน 3 ขั้น", en: "3-Step Workflow" },
    body: {
      th: "อัปโหลด X-ray → AI วิเคราะห์อัตโนมัติ → รับผลและส่งให้ผู้ปกครอง ง่ายและรวดเร็ว",
      en: "Upload X-ray → AI auto-analyzes → receive results and notify parents. Simple and fast.",
    },
    placement: "top",
  },
];

// Shared across every /dashboard* route regardless of role (all live in dashboard/layout.tsx)
const DASHBOARD_SHARED_STEPS: TourStep[] = [
  {
    selector: "[data-tour='logo']",
    title: { th: "โตทัน Dashboard", en: "โตทัน Dashboard" },
    body: {
      th: "คุณอยู่ใน Dashboard ศูนย์กลางจัดการผู้ป่วยและผลประเมิน คลิกโลโก้เพื่อกลับหน้าแรกเสมอ",
      en: "You're in the Dashboard — the hub for patient management and assessments. Click the logo to return home.",
    },
    placement: "right",
  },
  {
    selector: "[data-tour='user-card']",
    title: { th: "โปรไฟล์และบทบาทของคุณ", en: "Your Profile & Role" },
    body: {
      th: "แสดงชื่อและบทบาทของคุณ (แพทย์ ผู้ปกครอง หรือผู้ดูแลระบบ) เมนูและสิทธิ์การเข้าถึงจะปรับตามบทบาทโดยอัตโนมัติ",
      en: "Shows your name and role (Doctor, Parent, or Admin). Menu items and permissions adapt automatically to your role.",
    },
    placement: "right",
  },
  {
    selector: "[data-tour='nav']",
    title: { th: "เมนูนำทางหลัก", en: "Main Navigation" },
    body: {
      th: "เมนูจะปรับตามบทบาท: แพทย์เห็นผู้ป่วยและรายงาน PDF, ผู้ปกครองเห็นบุตรหลานและคำแนะนำ, ผู้ดูแลระบบเห็นภาพรวมระบบทั้งหมด",
      en: "The menu adapts to your role: Doctors see Patients and PDF Reports, Parents see Children and Recommendations, Admins see the full system overview.",
    },
    placement: "right",
  },
];

// Doctor overview page only (/dashboard)
const DOCTOR_STEPS: TourStep[] = [
  {
    selector: "[data-tour='stats']",
    title: { th: "ภาพรวมกิจกรรมของคุณหมอ", en: "Your Activity Overview" },
    body: {
      th: "สถิติแบบ real-time: จำนวนผู้ป่วยในการดูแล, การประเมินวันนี้, เคสที่รอผล AI และคำแนะนำที่ส่งให้ผู้ปกครองแล้ว",
      en: "Real-time stats: patients under your care, today's assessments, cases awaiting AI, and recommendations sent to parents.",
    },
    placement: "top",
  },
  {
    selector: "[data-tour='patient-list']",
    title: { th: "รายชื่อผู้ป่วย — เปิดแฟ้มเคสที่นี่", en: "Patient List — Open a Case" },
    body: {
      th: "แฟ้มเคสของผู้ป่วยแต่ละคนคือที่ทำงานหลักของคุณหมอ: อัปโหลด X-ray, รีวิว/ปรับผล AI, พิมพ์รายงาน PDF และส่งผลให้ผู้ปกครอง — กด \"ถัดไป\" แล้วทัวร์จะพาเข้าแฟ้มเคสคนแรกต่อเลย",
      en: "Each patient's case file is your main workspace: upload X-rays, review/adjust AI results, print PDF reports, and send results to parents. Press \"Next\" and the tour will take you into the first case.",
    },
    placement: "top",
    navigateNext: "[data-tour='patient-row']", // กดถัดไป = เข้าแฟ้มเคสคนแรก แล้วทัวร์ต่อในหน้านั้น
  },
];

// Parent overview page only (/dashboard)
const PARENT_STEPS: TourStep[] = [
  {
    selector: "[data-tour='stats']",
    title: { th: "สรุปข้อมูลของลูกคุณ", en: "Your Child's Summary" },
    body: {
      th: "ภาพรวมล่าสุด: จำนวนบุตรหลาน, การประเมินวันนี้, รายการที่รอผล และคำแนะนำใหม่จากแพทย์ที่ยังไม่ได้อ่าน",
      en: "At a glance: your children, today's assessments, pending items, and unread recommendations from the doctor.",
    },
    placement: "top",
  },
  {
    selector: "[data-tour='nav-rec']",
    title: { th: "เมนูคำแนะนำจากแพทย์", en: "Doctor's Recommendations" },
    body: {
      th: "เมื่อคุณหมอส่งผลตรวจ คำแนะนำและวันนัดจะมาที่เมนูนี้ (พร้อมอีเมลแจ้งเตือน) — รายการที่ยังไม่อ่านจะมีป้ายกำกับ",
      en: "When the doctor sends results, recommendations and follow-up dates appear here (you'll also get an email). Unread items are flagged.",
    },
    placement: "right",
  },
  {
    selector: "[data-tour='patient-list']",
    title: { th: "บุตรหลานของคุณ", en: "Your Children" },
    body: {
      th: "หน้าประวัติของลูกแต่ละคนรวมทุกอย่างไว้: ผลประเมินอายุกระดูก, กราฟการเจริญเติบโตเทียบเกณฑ์ WHO และรายงาน PDF — กด \"ถัดไป\" แล้วทัวร์จะพาเข้าหน้าของลูกคนแรกต่อเลย",
      en: "Each child's page has everything: bone age results, WHO growth charts, and the PDF report. Press \"Next\" and the tour will take you into your first child's page.",
    },
    placement: "top",
    navigateNext: "[data-tour='patient-row']", // กดถัดไป = เข้าหน้าลูกคนแรก แล้วทัวร์ต่อในหน้านั้น
  },
];

// Patient detail page (/dashboard/patients/[id]) — doctor (ส่วนบนหน้า ก่อนเข้าพาเนล)
const PATIENT_DETAIL_DOCTOR_PAGE_STEPS: TourStep[] = [
  {
    selector: "[data-tour='new-assessment']",
    title: { th: "สร้างการประเมินใหม่", en: "New Assessment" },
    body: {
      th: "กดปุ่มนี้เพื่ออัปโหลดภาพ X-ray มือซ้าย พร้อมส่วนสูง/น้ำหนัก แล้ว AI จะวิเคราะห์อายุกระดูกให้ภายใน ~30 วินาที",
      en: "Upload a left-hand X-ray with height/weight, and the AI estimates bone age in ~30 seconds.",
    },
    placement: "bottom",
  },
  {
    selector: "[data-tour='charts']",
    title: { th: "กราฟการเจริญเติบโต", en: "Growth Charts" },
    body: {
      th: "ซ้าย: ส่วนสูงจริงเทียบเกณฑ์ WHO (P3/P50/P97) · ขวา: ส่วนสูงที่ AI พยากรณ์ตอนโต (FAH) เทียบส่วนสูงเป้าหมายตามพันธุกรรม (TH)",
      en: "Left: actual height vs WHO reference (P3/P50/P97). Right: AI-predicted adult height (FAH) vs genetic target height (TH).",
    },
    placement: "top",
  },
  {
    selector: "[data-tour='assessment-history']",
    title: { th: "ประวัติการประเมิน", en: "Assessment History" },
    body: {
      th: "ทุกการตรวจของผู้ป่วยรายนี้ เรียงครั้งล่าสุดขึ้นก่อน แต่ละรายการแสดงสถานะ, อายุกระดูก, ความมั่นใจ AI และปุ่มดูรายละเอียด/พิมพ์รายงาน",
      en: "Every assessment for this patient, newest first, with status, bone age, AI confidence, and detail/print buttons.",
    },
    placement: "top",
  },
  {
    selector: "[data-tour='detail-btn']",
    title: { th: "ปุ่ม \"ดูรายละเอียด\" — รีวิวผลที่นี่", en: "\"View Details\" — Review Here" },
    body: {
      th: "ข้างในคือขั้นตอนสำคัญที่สุด: ดู X-ray/Heatmap, รีวิวผล AI (ยืนยันตามเดิมหรือปรับค่า) และส่งผล+วันนัดให้ผู้ปกครอง — กด \"ถัดไป\" แล้วทัวร์จะเปิดพาเนลพาไปดูทีละปุ่มเลย",
      en: "Inside is the most important workflow: the X-ray/heatmap, reviewing the AI result (confirm or adjust), and sending results + follow-up to the parent. Press \"Next\" and the tour will open the panel and walk you through it.",
    },
    placement: "top",
    advanceClick: "[data-tour='detail-btn']", // กดถัดไป = เปิดพาเนลรายละเอียดของเคสล่าสุดให้เลย
  },
];

// ปุ่มพิมพ์ PDF — step ปิดท้ายหลังทัวร์พากลับออกมาจากพาเนล
const PRINT_BTN_STEP: TourStep = {
  selector: "[data-tour='print-btn']",
  title: { th: "ปุ่ม \"พิมพ์รายงาน PDF\"", en: "\"Print PDF Report\" Button" },
  body: {
    th: "เปิดรายงานฉบับทางการขนาด A4 (ผลวิเคราะห์ กราฟ ลายเซ็นแพทย์) จากนั้นกด \"พิมพ์ / Save as PDF\" เพื่อสั่งพิมพ์หรือบันทึกเป็นไฟล์ PDF",
    en: "Opens the official A4 report (results, charts, physician signature). Then press \"Print / Save as PDF\" to print or save it as a PDF file.",
  },
  placement: "top",
};

// Assessment detail panel (เปิดจากปุ่ม "ดูรายละเอียด") — doctor workflow: รีวิว → ยืนยัน/ปรับ → นัด+ส่ง
// ใช้เมื่อพาเนลเปิดค้างอยู่ตอนกดปุ่มคู่มือ (ดู panelMode ใน TourProvider)
const ASSESSMENT_PANEL_DOCTOR_STEPS: TourStep[] = [
  {
    selector: "[data-tour='review-card']",
    title: { th: "ตรวจทานผล AI ก่อนส่ง", en: "Review the AI Result First" },
    body: {
      th: "ผลทุกใบต้องผ่านตาแพทย์ก่อน — ผู้ปกครองจะยังไม่เห็นผลนี้ในแอปจนกว่าคุณหมอจะรีวิวและกดส่ง การ์ดนี้คือจุดตัดสินใจ: เห็นด้วยกับ AI หรือจะปรับค่า",
      en: "Every result passes through the doctor first — the parent can't see it until you review and send. This card is the decision point: agree with the AI, or adjust.",
    },
    placement: "left",
  },
  {
    selector: "[data-tour='confirm-btn']",
    title: { th: "ยืนยันผลตามนี้ ✓", en: "Confirm As-Is ✓" },
    body: {
      th: "ถ้าเห็นด้วยกับผล AI กดปุ่มนี้ได้เลยโดยไม่ต้องแก้อะไร — ระบบจะติดป้าย \"แพทย์ตรวจสอบแล้ว\" ให้ผู้ปกครองมั่นใจว่าผลผ่านการรีวิวจากแพทย์จริง",
      en: "Agree with the AI? Press this — no edits needed. The result gets a \"Doctor reviewed\" badge so the parent knows a physician verified it.",
    },
    placement: "left",
  },
  {
    selector: "[data-tour='adjust-btn']",
    title: { th: "ปรับผลตามดุลยพินิจ", en: "Adjust the Values" },
    body: {
      th: "ถ้าผล AI ไม่ตรงตามดุลยพินิจ กดเพื่อแก้อายุกระดูก ส่วนสูงพยากรณ์ (FAH) และการแปลผล — ระบบเก็บค่าดิบจาก AI ไว้เทียบให้เสมอ และติดป้าย \"แพทย์ปรับผลแล้ว\"",
      en: "If the AI doesn't match your judgment, adjust the bone age, predicted adult height (FAH), and interpretation. The original AI values are kept for comparison, and the result is tagged \"Doctor adjusted\".",
    },
    placement: "left",
  },
  {
    selector: "[data-tour='notify-card']",
    title: { th: "นัดติดตาม + ส่งผลให้ผู้ปกครอง", en: "Follow-up & Send to Parent" },
    body: {
      th: "ขั้นสุดท้าย: กำหนดวันนัดติดตาม (เลือกเวลาและเขียนคำแนะนำเพิ่มได้) แล้วกดส่ง — ผู้ปกครองจะได้รับอีเมลสรุปผล เห็นผลในแอป และอ่านคำแนะนำได้ในเมนูคำแนะนำจากแพทย์",
      en: "Final step: set the follow-up date (time and a note are optional) and press send — the parent gets a summary email, the result unlocks in their app, and your note appears in their Recommendations menu.",
    },
    placement: "left",
    // ในทัวร์ต่อเนื่อง: กดถัดไป = ปิดพาเนลกลับไปจบที่ปุ่ม PDF (ถ้าเป็น step สุดท้าย เช่น
    // ทัวร์โหมดพาเนลเดี่ยว จะไม่คลิก — พาเนลค้างไว้ให้ใช้งานต่อ)
    advanceClick: "[data-tour='panel-close']",
  },
];

// ทัวร์ต่อเนื่องของแพทย์ในหน้าเคส: ส่วนบนหน้า → เปิดพาเนลอัตโนมัติ → รีวิว/ยืนยัน/ปรับ/นัด → ปิดพาเนล → PDF
const PATIENT_DETAIL_DOCTOR_STEPS: TourStep[] = [
  ...PATIENT_DETAIL_DOCTOR_PAGE_STEPS,
  ...ASSESSMENT_PANEL_DOCTOR_STEPS,
  PRINT_BTN_STEP,
];

// Patient detail page (/dashboard/patients/[id]) — parent
const PATIENT_DETAIL_PARENT_STEPS: TourStep[] = [
  {
    selector: "[data-tour='charts']",
    title: { th: "กราฟการเติบโตของลูก", en: "Your Child's Growth Charts" },
    body: {
      th: "ซ้าย: ส่วนสูงของลูกเทียบเกณฑ์เด็กปกติ (WHO) · ขวา: ส่วนสูงตอนโตที่ AI คาดการณ์ เทียบกับเป้าหมายตามพันธุกรรมจากส่วนสูงพ่อแม่",
      en: "Left: your child's height vs the WHO standard. Right: the AI's predicted adult height vs the genetic target from parents' heights.",
    },
    placement: "top",
  },
  {
    selector: "[data-tour='assessment-history']",
    title: { th: "ประวัติการตรวจทั้งหมด", en: "All Assessments" },
    body: {
      th: "ผลตรวจทุกครั้งของลูก เรียงครั้งล่าสุดขึ้นก่อน พร้อมอายุกระดูก ส่วนสูง น้ำหนัก และวันนัดติดตามครั้งถัดไป",
      en: "Every visit's results, newest first, with bone age, height, weight, and the next follow-up date.",
    },
    placement: "top",
  },
  {
    selector: "[data-tour='detail-btn']",
    title: { th: "ปุ่ม \"ดูรายละเอียด\"", en: "\"View Details\" Button" },
    body: {
      th: "เปิดดูภาพ X-ray, Heatmap ที่ AI ใช้วิเคราะห์, ตัวเลขเชิงลึก (เปอร์เซนไทล์ BMI ฯลฯ) และคำอธิบายผลแบบเข้าใจง่าย",
      en: "See the X-ray, the AI heatmap, detailed metrics (percentiles, BMI, etc.), and an easy-to-understand interpretation.",
    },
    placement: "top",
  },
  {
    selector: "[data-tour='print-btn']",
    title: { th: "ปุ่ม \"พิมพ์รายงาน PDF\"", en: "\"Print PDF Report\" Button" },
    body: {
      th: "เปิดรายงานฉบับเต็มขนาด A4 เก็บไว้หรือนำไปให้แพทย์ท่านอื่นดูได้ — กด \"พิมพ์ / Save as PDF\" เพื่อบันทึกเป็นไฟล์",
      en: "Opens the full A4 report to keep or share with another doctor. Press \"Print / Save as PDF\" to save it as a file.",
    },
    placement: "top",
  },
];

// Admin overview page only (/dashboard/admin)
const ADMIN_STEPS: TourStep[] = [
  {
    selector: "[data-tour='admin-services']",
    title: { th: "สถานะระบบแบบ Real-time", en: "Real-Time System Health" },
    body: {
      th: "ตรวจสอบสถานะจริงของทุก microservice (Auth, Patient, AI, Notify) พร้อมเวลาตอบสนอง อัปเดตอัตโนมัติทุก 30 วินาที",
      en: "Live status for every microservice (Auth, Patient, AI, Notify) with real response latency, auto-refreshed every 30 seconds.",
    },
    placement: "top",
  },
  {
    selector: "[data-tour='admin-analytics']",
    title: { th: "สถิติแพลตฟอร์ม (ข้อมูลจริง)", en: "Platform Analytics (Real Data)" },
    body: {
      th: "ตัวเลขทั้งหมดดึงจากฐานข้อมูลจริง คลิกการ์ด 'การสแกน', 'แพทย์' หรือ 'ผู้ปกครอง' เพื่อดูรายชื่อทั้งหมดแบบละเอียด",
      en: "Every number here is pulled from the live database. Click the Scans, Doctors, or Parents card to view the full detailed list.",
    },
    placement: "top",
  },
];

// ── Context ────────────────────────────────────────────────────────────────────
const TourContext = createContext<TourCtx>({
  start: () => {}, stop: () => {}, isActive: false, isWelcomeActive: false,
});
export function useTour() { return useContext(TourContext); }

// ── Positioning helpers ────────────────────────────────────────────────────────
const TW  = 320;
const TTH = 220;  // increased from 180 to handle longer Thai text
const GAP = 14;
const PAD = 10;

// จอแคบ (มือถือแนวตั้ง) tooltip ต้องไม่ล้นขอบจอ
function tooltipWidth() {
  return Math.min(TW, window.innerWidth - PAD * 2);
}

// element ต้อง "มองเห็นได้จริง" — บนมือถือ sidebar ถูกเลื่อนออกนอกจอ (drawer ปิด)
// querySelector ยังเจอ element แต่ spotlight จะชี้ไปนอกจอ จึงต้องข้าม step นั้น
function stepTargetVisible(selector: string): boolean {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 8 && r.left < window.innerWidth - 8;
}

function bestPlacement(r: SpotRect, hint?: TourStep["placement"]): Placement {
  const tw = tooltipWidth();
  const { innerWidth: vw, innerHeight: vh } = window;
  // จอแคบ: ซ้าย/ขวาไม่มีที่วางแน่นอน — บังคับ top/bottom แม้ step จะ hint ไว้
  const narrow = vw < TW + 2 * (GAP + PAD) + 80;
  if (hint && hint !== "auto" && !(narrow && (hint === "left" || hint === "right"))) {
    return hint as Placement;
  }
  const space: Record<Placement, number> = {
    right:  vw - (r.left + r.width) - PAD,
    left:   r.left - PAD,
    bottom: vh - (r.top + r.height) - PAD,
    top:    r.top - PAD,
  };
  const need: Record<Placement, number> = { right: tw, left: tw, bottom: TTH, top: TTH };
  const order: Placement[] = narrow
    ? ["bottom", "top", "right", "left"]
    : ["right", "bottom", "left", "top"];
  for (const p of order) {
    if (space[p] >= need[p]) return p;
  }
  return "bottom";
}

function tooltipPos(r: SpotRect, p: Placement): { top: number; left: number } {
  const tw = tooltipWidth();
  const { innerWidth: vw, innerHeight: vh } = window;
  let t = 0, l = 0;
  switch (p) {
    case "right":  t = r.top + r.height / 2 - TTH / 2; l = r.left + r.width + GAP; break;
    case "left":   t = r.top + r.height / 2 - TTH / 2; l = r.left - tw - GAP;      break;
    case "bottom": t = r.top + r.height + GAP;           l = r.left + r.width / 2 - tw / 2; break;
    case "top":    t = r.top - TTH - GAP;                l = r.left + r.width / 2 - tw / 2; break;
  }
  return {
    top:  Math.max(PAD, Math.min(t, vh - TTH - PAD)),
    left: Math.max(PAD, Math.min(l, vw - tw  - PAD)),
  };
}

// ── WelcomeGate — pre-tour splash modal ───────────────────────────────────────
function WelcomeGate({
  lang, steps, onStart, onSkip,
}: { lang: Lang; steps: TourStep[]; onStart: () => void; onSkip: () => void }) {
  // Mark as seen immediately so intra-session navigation doesn't re-trigger
  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("dashTourSeen", "1");
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStart(); }
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart, onSkip]);

  const ui = UI[lang];

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9998 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px]"
        onClick={onSkip}
        aria-hidden
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ui.welcomeTitle}
        className="relative glass-strong rounded-3xl p-8 shadow-2xl animate-welcome-in"
        style={{
          width: "min(360px, calc(100vw - 32px))",
          zIndex: 9999,
          boxShadow: "0 32px 80px -16px rgb(0 0 0 / 0.55), 0 0 0 1px rgb(var(--primary) / 0.20), inset 0 1px 0 rgb(255 255 255 / 0.12)",
        }}
      >
        {/* Ambient glow behind icon */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-50"
          style={{ background: "radial-gradient(circle, rgb(var(--primary)) 0%, transparent 70%)" }}
        />

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-float"
            style={{
              background: "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))",
              boxShadow: "0 8px 28px rgb(var(--primary)/0.45)",
            }}
          >
            🤖
          </div>
        </div>

        {/* Eyebrow */}
        <p className="text-center font-body text-[11px] font-semibold tracking-widest uppercase text-primary mb-2">
          {ui.welcomeEyebrow}
        </p>

        {/* Title */}
        <h2 className="text-center font-display font-bold text-[18px] text-ink leading-snug mb-3">
          {ui.welcomeTitle}
        </h2>

        {/* Body */}
        <p className="text-center font-body text-[13px] text-muted leading-relaxed mb-6">
          {ui.welcomeBody}
        </p>

        {/* Step count badge */}
        <div className="flex justify-center mb-5">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-body font-semibold"
            style={{ background: "rgb(var(--primary)/0.10)", color: "rgb(var(--primary))" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {ui.welcomeSteps(steps.length)}
          </span>
        </div>

        {/* Progress pill preview */}
        <div className="flex justify-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`inline-block rounded-full ${i === 0 ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border"}`}
            />
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onStart}
            className="relative flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl font-body font-semibold text-sm text-white overflow-hidden transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))",
              boxShadow: "0 6px 24px rgb(var(--primary)/0.42)",
            }}
          >
            <span className="shine relative z-10">{ui.welcomeStart}</span>
          </button>
          <button
            onClick={onSkip}
            className="w-full px-5 py-2.5 rounded-xl font-body font-medium text-sm text-muted hover:text-ink hover:bg-ink/[0.06] transition-colors"
          >
            {ui.welcomeSkip}
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-center font-body text-[10px] text-muted/60 mt-4">
          {ui.welcomeHint}
        </p>
      </div>
    </div>,
    document.body
  );
}

// ── TourOverlay ────────────────────────────────────────────────────────────────
function TourOverlay({
  steps, stepIndex, lang, onNext, onPrev, onClose,
}: {
  steps:     TourStep[];
  stepIndex: number;
  lang:      Lang;
  onNext:    () => void;
  onPrev:    () => void;
  onClose:   () => void;
}) {
  const step   = steps[stepIndex];
  const ui     = UI[lang];
  // step ที่พาไปหน้าถัดไป (navigateNext) ไม่ใช่จุดจบทัวร์ — ปุ่มต้องเป็น "ถัดไป" เสมอ
  const isLast = stepIndex === steps.length - 1 && !step.navigateNext;

  const [spot,  setSpot]  = useState<SpotRect | null>(null);
  const [place, setPlace] = useState<Placement>("bottom");
  const [ttPos, setTtPos] = useState({ top: 0, left: 0 });
  const roRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) return;
    const r    = el.getBoundingClientRect();
    const rect = { top: r.top, left: r.left, width: r.width, height: r.height };
    const p    = bestPlacement(rect, step.placement);
    setSpot(rect);
    setPlace(p);
    setTtPos(tooltipPos(rect, p));
  }, [step]);

  // เลื่อนจอไปหา element ของ step ก่อน (ปุ่มบางตัวอยู่ใต้ fold โดยเฉพาะบนมือถือ)
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [step]);

  useLayoutEffect(() => {
    measure();
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) return;
    roRef.current?.disconnect();
    roRef.current = new ResizeObserver(measure);
    roRef.current.observe(el);
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    return () => {
      roRef.current?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
    };
  }, [measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")                          onClose();
      if (e.key === "ArrowRight" || e.key === "Enter") onNext();
      if (e.key === "ArrowLeft")                       onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onPrev, onClose]);

  const arrowClass: Record<Placement, string> = {
    right:  "right-full top-1/2 -translate-y-1/2",
    left:   "left-full  top-1/2 -translate-y-1/2",
    bottom: "bottom-full left-1/2 -translate-x-1/2",
    top:    "top-full   left-1/2 -translate-x-1/2",
  };
  const arrowBorder: Record<Placement, string> = {
    right:  "border-r-[10px] border-r-transparent border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[10px]",
    left:   "border-l-[10px] border-l-transparent border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[10px]",
    bottom: "border-b-[10px] border-b-transparent border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px]",
    top:    "border-t-[10px] border-t-transparent border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[10px]",
  };

  return createPortal(
    <>
      {/* Click-away to close */}
      <div
        className="fixed inset-0 cursor-pointer"
        style={{ zIndex: 9990 }}
        onClick={onClose}
        aria-hidden
      />

      {/* Spotlight with pulsing glow border */}
      {spot && (
        <div
          className="pointer-events-none fixed rounded-xl"
          style={{
            zIndex:     9991,
            top:        spot.top    - 6,
            left:       spot.left   - 6,
            width:      spot.width  + 12,
            height:     spot.height + 12,
            border:     "2px solid rgb(var(--primary))",
            boxShadow:  "0 0 0 9999px rgba(0,0,0,0.72)",
            animation:  "spotlight-glow 2.4s ease-in-out infinite",
            transition: "top 0.3s cubic-bezier(0.16,1,0.3,1), left 0.3s cubic-bezier(0.16,1,0.3,1), width 0.3s cubic-bezier(0.16,1,0.3,1), height 0.3s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Corner accents */}
          <span className="absolute -top-px -left-px  w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-[10px]" />
          <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-[10px]" />
          <span className="absolute -bottom-px -left-px  w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-[10px]" />
          <span className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-[10px]" />
        </div>
      )}

      {/* Tooltip */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`${ui.aria}: ${stepIndex + 1} / ${steps.length}`}
        className="fixed glass-strong rounded-2xl p-5 shadow-2xl animate-step-in"
        style={{
          zIndex: 9997,
          width:  `min(${TW}px, calc(100vw - ${PAD * 2}px))`,
          ...ttPos,
          transition: "top 0.3s cubic-bezier(0.16,1,0.3,1), left 0.3s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "0 24px 64px -16px rgb(0 0 0 / 0.5), 0 0 0 1px rgb(var(--primary) / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.10)",
        }}
      >
        {/* Directional arrow */}
        <span
          aria-hidden
          className={`absolute pointer-events-none w-0 h-0 ${arrowClass[place]} ${arrowBorder[place]}`}
          style={{
            borderLeftColor:   place === "right"  ? "rgb(var(--glass))" : undefined,
            borderRightColor:  place === "left"   ? "rgb(var(--glass))" : undefined,
            borderTopColor:    place === "bottom" ? "rgb(var(--glass))" : undefined,
            borderBottomColor: place === "top"    ? "rgb(var(--glass))" : undefined,
          }}
        />

        {/* Progress pills */}
        <div className="flex items-center gap-1.5 mb-3.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`inline-block rounded-full transition-all duration-300 ${
                i === stepIndex ? "w-5 h-1.5 bg-primary"
                : i < stepIndex ? "w-1.5 h-1.5 bg-primary/50"
                : "w-1.5 h-1.5 bg-border"
              }`}
            />
          ))}
          <span className="ml-auto font-body text-[10px] text-muted tabular-nums">
            {stepIndex + 1}&thinsp;/&thinsp;{steps.length}
          </span>
        </div>

        {/* Content */}
        <h3 className="font-display font-bold text-[13px] text-ink leading-snug mb-1.5">
          {step.title[lang]}
        </h3>
        <p className="font-body text-xs text-muted leading-relaxed mb-4">
          {step.body[lang]}
        </p>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button
              onClick={onPrev}
              className="flex-none px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-muted hover:text-ink hover:bg-ink/8 transition-colors"
            >
              {ui.prev}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="flex-none px-3 py-1.5 rounded-lg text-xs font-body font-medium text-muted hover:text-danger transition-colors"
          >
            {ui.skip}
          </button>
          <button
            onClick={onNext}
            className="relative flex-none overflow-hidden flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-body font-semibold text-white transition-all hover:-translate-y-px active:scale-95"
            style={{
              background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))",
              boxShadow:  "0 4px 14px rgb(var(--primary)/0.40)",
            }}
          >
            <span className="shine relative z-10">
              {isLast ? ui.done : ui.next}
            </span>
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── TourButton — global FAB ────────────────────────────────────────────────────
function TourButton() {
  const { start, isActive, isWelcomeActive } = useTour();
  const { lang } = useI18n();
  const ui = UI[lang];
  // Hide when tour or welcome gate is already open
  if (isActive || isWelcomeActive) return null;
  return (
    <button
      onClick={start}
      title={ui.aria}
      aria-label={ui.aria}
      className="group flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-body font-semibold text-white transition-all duration-300 hover:-translate-y-1 active:scale-95"
      style={{
        background: "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))",
        boxShadow:  "0 8px 28px rgb(var(--primary)/0.42)",
      }}
    >
      <svg
        className="w-4 h-4 flex-shrink-0 transition-transform group-hover:rotate-12"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
      {ui.btn}
    </button>
  );
}

// ── TourProvider ───────────────────────────────────────────────────────────────
// Cached role read (same localStorage shape dashboard/layout.tsx uses) — avoids
// waiting on an async /auth/me call just to pick which tour steps to show.
function getCachedRole(): string | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") || "{}").role ?? null; } catch { return null; }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive,     setIsActive]     = useState(false);
  const [stepIndex,    setStepIndex]    = useState(0);
  const [mounted,      setMounted]      = useState(false);
  const [showWelcome,  setShowWelcome]  = useState(false);
  const [role,         setRole]         = useState<string | null>(null);
  // ทัวร์โหมดพาเนล — ถ้าแพทย์เปิดพาเนล "ดูรายละเอียด" ค้างอยู่ตอนกดปุ่มคู่มือ
  // จะสอน workflow ในพาเนลแทน (รีวิว → ยืนยัน/ปรับผล → นัด+ส่งให้ผู้ปกครอง)
  const [panelMode,    setPanelMode]    = useState(false);
  // จอ ≥ md เท่านั้นที่ mount มาสคอต 3D — CSS hidden อย่างเดียวไม่พอ เพราะยังดาวน์โหลด chunk อยู่ดี
  const [isDesktop,    setIsDesktop]    = useState(false);
  // พาเนลข้างฝั่งขวา (รายละเอียดผล/ประเมินใหม่/ตั้งค่า) เปิดอยู่ — มาสคอตต้องหลบ
  // ไม่งั้นบังปุ่มส่งผล/ฟอร์มในพาเนล; ปุ่มคู่มือย้ายไปมุมซ้ายแทน (ยังต้องกดได้เพื่อทัวร์โหมดพาเนล)
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const { lang } = useI18n();
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setRole(getCachedRole()); }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // เฝ้าดู DOM หา [data-side-panel] — พาเนลพวกนี้ mount/unmount ตาม state ภายในหน้า
  // ไม่มี event กลางให้ฟัง จึงใช้ MutationObserver (querySelector ถูกมาก ไม่กระทบ perf)
  useEffect(() => {
    const check = () => setSidePanelOpen(!!document.querySelector("[data-side-panel]"));
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // Route- and role-aware step set
  const isPatientDetail =
    /^\/dashboard\/patients\/[^/]+$/.test(pathname) && pathname !== "/dashboard/patients/new";
  const pageSteps = isPatientDetail
    ? (role === "doctor" ? PATIENT_DETAIL_DOCTOR_STEPS : PATIENT_DETAIL_PARENT_STEPS)
    : pathname.startsWith("/dashboard")
      ? [
          ...DASHBOARD_SHARED_STEPS,
          ...(role === "admin" ? ADMIN_STEPS : role === "doctor" ? DOCTOR_STEPS : PARENT_STEPS),
        ]
      : LANDING_STEPS;
  const steps = panelMode && role === "doctor" && isPatientDetail
    ? ASSESSMENT_PANEL_DOCTOR_STEPS
    : pageSteps;

  // Reset tour + welcome gate on navigation — แต่ถ้าเป็นการนำทาง "ต่อทัวร์ข้ามหน้า"
  // (navigateNext ตั้ง sessionStorage ไว้) ให้ลองสตาร์ททัวร์ของหน้าใหม่อัตโนมัติ
  // — retry เพราะหน้าใหม่ต้อง fetch ข้อมูลก่อน element เป้าหมายถึงจะโผล่
  useEffect(() => {
    setIsActive(false);
    setStepIndex(0);
    setShowWelcome(false);
    setPanelMode(false);
    if (typeof sessionStorage === "undefined" || sessionStorage.getItem("tourResume") !== "1") return;
    sessionStorage.removeItem("tourResume");
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (startRef.current() || tries >= 20) clearInterval(timer); // สูงสุด ~8 วิ
    }, 400);
    return () => clearInterval(timer);
  }, [pathname]);

  // Auto-show welcome gate on each role's overview page, once per session
  useEffect(() => {
    if (!mounted) return;
    if (pathname !== "/dashboard" && pathname !== "/dashboard/admin") return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("dashTourSeen")) return;
    const timer = setTimeout(() => setShowWelcome(true), 700);
    return () => clearTimeout(timer);
  }, [mounted, pathname]);

  const stop = useCallback(() => {
    setIsActive(false);
    setStepIndex(0);
  }, []);

  // คืน true เมื่อสตาร์ทสำเร็จ — resume ข้ามหน้าใช้ค่านี้ตัดสินใจว่าจะ retry ต่อไหม
  const start = useCallback((): boolean => {
    setShowWelcome(false);
    // ตัดสินใจตอนกดปุ่มเท่านั้น: พาเนลรายละเอียดผลเปิดอยู่ → ใช้ชุด step ของพาเนลแทน
    const panelOpen =
      role === "doctor" && isPatientDetail &&
      (stepTargetVisible("[data-tour='review-card']") || stepTargetVisible("[data-tour='notify-card']"));
    setPanelMode(panelOpen);
    // ใช้ pageSteps (ไม่ใช่ steps) กัน closure ค้างชุดพาเนลจากทัวร์รอบก่อน
    const effective = panelOpen ? ASSESSMENT_PANEL_DOCTOR_STEPS : pageSteps;
    // เริ่มที่ step แรกที่มี element มองเห็นได้จริง (ปุ่มบางตัวยังไม่มี / sidebar ปิดอยู่บนมือถือ)
    let idx = 0;
    while (idx < effective.length && !stepTargetVisible(effective[idx].selector)) idx++;
    if (idx >= effective.length) return false;
    setStepIndex(idx);
    setIsActive(true);
    return true;
  }, [pageSteps, role, isPatientDetail]);

  // ref ล่าสุดของ start — effect ตอนเปลี่ยนหน้า (resume ข้ามหน้า) ต้องเรียกเวอร์ชันใหม่เสมอ
  const startRef = useRef(start);
  useEffect(() => { startRef.current = start; }, [start]);

  // Skip steps whose target element doesn't exist (or is off-screen) on the current page
  const advanceOrStop = useCallback((idx: number) => {
    if (idx >= steps.length) { stop(); return; }
    if (!stepTargetVisible(steps[idx].selector)) { advanceOrStop(idx + 1); return; }
    setStepIndex(idx);
  }, [steps, stop]);

  // หลัง advanceClick (เปิด/ปิดพาเนล) DOM ต้องใช้เวลา render — รอ target ของ step ถัดไป
  // สูงสุด ~1.2 วิ ก่อนยอมแพ้แล้วปล่อยให้ logic ข้าม step ทำงานตามปกติ
  const waitAdvance = useCallback((idx: number, tries = 0) => {
    if (idx >= steps.length) { stop(); return; }
    if (stepTargetVisible(steps[idx].selector)) { setStepIndex(idx); return; }
    if (tries >= 20) { advanceOrStop(idx); return; }
    setTimeout(() => waitAdvance(idx, tries + 1), 60);
  }, [steps, stop, advanceOrStop]);

  const next = useCallback(() => {
    const cur = steps[stepIndex];
    const hasNext = stepIndex + 1 < steps.length;
    // ทัวร์ต่อเนื่องข้ามหน้า: คลิกลิงก์นำทาง (เช่น แถวผู้ป่วยคนแรก) แล้วให้ effect
    // ตอนเปลี่ยน pathname สตาร์ททัวร์ของหน้าใหม่ต่อผ่าน sessionStorage
    if (cur?.navigateNext) {
      const el = document.querySelector<HTMLElement>(cur.navigateNext);
      if (el) {
        sessionStorage.setItem("tourResume", "1");
        el.click();
        return;
      }
      // ไม่มีรายการให้เข้า (เช่น ยังไม่มีผู้ป่วย) — จบทัวร์ตามปกติ
      stop();
      return;
    }
    // คลิก element ประกอบ (เช่น เปิดพาเนลรายละเอียด/ปิดพาเนลกลับหน้าเดิม) เฉพาะเมื่อมี step ต่อ
    if (cur?.advanceClick && hasNext) {
      document.querySelector<HTMLElement>(cur.advanceClick)?.click();
      waitAdvance(stepIndex + 1);
      return;
    }
    advanceOrStop(stepIndex + 1);
  }, [stepIndex, steps, advanceOrStop, waitAdvance, stop]);

  // ย้อนกลับแบบข้าม step ที่มองไม่เห็น (เช่น step ในพาเนลที่ถูกปิดไปแล้ว)
  const prev = useCallback(() => {
    let i = stepIndex - 1;
    while (i >= 0 && !stepTargetVisible(steps[i].selector)) i--;
    if (i >= 0) setStepIndex(i);
  }, [stepIndex, steps]);

  return (
    <TourContext.Provider value={{ start, stop, isActive, isWelcomeActive: showWelcome }}>
      {children}

      {/* Mascot + Tutorial button — shared fixed container, mascot above as first sibling
          (ซ่อนบนหน้า login/register — ไม่มี tour ให้เล่นที่นั่น) */}
      {mounted && !isActive && !showWelcome && !pathname.startsWith("/login") && (
        <div
          // z สูงกว่าพาเนลรายละเอียดผล (z-50) — ปุ่มคู่มือต้องกดได้แม้พาเนลเปิดอยู่ (ทัวร์โหมดพาเนล)
          // พาเนลเปิด: ย้ายไปมุมซ้ายให้พ้นพาเนลฝั่งขวา และซ่อนมาสคอตไม่ให้บังเนื้อหา
          className={`fixed bottom-6 z-[60] flex flex-col items-center gap-0 print:hidden transition-all duration-300 ${
            sidePanelOpen ? "left-6" : "right-6"
          }`}
        >
          {/* จอเล็ก: ไม่ mount มาสคอตเลย — ประหยัดทั้ง three.js chunk และโมเดล 1.8MB */}
          {isDesktop && !sidePanelOpen && (
            <HippoMascot
              size="sm"
              message={lang === "th" ? "สวัสดีครับ! พร้อมช่วยติดตามการเติบโต" : "Hi! Ready to track growth"}
              className="mb-4"
            />
          )}
          <TourButton />
        </div>
      )}

      {mounted && showWelcome && (
        <WelcomeGate
          lang={lang}
          steps={steps}
          onStart={start}
          onSkip={() => setShowWelcome(false)}
        />
      )}

      {mounted && isActive && (
        <TourOverlay
          steps={steps}
          stepIndex={stepIndex}
          lang={lang}
          onNext={next}
          onPrev={prev}
          onClose={stop}
        />
      )}
    </TourContext.Provider>
  );
}
