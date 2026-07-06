import axios from 'axios';

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({ baseURL: GATEWAY });

// ใส่ token ทุก request อัตโนมัติ
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ถ้า 401 → ล้าง token แล้วไป login
apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ accessToken: string; user: { id: string; email: string; role: string } }>(
      '/auth/login', { email, password },
    ),

  register: (data: { email: string; password: string; role: string; fullName: string; phone?: string; relationship?: string }) =>
    apiClient.post<{ message: string; userId: string }>('/auth/register', data),

  me: () => apiClient.get<{ id: string; email: string; role: string; profile: any }>('/auth/me'),

  updateProfile: (data: { fullName?: string; phone?: string }) =>
    apiClient.patch<{ message: string }>('/auth/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post<{ message: string }>('/auth/change-password', data),

  deleteAccount: () =>
    apiClient.delete<{ message: string }>('/auth/account'),

  findByEmail: (email: string) =>
    apiClient.get<{ id: string; email: string; role: string } | null>(`/auth/find-by-email?email=${encodeURIComponent(email)}`),

  verifyEmail: (email: string, otp: string) =>
    apiClient.post<{ message: string }>('/auth/verify-email', { email, otp }),

  resendVerify: (email: string) =>
    apiClient.post<{ message: string }>('/auth/resend-verify', { email }),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<{ avatarUrl: string }>('/auth/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── Children ──────────────────────────────────────────────
export const childrenApi = {
  list: () => apiClient.get<Child[]>('/children'),
  get: (id: string) => apiClient.get<Child>(`/children/${id}`),
  create: (data: CreateChildPayload) => apiClient.post<Child>('/children', data),
  update: (id: string, data: Partial<CreateChildPayload> & { parentId?: string | null }) =>
    apiClient.patch<Child>(`/children/${id}`, data),
  delete: (id: string) => apiClient.delete<{ message: string }>(`/children/${id}`),
};

// ── Assessments ───────────────────────────────────────────
export const assessmentsApi = {
  listByChild: (childId: string) => apiClient.get<Assessment[]>(`/assessments/child/${childId}`),
  get: (id: string) => apiClient.get<Assessment>(`/assessments/${id}`),

  uploadXray: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<{ xrayImageUrl: string }>('/assessments/upload-xray', form);
  },

  create: (data: { childId: string; xrayImageUrl: string; heightCm?: number; weightKg?: number; clinicalNotes?: string }) =>
    apiClient.post<Assessment>('/assessments', data),
  setFollowup: (id: string, date: string, notes?: string) =>
    apiClient.patch(`/assessments/${id}/followup`, { date, notes }),

  // แพทย์ส่งผล + วันนัดติดตามให้ผู้ปกครอง (รวบรวมผลประเมิน → เมล)
  notifyParent: (id: string, data: { followUpDate: string; followUpTime?: string; note?: string }) =>
    apiClient.post<Assessment>(`/assessments/${id}/notify-parent`, data),

  mockAiResult: (id: string) =>
    apiClient.post<Assessment>(`/assessments/${id}/mock-ai`, {}),
};

// ── Admin (read-only) ─────────────────────────────────────
export const adminApi = {
  stats: () => apiClient.get<AdminStats>('/admin/stats'),
  listDoctors: () => apiClient.get<AdminUserRow[]>('/admin/doctors'),
  listParents: () => apiClient.get<AdminUserRow[]>('/admin/parents'),
  listScans: () => apiClient.get<AdminScanRow[]>('/admin/scans'),
};

// ── Recommendations ───────────────────────────────────────
export const recommendationsApi = {
  mine: () => apiClient.get<Recommendation[]>('/recommendations/mine'),
  sent: () => apiClient.get<Recommendation[]>('/recommendations/sent'),
  create: (data: { assessmentId: string; parentId: string; content: string }) =>
    apiClient.post<Recommendation>('/recommendations', data),
  markRead: (id: string) => apiClient.patch(`/recommendations/${id}/read`, {}),
};

// ── Types ─────────────────────────────────────────────────
export interface Child {
  id: string;
  name: string;
  dateOfBirth: string;
  sex: 'M' | 'F';
  parentId: string | null;
  doctorId: string;
  ethnicity: string;
  heightCm?: number;
  weightKg?: number;
  fatherHeightCm?: number;
  motherHeightCm?: number;
  clinicalNotes?: string;
  createdAt: string;
}

export interface Assessment {
  id: string;
  childId: string;
  doctorId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  xrayImageUrl: string;
  heightCm?: number;
  weightKg?: number;
  boneAgeMonths?: number;
  confidence?: number;
  heatmapUrl?: string;
  isMock?: boolean; // true = ผลจาก mock pipeline (ยังไม่ใช่ model จริง)
  aiProvider?: 'mock' | 'external_demo'; // external_demo = model จริงจาก third-party demo, ยังไม่ผ่านการตรวจสอบทางคลินิก
  riskFlag?: 'normal' | 'short_stature' | 'tall_stature' | 'advanced' | 'delayed';
  finalAdultHeightCm?: number;
  targetHeightCm?: number;
  heightPercentile?: number;
  weightPercentile?: number;
  bmi?: number;
  bmiPercentile?: number;
  heightSdScore?: number;
  nextFollowupDate?: string;
  followupNotes?: string;
  parentNotifiedAt?: string; // เวลาที่ส่งผลให้ผู้ปกครองล่าสุด (null = ยังไม่เคยส่ง)
  clinicalNotes?: string;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  assessmentId: string;
  doctorId: string;
  parentId: string;
  content: string;
  followUpDate?: string | null;
  followUpTime?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalScans: number | null; // null = patient-service ตอบไม่ได้ (แต่ stats endpoint ยังคืนค่าอื่นได้)
  totalDoctors: number;
  totalParents: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  status: 'unverified' | 'pending' | 'active' | 'inactive';
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  relationship?: 'father' | 'mother' | 'guardian';
  createdAt: string;
}

export interface AdminScanRow {
  id: string;
  childId: string;
  childName: string | null;
  doctorId: string;
  doctorName: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  boneAgeMonths?: number;
  confidence?: number;
  isMock?: boolean;
  riskFlag?: string;
  createdAt: string;
}

export interface CreateChildPayload {
  name: string;
  dateOfBirth: string;
  sex: 'M' | 'F';
  parentId: string;
  ethnicity?: string;
  heightCm?: number;
  weightKg?: number;
  fatherHeightCm?: number;
  motherHeightCm?: number;
  clinicalNotes?: string;
}
