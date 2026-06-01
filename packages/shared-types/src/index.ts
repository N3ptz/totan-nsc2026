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
  parentId: string;
  doctorId: string;
}

// ─── Assessment ──────────────────────────────────────────────
export type AssessmentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Assessment {
  id: string;
  childId: string;
  xrayImageUrl: string;
  status: AssessmentStatus;
  boneAgeMonths?: number;
  boneAgeYears?: number;
  confidence?: number;
  finalAdultHeightCm?: number;
  percentile?: number;
  heatmapUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

// ─── Redis Events ────────────────────────────────────────────
export interface AssessmentCompletedEvent {
  assessmentId: string;
  childId: string;
  doctorId: string;
  parentId: string;
}

export interface RecommendationCreatedEvent {
  recommendationId: string;
  assessmentId: string;
  childId: string;
  parentId: string;
}
