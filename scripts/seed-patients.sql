-- Seed 4 patients for doctor@totan.app with full assessment histories

-- ── Child 1: ธนกฤต (boy, 8 yrs, Normal) ────────────────────────────────────
INSERT INTO children (id, "doctorId", name, "dateOfBirth", sex, ethnicity,
  "heightCm", "weightKg", "fatherHeightCm", "motherHeightCm", "clinicalNotes")
VALUES (
  'c1000001-0000-0000-0000-000000000001',
  'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
  'd.ch. Thanakrit Wongsawang', '2016-03-14', 'M', 'Asian',
  128.5, 27.2, 172, 158,
  'Healthy boy, normal development. Parents concerned about height.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO assessments (
  id, "childId", "doctorId", "xrayImageUrl", status,
  "heightCm", "weightKg", "boneAgeMonths", confidence,
  "finalAdultHeightCm", "targetHeightCm", "heightPercentile",
  "weightPercentile", bmi, "bmiPercentile", "heightSdScore",
  "riskFlag", "clinicalNotes", "nextFollowupDate", "isMock", "createdAt"
) VALUES
('a1000001-0001-0000-0000-000000000001',
 'c1000001-0000-0000-0000-000000000001',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 95.1, 14.8, 37, 0.88, 171.2, 165.5, 45, 48, 16.4, 52, -0.1,
 'normal', 'Normal development at age 3.', '2020-09-14', true,
 '2019-03-14 09:00:00'),
('a1000001-0002-0000-0000-000000000001',
 'c1000001-0000-0000-0000-000000000001',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 109.3, 18.5, 61, 0.89, 170.8, 165.5, 43, 45, 15.5, 48, -0.2,
 'normal', 'Height within normal percentile.', '2022-03-14', true,
 '2021-03-14 09:00:00'),
('a1000001-0003-0000-0000-000000000001',
 'c1000001-0000-0000-0000-000000000001',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 121.4, 23.5, 85, 0.91, 171.2, 165.5, 42, 44, 15.9, 46, -0.2,
 'normal', 'Steady growth. FAH close to TH.', '2023-09-14', true,
 '2023-03-14 09:00:00'),
('a1000001-0004-0000-0000-000000000001',
 'c1000001-0000-0000-0000-000000000001',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 128.5, 27.2, 100, 0.91, 171.2, 165.5, 42, 44, 16.5, 47, -0.2,
 'normal', 'Normal growth. No special treatment required.', '2025-05-14', true,
 '2024-11-08 09:00:00')
ON CONFLICT (id) DO NOTHING;

-- ── Child 2: Supaporn (girl, 10 yrs, Short Stature) ─────────────────────────
INSERT INTO children (id, "doctorId", name, "dateOfBirth", sex, ethnicity,
  "heightCm", "weightKg", "fatherHeightCm", "motherHeightCm", "clinicalNotes")
VALUES (
  'c2000002-0000-0000-0000-000000000002',
  'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
  'd.ny. Supaporn Charoensu', '2014-07-22', 'F', 'Asian',
  126.8, 26.4, 165, 150,
  'Parents worried she is shorter than peers. Family history of short stature.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO assessments (
  id, "childId", "doctorId", "xrayImageUrl", status,
  "heightCm", "weightKg", "boneAgeMonths", confidence,
  "finalAdultHeightCm", "targetHeightCm", "heightPercentile",
  "weightPercentile", bmi, "bmiPercentile", "heightSdScore",
  "riskFlag", "clinicalNotes", "nextFollowupDate", "isMock", "createdAt"
) VALUES
('a2000002-0001-0000-0000-000000000002',
 'c2000002-0000-0000-0000-000000000002',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 97.2, 15.2, 46, 0.84, 150.5, 150.5, 12, 25, 16.1, 38, -1.2,
 'short_stature', 'Height P12 — below normal.', '2019-07-22', true,
 '2018-07-22 09:00:00'),
('a2000002-0002-0000-0000-000000000002',
 'c2000002-0000-0000-0000-000000000002',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 108.4, 18.9, 68, 0.85, 151.2, 150.5, 10, 22, 16.1, 35, -1.3,
 'short_stature', 'Growth velocity declining. Monitor closely.', '2021-01-22', true,
 '2020-07-22 09:00:00'),
('a2000002-0003-0000-0000-000000000002',
 'c2000002-0000-0000-0000-000000000002',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 118.5, 22.3, 90, 0.86, 150.8, 150.5, 8, 18, 15.9, 30, -1.4,
 'short_stature', 'Bone age 6 months delayed. FAH near TH.', '2023-01-22', true,
 '2022-07-22 09:00:00'),
('a2000002-0004-0000-0000-000000000002',
 'c2000002-0000-0000-0000-000000000002',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 126.8, 26.4, 118, 0.87, 151.0, 150.5, 7, 15, 16.4, 28, -1.5,
 'short_stature', 'Refer to endocrinologist. Follow-up every 6 months.', '2025-07-22', true,
 '2024-07-22 09:00:00')
ON CONFLICT (id) DO NOTHING;

-- ── Child 3: Weeraphad (boy, 12 yrs, Tall Stature) ──────────────────────────
INSERT INTO children (id, "doctorId", name, "dateOfBirth", sex, ethnicity,
  "heightCm", "weightKg", "fatherHeightCm", "motherHeightCm", "clinicalNotes")
VALUES (
  'c3000003-0000-0000-0000-000000000003',
  'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
  'd.ch. Weeraphad Prasitthiwit', '2012-11-05', 'M', 'Asian',
  156.4, 45.2, 178, 164,
  'Significantly above average height. Tall parents. No precocious puberty signs.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO assessments (
  id, "childId", "doctorId", "xrayImageUrl", status,
  "heightCm", "weightKg", "boneAgeMonths", confidence,
  "finalAdultHeightCm", "targetHeightCm", "heightPercentile",
  "weightPercentile", bmi, "bmiPercentile", "heightSdScore",
  "riskFlag", "clinicalNotes", "nextFollowupDate", "isMock", "createdAt"
) VALUES
('a3000003-0001-0000-0000-000000000003',
 'c3000003-0000-0000-0000-000000000003',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 116.8, 20.5, 63, 0.90, 185.2, 178.5, 90, 82, 15.0, 70, 1.3,
 'tall_stature', 'Height P90, consistent with genetics.', '2018-05-05', true,
 '2017-11-05 09:00:00'),
('a3000003-0002-0000-0000-000000000003',
 'c3000003-0000-0000-0000-000000000003',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 132.5, 28.3, 88, 0.91, 184.8, 178.5, 91, 84, 16.1, 72, 1.4,
 'tall_stature', 'Good growth velocity. No precocious puberty.', '2020-11-05', true,
 '2019-11-05 09:00:00'),
('a3000003-0003-0000-0000-000000000003',
 'c3000003-0000-0000-0000-000000000003',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 143.2, 35.8, 111, 0.92, 184.5, 178.5, 92, 86, 17.5, 74, 1.4,
 'tall_stature', 'Bone age matches chronological age. FAH ~6 cm above TH.', '2022-05-05', true,
 '2021-11-05 09:00:00'),
('a3000003-0004-0000-0000-000000000003',
 'c3000003-0000-0000-0000-000000000003',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 156.4, 45.2, 148, 0.93, 185.2, 178.5, 93, 88, 18.5, 76, 1.5,
 'tall_stature', 'Entering puberty. Normal growth spurt. No treatment needed.', '2025-05-05', true,
 '2024-11-05 09:00:00')
ON CONFLICT (id) DO NOTHING;

-- ── Child 4: Napatsorn (girl, 6 yrs, Normal — premature birth) ──────────────
INSERT INTO children (id, "doctorId", name, "dateOfBirth", sex, ethnicity,
  "heightCm", "weightKg", "fatherHeightCm", "motherHeightCm", "clinicalNotes")
VALUES (
  'c4000004-0000-0000-0000-000000000004',
  'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
  'd.ny. Napatsorn Maneerat', '2018-01-30', 'F', 'Asian',
  108.2, 17.8, 168, 155,
  'Born premature (34 weeks). Monitoring catch-up growth.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO assessments (
  id, "childId", "doctorId", "xrayImageUrl", status,
  "heightCm", "weightKg", "boneAgeMonths", confidence,
  "finalAdultHeightCm", "targetHeightCm", "heightPercentile",
  "weightPercentile", bmi, "bmiPercentile", "heightSdScore",
  "riskFlag", "clinicalNotes", "nextFollowupDate", "isMock", "createdAt"
) VALUES
('a4000004-0001-0000-0000-000000000004',
 'c4000004-0000-0000-0000-000000000004',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 83.5, 11.2, 21, 0.82, 158.4, 155.0, 28, 30, 16.1, 42, -0.6,
 'normal', 'Catch-up growth post-prematurity.', '2021-07-30', true,
 '2020-01-30 09:00:00'),
('a4000004-0002-0000-0000-000000000004',
 'c4000004-0000-0000-0000-000000000004',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 97.4, 15.0, 45, 0.83, 157.9, 155.0, 25, 28, 15.8, 38, -0.7,
 'normal', 'Catch-up growth continuing.', '2023-07-30', true,
 '2022-01-30 09:00:00'),
('a4000004-0003-0000-0000-000000000004',
 'c4000004-0000-0000-0000-000000000004',
 'a1f9f839-30b7-4f5b-a324-370bd0d2b3fd',
 'https://placehold.co/400x500/0f172a/67e8f9?text=X-Ray', 'completed',
 108.2, 17.8, 68, 0.85, 158.4, 155.0, 22, 25, 15.2, 34, -0.8,
 'normal', 'Slightly delayed bone age. Continue monitoring.', '2025-07-30', true,
 '2024-07-30 09:00:00')
ON CONFLICT (id) DO NOTHING;
