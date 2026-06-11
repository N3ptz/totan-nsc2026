// ─── User & Auth ─────────────────────────────────────────────
export type UserRole = 'doctor' | 'parent' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

// ─── Child / Patient ─────────────────────────────────────────
export interface Child {
  id: string;
  name: string;
  dateOfBirth: Date;
  sex: 'M' | 'F';
  parentId: string | null;
  doctorId: string;
  ethnicity?: string;
  heightCm?: number;
  weightKg?: number;
  fatherHeightCm?: number;
  motherHeightCm?: number;
  clinicalNotes?: string;
}

// ─── Assessment ──────────────────────────────────────────────
export type AssessmentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type RiskFlag = 'normal' | 'short_stature' | 'tall_stature' | 'advanced' | 'delayed';

export interface Assessment {
  id: string;
  childId: string;
  doctorId: string;
  xrayImageUrl: string;
  status: AssessmentStatus;
  heightCm?: number;
  weightKg?: number;
  boneAgeMonths?: number;
  confidence?: number;
  heatmapUrl?: string;
  isMock?: boolean;
  finalAdultHeightCm?: number;
  targetHeightCm?: number;
  heightPercentile?: number;
  weightPercentile?: number;
  bmi?: number;
  bmiPercentile?: number;
  heightSdScore?: number;
  riskFlag?: RiskFlag;
  nextFollowupDate?: Date;
  followupNotes?: string;
  clinicalNotes?: string;
  createdAt: Date;
}

// ─── Redis Events ────────────────────────────────────────────
export interface AssessmentCompletedEvent {
  assessmentId: string;
  childId: string;
  doctorId: string;
}

export interface RecommendationSentEvent {
  recommendationId: string;
  parentId: string;
  doctorId: string;
}

export interface FollowupDueEvent {
  assessmentId: string;
  childId: string;
  doctorId: string;
  parentId: string | null;
  childName: string | null;
  date: string; // YYYY-MM-DD
}
