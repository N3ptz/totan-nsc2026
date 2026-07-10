"use client";

import { createContext, useContext } from "react";

// ข้อมูลผู้ใช้จาก /auth/me — dashboard layout โหลด "ครั้งเดียว" แล้วแจกให้ทุกหน้า
// ผ่าน context นี้ (เดิมทุกหน้ายิง /auth/me ซ้ำเองอีกรอบ = 2 requests ต่อการเปิดหน้า)
export interface AuthUser {
  id?: string;
  email: string;
  role: string;
  profile?: { fullName?: string; phone?: string; avatarUrl?: string };
}

export interface UserCtx {
  /** null = ยังโหลดไม่เสร็จ (หน้าใช้เป็นสัญญาณ loading ได้) */
  user: AuthUser | null;
  /** ยิง /auth/me ใหม่ — เรียกหลังแก้โปรไฟล์/อัปโหลด avatar เพื่อให้ sidebar อัปเดตทันที */
  refresh: () => void;
}

const UserContext = createContext<UserCtx>({ user: null, refresh: () => {} });

export const UserProvider = UserContext.Provider;
export function useUser() {
  return useContext(UserContext);
}
