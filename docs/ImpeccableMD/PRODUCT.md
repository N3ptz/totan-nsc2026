# Product

## Register

brand

## Users

**Primary — Thai Pediatricians (แพทย์เด็ก)**
Context: hospital clinic or private practice, desktop workstation, focused workflow. They upload X-ray images, review AI-generated bone age assessments, write recommendations, and manage a patient list. They are busy professionals who need fast, trustworthy tools with no friction.

**Secondary — Parents (ผู้ปกครอง)**
Context: mobile or tablet, at home or in a waiting room. They check their child's growth results, read doctor recommendations, and receive follow-up reminders. They are anxious for clarity, not raw data.

## Product Purpose

โตทัน (Toh-Tan) is an AI-powered bone age assessment system for Thai children. A doctor uploads a left-hand X-ray; the AI analyzes it against the Greulich & Pyle atlas and returns a bone age estimate with confidence score, growth percentile, and risk flag. The doctor reviews, annotates, and sends a recommendation to the parent. The system generates a PDF report and sends notification reminders for follow-ups.

Success means a pediatrician can go from X-ray upload to a signed recommendation in under two minutes, and a parent can understand their child's growth trajectory without a medical degree.

Built for NSC 2026 (National Software Contest), Mahidol University.

## Brand Personality

**Tech-forward. Clinical. Trustworthy.**

The product lives at the intersection of AI precision and human care. It should feel like the most advanced tool in the room — not a toy, not a legacy system. Calm confidence, not cold sterility. The AI does the hard work invisibly; the UI puts the doctor in control.

Voice: direct, precise, no filler. Thai-language-first with full English support.

## Anti-references

- **Old hospital EHR/HIS software** (Think Meditech, old HIS Thailand): cluttered tables, blue-grey gradients, tiny fonts, no whitespace. The exact opposite of this product.
- **Generic SaaS purple-on-white** (Notion/Linear aesthetic): too soft, lacks the clinical authority this product needs.
- **Consumer health apps that feel cute** (pastel rounded bubbles): this is a professional clinical tool, not a wellness tracker.
- **Dark "hacker" aesthetics**: neon-on-black terminal vibes are wrong for a medical context used by doctors with patients present.

## Design Principles

1. **Clinical confidence over decoration** — Every visual choice should reinforce that this system is medically serious. Restraint is a feature. No decorative gradients on functional surfaces.
2. **Data is the hero** — The X-ray image, the bone age number, the risk flag: these are what matter. The UI frames them, never competes with them.
3. **Speed reads as trust** — A doctor should be able to scan a patient record in 5 seconds. Hierarchy, contrast, and density must serve speed-reading, not visual delight.
4. **Thai-first, globally readable** — Typography choices must handle Thai script beautifully. Font sizes, line-height, and spacing must be tuned for mixed Thai/English content.
5. **Calm under pressure** — Doctors use this in clinical settings. No busy animations, no loud alerts for normal states. Motion should be subtle; only critical flags earn color emphasis.

## Accessibility & Inclusion

- Target: WCAG 2.1 AA minimum.
- Body text contrast must meet 4.5:1 against all backgrounds; the dashboard will be used in bright clinical rooms.
- Full keyboard navigation for the dashboard (doctors may use it without a mouse in some workflows).
- Reduced-motion support: all animations must have `prefers-reduced-motion` alternatives.
- Thai and English language switching throughout (already implemented via i18n context).
- Color-blind safe: risk flags (normal / short stature / advanced / delayed) must use shape + label + color, never color alone.
