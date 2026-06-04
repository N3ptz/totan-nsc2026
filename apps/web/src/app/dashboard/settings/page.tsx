"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { AvatarPicker } from "@/components/AvatarPicker";

interface User { id: string; email: string; role: string; profile?: { fullName?: string; phone?: string; avatarUrl?: string } }

export default function SettingsPage() {
  const router = useRouter();
  const { lang, t } = useI18n();
  const ts = t.settings;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<"idle" | "saved" | "error">("idle");

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdStatus, setPwdStatus] = useState<"idle" | "saved" | "error" | "mismatch" | "short">("idle");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    (async () => {
      try {
        const { data } = await authApi.me();
        setUser(data);
        setFullName(data.profile?.fullName ?? "");
        setPhone(data.profile?.phone ?? "");
        if (data.profile?.avatarUrl) setAvatarPreview(data.profile.avatarUrl);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileStatus("idle");
    try {
      if (avatarFile) {
        await authApi.uploadAvatar(avatarFile);
        setAvatarFile(null);
      }
      await authApi.updateProfile({ fullName, phone });
      setProfileStatus("saved");
      setTimeout(() => setProfileStatus("idle"), 3000);
    } catch {
      setProfileStatus("error");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPwd.length < 8) { setPwdStatus("short"); return; }
    if (newPwd !== confirmPwd) { setPwdStatus("mismatch"); return; }
    setPwdSaving(true);
    setPwdStatus("idle");
    try {
      await authApi.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setPwdStatus("saved");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setPwdStatus("idle"), 3000);
    } catch {
      setPwdStatus("error");
    } finally {
      setPwdSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await authApi.deleteAccount();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/");
    } catch {
      setDeleting(false);
      setDeleteError(lang === "th" ? "เกิดข้อผิดพลาด กรุณาลองใหม่" : "Something went wrong, please try again");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  const isDoctor    = user?.role === "doctor";
  const displayName = user?.profile?.fullName ?? user?.email ?? "";
  const initial     = displayName.charAt(0).toUpperCase() || "?";

  return (
    <div className="relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed top-[-10%] right-[-6%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.13] animate-aurora pointer-events-none"
        style={{ background: "rgb(var(--aurora-1))" }} />
      <div className="fixed bottom-[-12%] left-[20%] w-[520px] h-[520px] rounded-full blur-[150px] opacity-[0.1] animate-aurora-slow pointer-events-none"
        style={{ background: "rgb(var(--aurora-3))" }} />

      <main className="min-h-screen relative z-10">
        <header className="sticky top-0 z-30 flex items-center px-8 py-4 glass border-b border-border/50">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">{ts.title}</h1>
            <p className="font-body text-xs text-muted mt-0.5">
              {user?.email}
            </p>
          </div>
        </header>

        <div className="p-8">
        <div className="grid grid-cols-2 gap-6 items-stretch">

          {/* ── คอลัมน์ซ้าย: Profile ── */}
          <section className="glass rounded-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgb(var(--primary)/0.12)" }}>
                <UserIcon style={{ width: 16, height: 16, color: "rgb(var(--primary))" }} />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-ink">{ts.profileTitle}</h2>
                <p className="font-body text-[11px] text-muted">{ts.profileSub}</p>
              </div>
            </div>

            <div className="p-6 space-y-5 flex-1">
              {/* Avatar + role */}
              <div className="flex items-center gap-5">
                <AvatarPicker
                  initial={initial}
                  gradient={isDoctor
                    ? "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))"
                    : "linear-gradient(135deg,rgb(var(--accent)),rgb(var(--warning)))"
                  }
                  preview={avatarPreview}
                  onChange={(file, url) => { setAvatarFile(file); setAvatarPreview(url); }}
                  size={72}
                  label={ts.avatarHint}
                />
                <div>
                  <p className="font-body text-sm font-semibold text-ink">{displayName}</p>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-body font-semibold px-2 py-0.5 rounded-md mt-1 ${
                    isDoctor ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {isDoctor ? ts.roleDoctor : ts.roleParent}
                  </span>
                  {avatarFile && (
                    <p className="font-body text-[10px] text-primary mt-1">
                      {lang === "th" ? "รูปใหม่พร้อมบันทึก" : "New photo ready to save"}
                    </p>
                  )}
                </div>
              </div>

              {/* Email – read-only */}
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  {ts.email}
                  <span className="ml-2 normal-case text-[10px] font-normal text-muted/60">{ts.readOnly}</span>
                </label>
                <div className="input-base bg-bg2/60 text-muted cursor-not-allowed select-none">
                  {user?.email}
                </div>
              </div>

              {/* Full name */}
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  {ts.fullName}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="input-base"
                  placeholder={ts.fullName}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  {ts.phone}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input-base"
                  placeholder="0xx-xxx-xxxx"
                />
              </div>

              {/* Status + save */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  {profileStatus === "saved" && <span className="text-xs font-body text-success flex items-center gap-1.5"><CheckIcon />{ts.saved}</span>}
                  {profileStatus === "error" && <span className="text-xs font-body text-danger">{ts.saveError}</span>}
                </div>
                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(120deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))", boxShadow: "0 4px 14px rgb(var(--primary)/0.3)" }}>
                  {profileSaving ? ts.saving : ts.save}
                </button>
              </div>
            </div>
          </section>

          {/* ── คอลัมน์ขวา: Security + Danger Zone ── */}
          <div className="flex flex-col gap-5">

            {/* Security */}
            <section className="glass rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgb(var(--warning)/0.12)" }}>
                  <LockIcon style={{ width: 16, height: 16, color: "rgb(var(--warning))" }} />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-ink">{ts.securityTitle}</h2>
                  <p className="font-body text-[11px] text-muted">{ts.securitySub}</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                    {ts.currentPwd}
                  </label>
                  <input type="password" value={currentPwd}
                    onChange={e => setCurrentPwd(e.target.value)}
                    className="input-base" autoComplete="current-password" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                      {ts.newPwd}
                    </label>
                    <input type="password" value={newPwd}
                      onChange={e => { setNewPwd(e.target.value); setPwdStatus("idle"); }}
                      className="input-base" autoComplete="new-password" />
                  </div>
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                      {ts.confirmPwd}
                    </label>
                    <input type="password" value={confirmPwd}
                      onChange={e => { setConfirmPwd(e.target.value); setPwdStatus("idle"); }}
                      className={`input-base ${confirmPwd && newPwd !== confirmPwd ? "border-danger/50 focus:ring-danger/20" : ""}`}
                      autoComplete="new-password" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    {pwdStatus === "saved"    && <span className="text-xs font-body text-success flex items-center gap-1.5"><CheckIcon />{ts.pwdChanged}</span>}
                    {pwdStatus === "mismatch" && <span className="text-xs font-body text-danger">{ts.pwdMismatch}</span>}
                    {pwdStatus === "short"    && <span className="text-xs font-body text-danger">{ts.pwdMin}</span>}
                    {pwdStatus === "error"    && <span className="text-xs font-body text-danger">{ts.pwdError}</span>}
                  </div>
                  <button
                    onClick={changePassword}
                    disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-warning border border-warning/30 hover:bg-warning/8">
                    <LockIcon style={{ width: 14, height: 14 }} />
                    {pwdSaving ? ts.saving : ts.changePwd}
                  </button>
                </div>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="rounded-2xl overflow-hidden border border-danger/30 flex-1"
              style={{ background: "rgb(var(--danger)/0.04)" }}>
              <div className="px-6 py-4 border-b border-danger/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgb(var(--danger)/0.12)" }}>
                  <TrashIcon style={{ width: 16, height: 16, color: "rgb(var(--danger))" }} />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-danger">{ts.dangerTitle}</h2>
                  <p className="font-body text-[11px] text-muted">{ts.dangerSub}</p>
                </div>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-body text-sm font-semibold text-ink">{ts.deleteAccount}</p>
                  <p className="font-body text-[11px] text-muted mt-0.5">{ts.deleteConfirmDesc}</p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-semibold text-danger border border-danger/30 hover:bg-danger/8 transition-all ml-4">
                  <TrashIcon style={{ width: 14, height: 14 }} />
                  {ts.deleteAccount}
                </button>
              </div>
            </section>

          </div>

        </div>
        </div>
      </main>


      {/* ── Delete confirm modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgb(var(--danger)/0.12)" }}>
                <TrashIcon style={{ width: 18, height: 18, color: "rgb(var(--danger))" }} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-ink">{ts.deleteConfirmTitle}</h3>
                <p className="font-body text-xs text-muted mt-0.5">{ts.deleteConfirmDesc}</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                {ts.deleteConfirmInput}
              </label>
              <input
                type="email"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder={user?.email}
                className="input-base"
                autoComplete="off"
              />
            </div>

            {deleteError && (
              <p className="mt-3 text-xs font-body text-danger text-center">{deleteError}</p>
            )}

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteInput(""); setDeleteError(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold text-muted border border-border hover:bg-border/40 transition-all">
                {ts.deleteCancelBtn}
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleteInput !== user?.email || deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "rgb(var(--danger))" }}>
                {deleting ? ts.deleting : ts.deleteConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const HomeIcon     = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
const PatientsIcon = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const AssessIcon   = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .3 2.7-1.1 2.7H3.9c-1.4 0-2.1-1.7-1.1-2.7L4 15.3" /></svg>;
const ReportIcon   = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const RecIcon      = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>;
const SettingsIcon = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const LogoutIcon   = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>;
const UserIcon     = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
const LockIcon     = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;
const TrashIcon    = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
function CheckIcon() { return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>; }
function MoonIcon()  { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>; }
function SunIcon()   { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>; }
