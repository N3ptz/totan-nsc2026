"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { AvatarPicker } from "@/components/AvatarPicker";
import { MascotBot } from "@/components/MascotBot";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("token")) router.replace("/dashboard");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang, t } = useI18n();
  const tl = t.login;

  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [role, setRole] = useState<"doctor" | "parent" | "admin" | "">("");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [regData, setRegData] = useState({ email: "", password: "", fullName: "", phone: "", relationship: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // OTP verification state
  const [verifyStep, setVerifyStep] = useState<{ email: string; password: string; avatarFile: File | null } | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendMsg, setResendMsg] = useState("");
  const otpComplete = otp.every(d => d !== "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await authApi.login(loginData.email, loginData.password);
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.removeItem("dashTourSeen");
      router.push(data.user?.role === "admin" ? "/dashboard/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) { setError(lang === "th" ? "กรุณาเลือกบทบาท" : "Please select a role"); return; }
    setError(""); setLoading(true);
    try {
      await authApi.register({
        email: regData.email, password: regData.password,
        fullName: regData.fullName, role,
        phone: regData.phone || undefined,
        relationship: role === "parent" ? regData.relationship || undefined : undefined,
      });
      setVerifyStep({ email: regData.email, password: regData.password, avatarFile });
      setOtp(["", "", "", "", "", ""]);
      setResendMsg("");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyStep) return;
    const code = otp.join("");
    if (code.length < 6) return;
    setError(""); setLoading(true);
    try {
      await authApi.verifyEmail(verifyStep.email, code);
      // auto-login หลัง verify สำเร็จ
      const { data } = await authApi.login(verifyStep.email, verifyStep.password);
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.removeItem("dashTourSeen");
      // upload avatar ถ้ามี
      if (verifyStep.avatarFile) {
        await authApi.uploadAvatar(verifyStep.avatarFile).catch(() => {});
      }
      router.push(data.user?.role === "admin" ? "/dashboard/admin" : "/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    if (!verifyStep) return;
    setError(""); setResendMsg("");
    try {
      await authApi.resendVerify(verifyStep.email);
      setResendMsg(tl.resendSent);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const handleOtpInput = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      e.preventDefault();
    }
  };

  return (
    <div className="min-h-screen flex bg-bg text-ink">

      {/* ── Left panel ──────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[54%] relative flex-col justify-between p-14 overflow-hidden"
        style={{ background: "linear-gradient(150deg, #04111f 0%, #062a45 45%, #041424 100%)" }}>

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #38BDF8 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

        {/* Aurora blobs — kept subtle so the copy reads cleanly. Transform-only
            drift (animate-aurora); the border-radius morph is dropped — invisible
            under a 110px blur but it repaints the whole layer every frame. */}
        <div className="absolute top-[6%] right-[-6%] w-[520px] h-[520px] rounded-full blur-[110px] opacity-[0.20] animate-aurora pointer-events-none"
          style={{ background: "radial-gradient(circle, #38BDF8, transparent 65%)", willChange: "transform" }} />
        <div className="absolute bottom-[2%] left-[-8%] w-[440px] h-[440px] rounded-full blur-[110px] opacity-[0.16] animate-aurora-slow pointer-events-none"
          style={{ background: "radial-gradient(circle, #A78BFA, transparent 65%)", animationDelay: "-7s", willChange: "transform" }} />
        <div className="absolute top-[44%] left-[30%] w-[360px] h-[360px] rounded-full blur-[120px] opacity-[0.12] animate-aurora pointer-events-none"
          style={{ background: "radial-gradient(circle, #0EA5E9, transparent 65%)", animationDelay: "-13s", willChange: "transform" }} />

        {/* X-ray hand — single layer with scan-line */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-float-soft"
          style={{ opacity: 0.10, animationDuration: "7s" }}>
          <div className="relative w-[400px]">
            <img src="/Hand-nobg.png" alt="" aria-hidden
              className="w-full object-contain select-none"
              style={{ filter: "brightness(0) invert(1) sepia(1) hue-rotate(170deg) saturate(2.5) brightness(1.2)", transform: "rotate(-5deg)" }} />
            {/* transform-only sweep: full-height mover, line at its top edge */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0" style={{ animation: "scan-sweep 4s ease-in-out infinite", willChange: "transform" }}>
                <div className="absolute inset-x-0 top-0 h-8"
                  style={{
                    background: "linear-gradient(to bottom, rgba(103,232,249,0.0), rgba(103,232,249,0.18), rgba(103,232,249,0.0))",
                    borderTop: "1px solid rgba(103,232,249,0.45)",
                  }} />
              </div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-3 w-fit group">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-3"
            style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 8px 24px rgba(56,189,248,0.35)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tohtan_bgremover.png" alt="โตทัน" className="w-7 h-7 object-contain" />
          </div>
          <span className="text-white text-xl font-display font-bold tracking-tight">โตทัน</span>
          <span className="text-[10px] font-body font-bold px-2 py-0.5 rounded-full tracking-widest"
            style={{ background: "rgba(56,189,248,0.15)", color: "#7dd3fc", border: "1px solid rgba(56,189,248,0.3)" }}>
            NSC 2026
          </span>
        </Link>

        {/* Center content */}
        <div className="relative z-10 space-y-10">
          <div>
            <p className="text-[11px] font-body font-bold tracking-[0.25em] uppercase mb-4" style={{ color: "#7dd3fc" }}>
              AI-Powered · Bone Age Assessment
            </p>
            <h1 className="font-display font-bold leading-[1.06] text-white"
              style={{ fontSize: "clamp(2.4rem, 3.8vw, 3.4rem)" }}>
              {tl.heroTitle}<br />
              <span className="text-gradient" style={{ filter: "brightness(1.3)" }}>{tl.heroAccent}</span>
            </h1>
            <p className="font-body text-base mt-5 leading-relaxed max-w-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
              {tl.heroDesc}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: "4.36", l: tl.s1 },
              { v: "<20s", l: tl.s2 },
              { v: "Low Bias", l: tl.s3 },
            ].map((s, i) => (
              <div key={s.l} className="rounded-2xl p-4 text-center transition-transform hover:-translate-y-1 animate-fade-up"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", animationDelay: `${i * 100}ms` }}>
                <div className="font-display text-2xl font-bold text-white">{s.v}</div>
                <div className="font-body text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="space-y-3">
            {[
              { icon: <TrustShieldIcon />, text: tl.trust1 },
              { icon: <TrustMedIcon />,   text: tl.trust2 },
              { icon: <TrustCheckIcon />, text: tl.trust3 },
            ].map(b => (
              <div key={b.text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0"
                  style={{ background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.20)" }}>
                  {b.icon}
                </div>
                <span className="font-body text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[11px] font-body" style={{ color: "rgba(255,255,255,0.22)" }}>
          © 2026 โตทัน · Mahidol University · NSC
        </p>
      </div>

      {/* ── Right panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-bg relative overflow-hidden">
        {/* ambient glow for mobile/light */}
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full blur-[120px] opacity-[0.15] animate-aurora pointer-events-none"
          style={{ background: "rgb(var(--aurora-1))" }} />
        <div className="absolute -bottom-32 -left-20 w-[360px] h-[360px] rounded-full blur-[120px] opacity-[0.12] animate-aurora-slow pointer-events-none"
          style={{ background: "rgb(var(--aurora-3))" }} />

        {/* Top-right controls */}
        <div className="relative flex justify-end gap-2 px-6 pt-5">
          <CtrlBtn onClick={toggleLang} title="Toggle language">
            <span className="text-xs font-semibold font-body">{lang === "th" ? "EN" : "TH"}</span>
          </CtrlBtn>
          <CtrlBtn onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </CtrlBtn>
        </div>

        {/* Form area */}
        <div className="relative flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-[420px] glass-strong rounded-3xl p-8 animate-fade-up">

            {/* Mobile logo */}
            <div className="lg:hidden mb-7 text-center">
              <Link href="/" className="inline-flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tohtan_bgremover.png" alt="โตทัน" className="w-9 h-9 object-contain" />
                <span className="font-display text-xl font-bold text-ink">โตทัน</span>
              </Link>
            </div>

            {/* ── OTP Verification Step ── */}
            {verifyStep ? (
              <>
                <div className="mb-6 text-center">
                  <div className="flex justify-center mb-3">
                    <MascotBot variant={otpComplete ? "success" : "scanning"} size="md" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-ink">{tl.verifyTitle}</h2>
                  <p className="font-body text-sm text-muted mt-1.5">
                    {tl.verifySub}<br />
                    <span className="font-semibold text-ink">{verifyStep.email}</span>
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm font-body animate-fade-up"
                    style={{ background: "rgb(var(--danger)/0.1)", color: "rgb(var(--danger))", border: "1px solid rgb(var(--danger)/0.25)" }}>
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    {error}
                  </div>
                )}

                {resendMsg && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm font-body animate-fade-up"
                    style={{ background: "rgb(var(--success)/0.1)", color: "rgb(var(--success))", border: "1px solid rgb(var(--success)/0.25)" }}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {resendMsg}
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleOtpInput(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className={`w-12 h-14 text-center text-2xl font-bold font-display rounded-xl border-2 outline-none ${
                          otpComplete ? "animate-otp-success" : "transition-all"
                        }`}
                        style={{
                          borderColor: otpComplete ? "rgb(var(--success))" : d ? "rgb(var(--primary))" : "rgb(var(--border))",
                          background:  otpComplete ? "rgb(var(--success)/0.10)" : d ? "rgb(var(--primary)/0.08)" : "rgb(var(--surface)/0.7)",
                          color:       "rgb(var(--ink))",
                          boxShadow:   otpComplete ? "0 0 0 3px rgb(var(--success)/0.20)" : d ? "0 0 0 3px rgb(var(--primary)/0.14)" : "none",
                          animationDelay: otpComplete ? `${i * 55}ms` : "0ms",
                        }}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  <SubmitBtn loading={loading} label={tl.verifyBtn} processing={tl.processing} />
                </form>

                <div className="flex items-center justify-between mt-5">
                  <button type="button" onClick={() => { setVerifyStep(null); setError(""); setResendMsg(""); }}
                    className="text-sm font-body text-muted hover:text-ink transition-colors">
                    {tl.backToRegister}
                  </button>
                  <button type="button" onClick={handleResendOtp}
                    className="text-sm font-body font-semibold hover:opacity-70 transition-opacity"
                    style={{ color: "rgb(var(--primary))" }}>
                    {tl.resendOtp}
                  </button>
                </div>
              </>
            ) : (
              <>
            {/* Mascot greeting */}
            <div className="flex justify-center mb-4">
              <MascotBot
                variant="idle"
                size="sm"
                message={tab === "login"
                  ? (lang === "th" ? "สวัสดีค่ะ!" : "Hello!")
                  : (lang === "th" ? "ยินดีต้อนรับ!" : "Welcome!")}
              />
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h2 className="font-display text-[2rem] font-bold text-ink leading-tight">
                {tab === "login" ? tl.welcomeBack : tl.createAccount}
              </h2>
              <p className="font-body text-sm text-muted mt-1.5">
                {tab === "login" ? tl.loginSub : tl.registerSub}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="relative flex p-1 rounded-xl mb-6 bg-border/40">
              <div className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-surface shadow-sm transition-transform duration-300"
                style={{ transform: tab === "login" ? "translateX(0)" : "translateX(100%)" }} />
              {(["login", "register"] as const).map(tk => (
                <button key={tk} onClick={() => { setTab(tk); setError(""); }}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-body font-semibold rounded-lg transition-colors ${
                    tab === tk ? "text-ink" : "text-muted"
                  }`}>
                  {tk === "login" ? tl.tabLogin : tl.tabRegister}
                </button>
              ))}
            </div>

            {/* Alert: error */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm font-body animate-fade-up"
                style={{ background: "rgb(var(--danger)/0.1)", color: "rgb(var(--danger))", border: "1px solid rgb(var(--danger)/0.25)" }}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            {/* Alert: success */}
            {registered && tab === "login" && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm font-body animate-fade-up"
                style={{ background: "rgb(var(--success)/0.1)", color: "rgb(var(--success))", border: "1px solid rgb(var(--success)/0.25)" }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {tl.success}
              </div>
            )}

            {/* ── Login form ── */}
            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <Field label={tl.email}>
                  <input type="email" required value={loginData.email}
                    onChange={e => setLoginData(d => ({ ...d, email: e.target.value }))}
                    placeholder="doctor@hospital.com" className="input-base" autoComplete="email" />
                </Field>
                <Field label={tl.password}>
                  <input type="password" required value={loginData.password}
                    onChange={e => setLoginData(d => ({ ...d, password: e.target.value }))}
                    placeholder="••••••••" className="input-base" autoComplete="current-password" />
                </Field>
                <div className="flex justify-end">
                  <a href="#" className="text-xs font-body text-muted hover:text-primary transition-colors">{tl.forgot}</a>
                </div>
                <SubmitBtn loading={loading} label={tl.loginBtn} processing={tl.processing} />
                <p className="text-center text-sm font-body text-muted">
                  {tl.noAccount}{" "}
                  <button type="button" onClick={() => setTab("register")}
                    className="font-semibold text-primary hover:opacity-70 transition-opacity">
                    {tl.signUp}
                  </button>
                </p>
              </form>
            ) : (
              /* ── Register form ── */
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Avatar picker */}
                <div className="flex justify-center pb-1">
                  <AvatarPicker
                    initial={regData.fullName.charAt(0).toUpperCase() || "?"}
                    gradient="linear-gradient(135deg,#38BDF8,#A78BFA)"
                    preview={avatarPreview}
                    onChange={(file, url) => { setAvatarFile(file); setAvatarPreview(url); }}
                    size={80}
                    label={lang === "th" ? "รูปโปรไฟล์ (ไม่บังคับ)" : "Profile photo (optional)"}
                  />
                </div>
                <Field label={tl.fullName}>
                  <input type="text" required value={regData.fullName}
                    onChange={e => setRegData(d => ({ ...d, fullName: e.target.value }))}
                    placeholder={lang === "th" ? "นพ.สมชาย ใจดี" : "Dr. John Smith"} className="input-base" />
                </Field>
                <Field label={tl.email}>
                  <input type="email" required value={regData.email}
                    onChange={e => setRegData(d => ({ ...d, email: e.target.value }))}
                    placeholder="doctor@hospital.com" className="input-base" />
                </Field>
                <Field label={tl.password}>
                  <input type="password" required minLength={8} value={regData.password}
                    onChange={e => setRegData(d => ({ ...d, password: e.target.value }))}
                    placeholder={tl.passwordMin} className="input-base" />
                </Field>

                <Field label={tl.roleLabel}>
                  <div className="grid grid-cols-2 gap-2.5 mt-1">
                    {([
                      // backend รับสมัครเฉพาะ doctor|parent — บัญชี admin สร้างผ่าน seed script เท่านั้น
                      { v: "doctor" as const, label: tl.roleDoctor, sub: tl.roleDoctorSub, icon: "🩺",     span: false },
                      { v: "parent" as const, label: tl.roleParent, sub: tl.roleParentSub, icon: "👨‍👩‍👧", span: false },
                    ]).map(r => (
                      <button key={r.v} type="button" onClick={() => setRole(r.v)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 relative overflow-hidden hover:-translate-y-0.5 ${r.span ? "col-span-2 flex-row" : "flex-col"}`}
                        style={role === r.v
                          ? { borderColor: "rgb(var(--primary))", background: "rgb(var(--primary) / 0.08)", boxShadow: "0 4px 16px rgb(var(--primary)/0.18)" }
                          : { borderColor: "rgb(var(--border))", background: "rgb(var(--surface)/0.5)" }}>
                        {role === r.v && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center animate-fade-in"
                            style={{ background: "rgb(var(--primary))" }}>
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        <span className={r.span ? "text-2xl" : "text-xl mb-1"}>{r.icon}</span>
                        <div>
                          <div className="text-sm font-body font-semibold text-ink">{r.label}</div>
                          <div className="text-[11px] font-body text-muted">{r.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Field>

                {role && (
                  <Field label={tl.phone}>
                    <input type="tel" value={regData.phone}
                      onChange={e => setRegData(d => ({ ...d, phone: e.target.value }))}
                      placeholder="08x-xxx-xxxx" className="input-base" />
                  </Field>
                )}

                {role === "parent" && (
                  <Field label={tl.relationship}>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {([
                        { v: "mother",   label: tl.relMother },
                        { v: "father",   label: tl.relFather },
                        { v: "guardian", label: tl.relGuardian },
                      ] as const).map(r => (
                        <button key={r.v} type="button"
                          onClick={() => setRegData(d => ({ ...d, relationship: r.v }))}
                          className="py-2.5 rounded-xl border text-sm font-body font-semibold transition-all"
                          style={regData.relationship === r.v
                            ? { borderColor: "rgb(var(--primary))", background: "rgb(var(--primary)/0.08)", color: "rgb(var(--primary))" }
                            : { borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                <SubmitBtn loading={loading} label={tl.registerBtn} processing={tl.processing} />
                <p className="text-center text-sm font-body text-muted">
                  {tl.hasAccount}{" "}
                  <button type="button" onClick={() => setTab("login")}
                    className="font-semibold text-primary hover:opacity-70 transition-opacity">
                    {tl.signIn}
                  </button>
                </p>
              </form>
            )}
            </>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="relative px-6 pb-5 text-center">
          <p className="text-[11px] font-body text-muted/60">© 2026 โตทัน · Mahidol University</p>
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-body font-semibold text-ink">{label}</label>
      {children}
    </div>
  );
}

function CtrlBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      className="w-9 h-9 flex items-center justify-center rounded-lg glass text-muted hover:text-primary hover:border-primary/40 transition-all">
      {children}
    </button>
  );
}

function SubmitBtn({ loading, label, processing }: { loading: boolean; label: string; processing: string }) {
  return (
    <button type="submit" disabled={loading}
      className="group relative w-full py-3.5 text-sm font-body font-semibold rounded-xl transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2 mt-2 overflow-hidden text-white"
      style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))", boxShadow: "0 8px 24px rgb(var(--primary)/0.40)" }}>
      <span className="shine relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {loading ? processing : label}
      </span>
    </button>
  );
}

function MoonIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>;
}
function SunIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
}
function TrustShieldIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#7dd3fc" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
}
function TrustMedIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#7dd3fc" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
}
function TrustCheckIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#34d399" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
