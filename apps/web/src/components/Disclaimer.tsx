"use client";

import { useI18n } from "@/lib/i18n";

// ── License content ────────────────────────────────────────────────────────────
const LICENSE = {
  th: {
    heading: "ข้อตกลงในการใช้ซอฟต์แวร์",
    body: `ซอฟต์แวร์นี้เป็นผลงานที่พัฒนาขึ้นโดย ดนยกฤตย์ ภัทร์ธนะวัตน์, ทัศนัย ปักกังวะยัง, และ ศุภวิชญ์ ธรรมราษฎร์ จาก มหาวิทยาลัยมหิดล ภายใต้การดูแลของ นาย วรพันธ์ คู่สกุลนิรันดร์ ภายใต้โครงการ การพัฒนาระบบปัญญาประดิษฐ์ทำนายศักยภาพความสูงของเด็กไทยจากภาพถ่ายทางรังสี ซึ่งสนับสนุนโดย สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ โดยมีวัตถุประสงค์เพื่อส่งเสริมให้นักเรียนและนักศึกษาได้เรียนรู้และฝึกทักษะในการพัฒนาซอฟต์แวร์ ลิขสิทธิ์ของซอฟต์แวร์นี้จึงเป็นของผู้พัฒนา ซึ่งผู้พัฒนาได้อนุญาตให้สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ เผยแพร่ซอฟต์แวร์นี้ตาม "ต้นฉบับ" โดยไม่มีการแก้ไขดัดแปลงใด ๆ ทั้งสิ้น ให้แก่บุคคลทั่วไปได้ใช้เพื่อประโยชน์ส่วนบุคคลหรือประโยชน์ทางการศึกษาที่ไม่มีวัตถุประสงค์ในเชิงพาณิชย์ โดยไม่คิดค่าตอบแทนการใช้ซอฟต์แวร์ ดังนั้น สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ จึงไม่มีหน้าที่ในการดูแล บำรุงรักษา จัดการอบรมการใช้งาน หรือพัฒนาประสิทธิภาพซอฟต์แวร์ รวมทั้งไม่รับรองความถูกต้องหรือประสิทธิภาพการทำงานของซอฟต์แวร์ ตลอดจนไม่รับประกันความเสียหายต่าง ๆ อันเกิดจากการใช้ซอฟต์แวร์นี้ทั้งสิ้น`,
    disclaimer: "ข้อจำกัดความรับผิดชอบทางการแพทย์",
    disclaimerBody: `ระบบโตทันเป็นเครื่องมือช่วยคัดกรองและสนับสนุนการตัดสินใจทางคลินิกเท่านั้น ผลการวิเคราะห์อายุกระดูกจาก AI ไม่ถือเป็นการวินิจฉัยทางการแพทย์อย่างเป็นทางการ และไม่สามารถทดแทนการประเมินโดยแพทย์ผู้เชี่ยวชาญได้ การตัดสินใจทางคลินิกทุกประการควรอยู่ภายใต้การดูแลของแพทย์ที่มีใบอนุญาต โดยอาศัยข้อมูลทางคลินิกที่ครบถ้วนของผู้ป่วยแต่ละราย ผู้พัฒนาและหน่วยงานที่เกี่ยวข้องไม่รับผิดชอบต่อผลลัพธ์ทางการแพทย์ใด ๆ ที่เกิดจากการใช้ซอฟต์แวร์นี้`,
  },
  en: {
    heading: "License Agreement",
    body: `This software is a work developed by Donyakrit Paththanawath, Tussanai Pukkungvayung, and Suphawit Thammarat from Mahidol University under the provision of Mr. Worapan Kusakunniran under the project "Development of an Artificial Intelligence System for Predicting Final Adult Height Potential in Thai Children from Radiographic Images", which has been supported by the National Science and Technology Development Agency (NSTDA), in order to encourage pupils and students to learn and practice their skills in developing software. Therefore, the intellectual property of this software shall belong to the developer and the developer gives NSTDA a permission to distribute this software as an "as is" and non-modified software for a temporary and non-exclusive use without remuneration to anyone for his or her own purpose or academic purpose, which are not commercial purposes. In this connection, NSTDA shall not be responsible to the user for taking care, maintaining, training, or developing the efficiency of this software. Moreover, NSTDA shall not be liable for any error, software efficiency and damages in connection with or arising out of the use of the software.`,
    disclaimer: "Medical Disclaimer",
    disclaimerBody: `TotTan is a clinical decision-support and screening tool only. AI bone age analysis results do not constitute an official medical diagnosis and cannot replace assessment by a qualified physician. All clinical decisions must be made under the supervision of a licensed medical professional, taking into account the patient's complete clinical history. The developers and affiliated organizations accept no responsibility for any medical outcomes arising from the use of this software.`,
  },
};

const DEVELOPERS = [
  { name: "ดนยกฤตย์ ภัทร์ธนะวัตน์", nameEn: "Donyakrit Paththanawath" },
  { name: "ทัศนัย ปักกังวะยัง",      nameEn: "Tussanai Pukkungvayung"  },
  { name: "ศุภวิชญ์ ธรรมราษฎร์",     nameEn: "Suphawit Thammarat"      },
];

const SUPERVISOR = { name: "วรพันธ์ คู่สกุลนิรันดร์", nameEn: "Worapan Kusakunniran" };

// ── Icons ──────────────────────────────────────────────────────────────────────
function ScaleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className="w-4 h-4 flex-shrink-0 text-white">
      <path d="M12 3v18M3 7l9 4 9-4M3 17l9 4 9-4" />
      <path d="M3 7c0 2.5 2 4.5 4.5 4.5S12 9.5 12 7M12 7c0 2.5 2 4.5 4.5 4.5S21 9.5 21 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className="w-4 h-4 flex-shrink-0 text-white">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Disclaimer() {
  const { lang, toggle: toggleLang } = useI18n();
  const L = lang === "th" ? LICENSE.th : LICENSE.en;

  return (
    <section
      aria-labelledby="disclaimer-heading"
      className="relative py-16 sm:py-20 px-4 sm:px-6 border-t border-border/60 bg-bg overflow-hidden"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-[0.06]"
        style={{ background: "rgb(var(--aurora-1))" }}
        aria-hidden
      />

      <div className="relative max-w-4xl mx-auto">

        {/* ── Section header ───────────────────────────────────────────────── */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/70 glass-tile mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgb(var(--primary))" }} aria-hidden />
            <span className="font-body text-[11px] font-semibold text-muted tracking-wide uppercase">
              NSC 2026 · NSTDA · Mahidol University
            </span>
          </div>

          <h2 id="disclaimer-heading" className="font-display font-bold text-xl sm:text-2xl text-ink leading-snug">
            {lang === "th" ? "ข้อตกลงและข้อจำกัดความรับผิดชอบ" : "License & Disclaimer"}
          </h2>

          {/* Language toggle */}
          <div className="flex items-center justify-center mt-4">
            <button
              onClick={toggleLang}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-body font-semibold border border-border/60 glass-tile text-muted hover:text-primary hover:border-primary/40 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
              </svg>
              {lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
            </button>
          </div>
        </header>

        {/* ── Unified content block ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* License Agreement */}
          <article className="glass rounded-2xl p-6 sm:p-7" lang={lang}>
            <header className="flex items-center gap-2.5 mb-4">
              <span
                className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
                style={{ background: "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))", boxShadow: "0 4px 12px rgb(var(--primary)/0.3)" }}
                aria-hidden="true"
              >
                <ScaleIcon />
              </span>
              <h3 className="font-display font-bold text-base text-ink">{L.heading}</h3>
              <span
                className="ml-auto flex-shrink-0 text-[10px] font-body font-semibold px-2 py-0.5 rounded-md"
                style={{ background: "rgb(var(--primary)/0.12)", color: "rgb(var(--primary))" }}
              >
                {lang === "th" ? "ภาษาไทย" : "English"}
              </span>
            </header>
            <div className="h-px bg-border/60 mb-4" role="separator" />
            <p
              className="font-body text-[13px] sm:text-sm text-muted leading-[1.9]"
              style={{ fontFamily: lang === "th" ? "var(--font-sarabun), system-ui, sans-serif" : undefined }}
            >
              {L.body}
            </p>
          </article>

          {/* Medical Disclaimer */}
          <article className="glass rounded-2xl p-6 sm:p-7" lang={lang}
            style={{ borderColor: "rgb(var(--warning)/0.35)" }}>
            <header className="flex items-center gap-2.5 mb-4">
              <span
                className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
                style={{ background: "linear-gradient(135deg, rgb(var(--warning)), rgb(var(--accent)))", boxShadow: "0 4px 12px rgb(var(--warning)/0.3)" }}
                aria-hidden="true"
              >
                <ShieldIcon />
              </span>
              <h3 className="font-display font-bold text-base text-ink">{L.disclaimer}</h3>
              <span
                className="ml-auto flex-shrink-0 text-[10px] font-body font-semibold px-2 py-0.5 rounded-md"
                style={{ background: "rgb(var(--warning)/0.12)", color: "rgb(var(--warning))" }}
              >
                {lang === "th" ? "สำคัญ" : "Important"}
              </span>
            </header>
            <div className="h-px bg-border/60 mb-4" role="separator" />
            <p
              className="font-body text-[13px] sm:text-sm text-muted leading-[1.9]"
              style={{ fontFamily: lang === "th" ? "var(--font-sarabun), system-ui, sans-serif" : undefined }}
            >
              {L.disclaimerBody}
            </p>
          </article>

        </div>

        {/* ── Team & attribution strip ─────────────────────────────────────── */}
        <footer className="mt-6 glass-tile rounded-2xl border border-border/60 px-5 py-5 sm:px-7">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">

            {/* Developers */}
            <div className="flex-1 min-w-0">
              <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-widest mb-3">
                Developed by
              </p>
              <ul className="flex flex-col gap-2" aria-label="Development team">
                {DEVELOPERS.map((d, i) => (
                  <li key={i} className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))" }}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="font-body font-semibold text-sm text-ink">{d.name}</span>
                    <span className="font-body text-[11px] text-muted">({d.nameEn})</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden sm:block w-px self-stretch bg-border/60" role="separator" aria-hidden />
            <div className="sm:hidden h-px bg-border/60" role="separator" aria-hidden />

            {/* Supervisor + Institutions */}
            <div className="flex flex-col gap-4 sm:min-w-[200px]">
              <div>
                <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-widest mb-2">Supervisor</p>
                <p className="font-body text-sm font-semibold text-ink">{SUPERVISOR.name}</p>
                <p className="font-body text-[11px] text-muted">{SUPERVISOR.nameEn}</p>
              </div>
              <div>
                <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-widest mb-2">Supported by</p>
                <div className="flex flex-col gap-1.5">
                  {[
                    { short: "MU",    full: "Mahidol University"                                },
                    { short: "NSTDA", full: "National Science and Technology Development Agency" },
                  ].map((org) => (
                    <div key={org.short} className="flex items-center gap-2">
                      <span
                        className="flex-shrink-0 font-body text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: "rgb(var(--primary)/0.12)", color: "rgb(var(--primary))" }}
                      >
                        {org.short}
                      </span>
                      <span className="font-body text-[11px] text-muted leading-tight">{org.full}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
            <p className="font-body text-[11px] text-muted">
              © {new Date().getFullYear()} โตทัน — Bone Age AI Assessment System
            </p>
            <p className="font-body text-[11px] text-muted">Non-commercial · Educational use only</p>
          </div>
        </footer>

      </div>
    </section>
  );
}
