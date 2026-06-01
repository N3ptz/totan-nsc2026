"use client";

import { useEffect, useRef } from "react";

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-up");
            (entry.target as HTMLElement).style.opacity = "1";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-bg overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-display font-semibold text-primary tracking-tight">
            โตทัน
          </span>
          <span className="text-xs font-body font-medium text-muted bg-primary-light text-primary px-2 py-0.5 rounded-full">
            NSC 2026
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-body font-medium text-muted">
          <a href="#features" className="hover:text-ink transition-colors">ฟีเจอร์</a>
          <a href="#how" className="hover:text-ink transition-colors">วิธีใช้งาน</a>
          <a href="#about" className="hover:text-ink transition-colors">เกี่ยวกับ</a>
        </div>
        <button className="bg-primary hover:bg-primary-dark text-white text-sm font-body font-medium px-5 py-2.5 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 active:scale-95">
          เริ่มใช้งาน
        </button>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20">
        {/* Background decorative blobs */}
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-primary-light rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-light rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative w-full max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-12 items-center py-20">
          {/* Left — Text */}
          <div className="space-y-8">
            <div
              className="reveal opacity-0"
              style={{ animationFillMode: "forwards" }}
            >
              <span className="inline-flex items-center gap-2 text-xs font-body font-semibold tracking-widest uppercase text-accent bg-accent-light px-4 py-2 rounded-full">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse-slow" />
                AI-Powered Bone Age Assessment
              </span>
            </div>

            <div
              className="reveal opacity-0 animate-delay-100"
              style={{ animationFillMode: "forwards" }}
            >
              <h1 className="font-display text-6xl md:text-7xl lg:text-8xl font-semibold text-ink leading-[1.05] tracking-tight">
                โตทัน
                <br />
                <span className="text-primary">ประเมิน</span>
                <br />
                <span className="text-accent">อายุกระดูก</span>
              </h1>
            </div>

            <div
              className="reveal opacity-0 animate-delay-200"
              style={{ animationFillMode: "forwards" }}
            >
              <p className="font-body text-lg text-muted leading-relaxed max-w-md">
                ระบบวิเคราะห์ภาพ X-ray ด้วย AI เพื่อประเมินอายุกระดูก
                และติดตามการเจริญเติบโตของเด็กไทย
                อย่างแม่นยำและรวดเร็ว
              </p>
            </div>

            <div
              className="reveal opacity-0 animate-delay-300 flex flex-wrap gap-4"
              style={{ animationFillMode: "forwards" }}
            >
              <button className="group bg-primary hover:bg-primary-dark text-white font-body font-medium px-8 py-4 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-primary/25 active:scale-95 flex items-center gap-2">
                เริ่มประเมินทันที
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button className="font-body font-medium px-8 py-4 rounded-2xl border border-border hover:border-primary hover:text-primary text-muted transition-all duration-200">
                ดูตัวอย่าง
              </button>
            </div>

            <div
              className="reveal opacity-0 animate-delay-400 flex items-center gap-6 pt-2"
              style={{ animationFillMode: "forwards" }}
            >
              {[
                { value: "95%+", label: "ความแม่นยำ" },
                { value: "<30s", label: "เวลาวิเคราะห์" },
                { value: "ฟรี", label: "สำหรับแพทย์" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-2xl font-semibold text-ink">{stat.value}</div>
                  <div className="font-body text-xs text-muted mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Visual */}
          <div
            className="reveal opacity-0 animate-delay-200 flex justify-center"
            style={{ animationFillMode: "forwards" }}
          >
            <div className="relative w-full max-w-md">
              {/* Main card */}
              <div className="animate-float bg-white rounded-3xl shadow-2xl shadow-primary/10 p-8 border border-border">
                {/* X-ray mockup */}
                <div className="bg-ink rounded-2xl aspect-[4/3] flex items-center justify-center mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
                  {/* Stylized hand X-ray SVG */}
                  <svg
                    viewBox="0 0 200 180"
                    className="relative z-10 w-40 h-36 opacity-80"
                    fill="none"
                  >
                    {/* Palm */}
                    <rect x="70" y="90" width="60" height="70" rx="8" fill="#CBD5E1" opacity="0.6" />
                    {/* Fingers */}
                    <rect x="72" y="50" width="12" height="45" rx="6" fill="#CBD5E1" opacity="0.7" />
                    <rect x="88" y="38" width="12" height="57" rx="6" fill="#CBD5E1" opacity="0.75" />
                    <rect x="104" y="42" width="12" height="53" rx="6" fill="#CBD5E1" opacity="0.7" />
                    <rect x="120" y="52" width="10" height="43" rx="5" fill="#CBD5E1" opacity="0.65" />
                    {/* Thumb */}
                    <rect x="52" y="70" width="10" height="38" rx="5" fill="#CBD5E1" opacity="0.6" transform="rotate(-15 57 89)" />
                    {/* Wrist */}
                    <rect x="68" y="155" width="64" height="18" rx="6" fill="#94A3B8" opacity="0.4" />
                    {/* Joints highlight */}
                    <circle cx="78" cy="56" r="4" fill="#E2E8F0" opacity="0.5" />
                    <circle cx="94" cy="44" r="4" fill="#E2E8F0" opacity="0.5" />
                    <circle cx="110" cy="48" r="4" fill="#E2E8F0" opacity="0.5" />
                    <circle cx="125" cy="58" r="3.5" fill="#E2E8F0" opacity="0.5" />
                  </svg>
                  {/* Scan line animation */}
                  <div
                    className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-80"
                    style={{
                      animation: "scanLine 3s ease-in-out infinite",
                      top: "40%",
                    }}
                  />
                  <style>{`
                    @keyframes scanLine {
                      0%, 100% { top: 20%; opacity: 0; }
                      10% { opacity: 0.8; }
                      50% { top: 80%; opacity: 0.8; }
                      90% { opacity: 0; }
                    }
                  `}</style>
                </div>

                {/* Result */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-body text-xs text-muted uppercase tracking-wider mb-1">ผลการวิเคราะห์</p>
                    <p className="font-display text-3xl font-semibold text-ink">8 ปี 4 เดือน</p>
                    <p className="font-body text-sm text-muted mt-1">อายุกระดูก (Bone Age)</p>
                  </div>
                  <div className="bg-green-50 text-green-700 text-xs font-body font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    ปกติ
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-body text-muted mb-2">
                    <span>พัฒนาการ</span>
                    <span>92%</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      style={{ width: "92%", transition: "width 1.5s ease" }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-accent text-white text-xs font-body font-semibold px-4 py-2 rounded-2xl shadow-lg shadow-accent/30 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                Greulich &amp; Pyle
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white border border-border text-ink text-xs font-body font-medium px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .3 2.7-1.1 2.7H3.9c-1.4 0-2.1-1.7-1.1-2.7L4 15.3" />
                </svg>
                AI Confidence 97%
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="reveal opacity-0 text-center mb-16" style={{ animationFillMode: "forwards" }}>
            <span className="font-body text-xs font-semibold tracking-widest uppercase text-accent">ความสามารถ</span>
            <h2 className="font-display text-5xl font-semibold text-ink mt-3">
              ครบทุกความต้องการ<br />
              <span className="text-primary">ในระบบเดียว</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                title: "AI วิเคราะห์ X-ray",
                desc: "ประเมินอายุกระดูกจากภาพ X-ray มือด้วย Deep Learning แม่นยำตามมาตรฐาน Greulich & Pyle",
                color: "text-primary bg-primary-light",
                delay: "animate-delay-100",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
                title: "ติดตามการเจริญเติบโต",
                desc: "กราฟพัฒนาการแบบ interactive เปรียบเทียบกับ percentile มาตรฐานสำหรับเด็กไทย",
                color: "text-accent bg-accent-light",
                delay: "animate-delay-200",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                ),
                title: "จัดการข้อมูลผู้ป่วย",
                desc: "ระบบ RBAC แยกสิทธิ์แพทย์และผู้ปกครอง ข้อมูลปลอดภัยและเป็นส่วนตัว",
                color: "text-primary bg-primary-light",
                delay: "animate-delay-300",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                ),
                title: "รายงานอัตโนมัติ",
                desc: "ออก PDF รายงานผลการประเมินพร้อม visualization ส่งต่อแพทย์ได้ทันที",
                color: "text-accent bg-accent-light",
                delay: "animate-delay-400",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                ),
                title: "การแจ้งเตือนอัจฉริยะ",
                desc: "แจ้งเตือนอัตโนมัติเมื่อถึงเวลานัดติดตามผล ผ่าน Line หรือ Email",
                color: "text-primary bg-primary-light",
                delay: "animate-delay-500",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                  </svg>
                ),
                title: "รองรับทุกอุปกรณ์",
                desc: "Responsive design ใช้งานได้บน Desktop, Tablet และ Mobile อย่างลื่นไหล",
                color: "text-accent bg-accent-light",
                delay: "animate-delay-600",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className={`reveal opacity-0 ${feature.delay} group bg-white rounded-3xl p-7 border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-default`}
                style={{ animationFillMode: "forwards" }}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-ink mb-2">{feature.title}</h3>
                <p className="font-body text-sm text-muted leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-8 bg-ink">
        <div className="max-w-7xl mx-auto">
          <div className="reveal opacity-0 text-center mb-16" style={{ animationFillMode: "forwards" }}>
            <span className="font-body text-xs font-semibold tracking-widest uppercase text-accent">ขั้นตอน</span>
            <h2 className="font-display text-5xl font-semibold text-white mt-3">
              ใช้งานง่าย <span className="text-accent">3 ขั้นตอน</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.666%-1px)] right-[calc(16.666%-1px)] h-px bg-gradient-to-r from-primary/30 via-accent/50 to-primary/30" />

            {[
              {
                step: "01",
                title: "อัปโหลด X-ray",
                desc: "นำภาพ X-ray มือซ้ายของเด็กอัปโหลดเข้าระบบ รองรับ JPEG, PNG และ DICOM",
                delay: "animate-delay-100",
              },
              {
                step: "02",
                title: "AI วิเคราะห์",
                desc: "ระบบ AI ประมวลผลภาพโดยอัตโนมัติ เปรียบเทียบกับ atlas มาตรฐาน Greulich & Pyle",
                delay: "animate-delay-300",
              },
              {
                step: "03",
                title: "รับผลรายงาน",
                desc: "ดูผลการประเมินอายุกระดูก พร้อม confidence score และดาวน์โหลด PDF ได้ทันที",
                delay: "animate-delay-500",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`reveal opacity-0 ${item.delay} relative`}
                style={{ animationFillMode: "forwards" }}
              >
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 rounded-3xl p-8 transition-all duration-300">
                  <div className="w-10 h-10 bg-accent/20 text-accent font-display text-sm font-semibold rounded-2xl flex items-center justify-center mb-6">
                    {item.step}
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="font-body text-sm text-white/50 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="py-24 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="reveal opacity-0 bg-gradient-to-br from-primary-light to-accent-light rounded-3xl p-16 border border-border relative overflow-hidden" style={{ animationFillMode: "forwards" }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-light rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="relative z-10">
              <span className="font-body text-xs font-semibold tracking-widest uppercase text-accent">พร้อมแล้วหรือยัง?</span>
              <h2 className="font-display text-5xl font-semibold text-ink mt-3 mb-5">
                เริ่มดูแลเด็กไทย<br />
                <span className="text-primary">ให้โตทันวัย</span>
              </h2>
              <p className="font-body text-muted leading-relaxed mb-8 max-w-md mx-auto">
                ระบบ AI ที่ออกแบบมาเพื่อแพทย์เด็กไทยโดยเฉพาะ
                ใช้งานง่าย แม่นยำ และปลอดภัย
              </p>
              <button className="bg-primary hover:bg-primary-dark text-white font-body font-medium px-10 py-4 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 active:scale-95">
                ทดลองใช้งานฟรี
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-semibold text-primary">โตทัน</span>
            <span className="font-body text-xs text-muted">NSC 2026 · National Software Contest</span>
          </div>
          <p className="font-body text-xs text-muted">
            ระบบประเมินอายุกระดูกและติดตามการเจริญเติบโตสำหรับเด็กไทย
          </p>
        </div>
      </footer>
    </div>
  );
}
