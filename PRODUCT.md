# Product

## Register

product

## Users

- **Doctors (pediatricians)**: open child cases, upload hand X-rays, review AI bone-age results, write recommendations, schedule follow-ups. Often working quickly between patients, on desktop in a clinic, sometimes on a tablet.
- **Parents/guardians**: check their child's growth results, read the doctor's recommendation, see follow-up dates. Mostly on mobile phones, non-technical, often anxious about their child's growth.
- Both roles use the same app (Thai-first UI) but see different screens based on role.

## Product Purpose

โตทัน (Totan) is a pediatric bone-age assessment platform: a doctor uploads a left-hand X-ray, an AI pipeline (DeepLabV3 → YOLOv11 → ConvNeXt → Grad-CAM → TW3) estimates bone age and predicts final adult height, the doctor confirms and sends results + recommendations, and parents receive them by email and in-app. Success = doctors trust and verify results fast; parents understand their child's growth without medical training.

## Brand Personality

Friendly, reassuring, kid-and-family oriented; clinically trustworthy without being cold or corporate. Medical data presented warmly and legibly. Thai language first.

## Anti-references

- Cold, dense hospital ERP interfaces (tiny gray text, cramped tables).
- Generic SaaS dashboard clichés (hero metrics, identical card grids).
- Anything that makes a "mock/simulated AI result" look like a confirmed diagnosis — mock flags must stay loud.

## Design Principles

1. **Parents read on phones**: every parent-facing surface must work one-handed on a small portrait screen.
2. **Doctors scan, then commit**: dense-but-legible summaries first, detail on demand; printing/PDF reports must be readable on paper.
3. **Explainability is a feature**: heatmaps, confidence, and mock flags are first-class UI, never fine print.
4. **Two roles, two vocabularies**: doctor screens can use clinical terms; parent screens explain in plain Thai.
5. **Warm but precise**: friendly visual language must never reduce data legibility or contrast.

## Accessibility & Inclusion

- Body text contrast ≥ 4.5:1; print output must stay legible in grayscale.
- Reduced-motion alternatives for all animations (already practiced in the codebase).
- Thai/English i18n via `apps/web/src/lib/i18n.tsx`.
- Parent audience includes low-tech-literacy users; avoid jargon and small touch targets (≥44px).
