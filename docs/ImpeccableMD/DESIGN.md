---
name: โตทัน (Toh-Tan)
description: AI bone age assessment for Thai children — clinical precision with human care
colors:
  diagnostic-blue:       "#0EA5E9"
  diagnostic-blue-light: "#E0F2FE"
  diagnostic-blue-dark:  "#0284C7"
  warmth-coral:          "#EA6C49"
  warmth-coral-light:    "#FFEDE6"
  clinical-green:        "#10B981"
  clinical-green-light:  "#D1FAE5"
  attention-amber:       "#F59E0B"
  attention-amber-light: "#FEF3C7"
  critical-red:          "#F43F62"
  critical-red-light:    "#FFE4E6"
  pure-surface:          "#FFFFFF"
  canvas:                "#F8FAFC"
  canvas-deep:           "#F1F5F9"
  deep-navy:             "#0F172A"
  slate-muted:           "#64748B"
  cool-divide:           "#E2E8F0"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.diagnostic-blue}"
    textColor: "{colors.pure-surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.diagnostic-blue-dark}"
    textColor: "{colors.pure-surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.diagnostic-blue}"
    rounded: "{rounded.md}"
    padding: "9px 19px"
  card:
    backgroundColor: "{colors.pure-surface}"
    textColor: "{colors.deep-navy}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.pure-surface}"
    textColor: "{colors.deep-navy}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  input-focus:
    backgroundColor: "{colors.pure-surface}"
    textColor: "{colors.deep-navy}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: โตทัน (Toh-Tan)

## 1. Overview

**Creative North Star: "The Precision Instrument"**

โตทัน is a professional-grade clinical tool where every pixel must earn its place. The design language draws from high-precision medical instruments and modern diagnostic software: systematic, exacting, immediately trustworthy. Visual noise is the enemy. The interface recedes so data can lead — a bone age number, a risk flag, an X-ray image should dominate the screen, never compete with chrome.

Two forces hold the system in tension. Diagnostic Blue carries the authority of AI precision and clinical technology. Warmth Coral is the counterweight: the human care that exists on the other side of every assessment. Together they say: this system is rigorous, but it is for children and the people who love them.

This system explicitly rejects three failure modes: the cluttered, small-font EHR interfaces that still dominate Thai hospital software; the generic SaaS purple-on-white that would drain clinical authority; and any consumer-wellness softness that would undermine trust with professional users.

**Key Characteristics:**
- Data-first: content density is high but scannable; every screen can be read in 5 seconds
- Dual-mode: light for clinical settings (bright exam rooms), dark for low-light reading
- Thai-first: typography, spacing, and line-height tuned for Thai/English mixed content
- Semantic color: every non-neutral color carries a specific clinical meaning; no decorative color use
- Flat by default: elevation serves state, not decoration

## 2. Colors: The Diagnostic Palette

Two intentional colors plus a semantic clinical set. Rarity is the point.

### Primary
- **Diagnostic Blue** (`#0EA5E9`): The color of AI precision and clinical interface action. Used on interactive elements, active states, and data visualizations. Carries authority without coldness. Never used decoratively.
- **Diagnostic Blue Light** (`#E0F2FE`): Tinted surface for primary-action zones, active nav items, selected states. Low saturation, high legibility.
- **Diagnostic Blue Dark** (`#0284C7`): Hover and pressed states for primary actions only.

### Secondary
- **Warmth Coral** (`#EA6C49`): The human voice in a clinical system. Used for call-to-action buttons on the landing page, follow-up reminders, and recommendation notifications — moments where a parent or doctor needs human-to-human acknowledgment, not a machine response.
- **Warmth Coral Light** (`#FFEDE6`): Coral tinted surface for CTA containers and warm callouts.

### Tertiary — Semantic Clinical Colors
These are not brand colors; they are clinical signals. Use exactly as labeled.

- **Clinical Green** (`#10B981`): Normal growth assessment outcomes. Success states. "ปกติ" badges.
- **Clinical Green Light** (`#D1FAE5`): Background tint for normal-outcome surfaces.
- **Attention Amber** (`#F59E0B`): Pending follow-up, action required. Not an error.
- **Attention Amber Light** (`#FEF3C7`): Background tint for pending-action surfaces.
- **Critical Red** (`#F43F62`): High-risk findings (short stature, delayed bone age). Error states.
- **Critical Red Light** (`#FFE4E6`): Background tint for critical-finding surfaces.

### Neutral
- **Deep Navy** (`#0F172A`): Primary text. Near-black with a slight cool cast; not pure black.
- **Slate Muted** (`#64748B`): Secondary text, labels, metadata.
- **Cool Divide** (`#E2E8F0`): Borders, dividers, input strokes. Structural only.
- **Canvas** (`#F8FAFC`): Page background. Slightly cool off-white; never warm/cream.
- **Canvas Deep** (`#F1F5F9`): Secondary surface, user card backgrounds, inner panels.
- **Pure Surface** (`#FFFFFF`): Cards, modals, sidebar.

### Named Rules
**The One Use Rule.** Diagnostic Blue appears on interactive elements. Warmth Coral appears on human-care moments. Clinical colors appear on clinical outcomes. No color is used outside its assigned role. Decorative color use is prohibited.

**The Cream Prohibition.** Canvas is `#F8FAFC`, a cool off-white. Never substitute a warm-tinted neutral (#FAFAF8, cream, sand, beige). Warmth in this system is carried by Warmth Coral, not by background tinting.

## 3. Typography

**Display / Headline Font:** Inter (system-ui fallback)
**Body Font:** DM Sans (system-ui fallback)

**Character:** Inter's optical precision at small sizes makes it authoritative for clinical data labels, nav items, and headings. DM Sans's warmer letterforms carry body copy without clinical coldness. Together: accurate and approachable, not sterile.

### Hierarchy
- **Display** (600 weight, `clamp(1.5rem, 3vw, 2.25rem)`, lh 1.1, ls -0.02em): Page headers, hero headings, stat values. Used sparingly — one per view.
- **Headline** (600 weight, 1.25rem, lh 1.3, ls -0.01em): Section headings, sidebar group labels, modal titles.
- **Title** (600 weight, 1rem, lh 1.4): Card headings, table column headers, patient name in lists.
- **Body** (DM Sans 400, 0.875rem, lh 1.6): All paragraph text, descriptions, recommendation content. Max 65–75ch per line.
- **Label** (Inter 500, 0.75rem, lh 1.3, ls 0.01em): Badges, metadata, status indicators, form labels. Never all-caps.

### Named Rules
**The Thai Body Rule.** All body copy is set in DM Sans at minimum 14px (0.875rem) with line-height 1.6. Thai script requires more leading than Latin; never reduce line-height below 1.5 on Thai body text.

**The Data Hierarchy Rule.** A primary clinical value (bone age, percentile, risk flag) is always the largest number on screen when shown. Supporting labels are label-size, never competing with the data itself.

## 4. Elevation

Flat by default. This system does not use decorative shadows. Depth is conveyed through tonal layering: Canvas (bg) → Canvas Deep (bg2) → Pure Surface (card) → pure white (modal). A card sits on the canvas because it is lighter, not because it casts a shadow.

The one exception: hover state. Cards gain a subtle shadow (`0 4px 12px rgba(15,23,42,0.08)`) on hover to confirm interactivity. This is a state response, not decoration.

### Shadow Vocabulary
- **Hover lift** (`0 4px 12px rgba(15,23,42,0.08)`, with `-translate-y-0.5`): Applied to interactive cards and patient list items on hover. Confirms clickability.
- **Focus ring** (`0 0 0 3px rgba(14,165,233,0.15)`): Applied to focused inputs and buttons. Diagnostic Blue tinted, never colored.
- **Sticky header** (`0 1px 0 rgba(15,23,42,0.06)` + `backdrop-blur-md`): The dashboard header's bottom border shadow on scroll. Structural, not decorative.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a direct response to state (hover lift, focus ring, sticky overlay). A card that shadows at rest is a failed card.

## 5. Components

### Buttons
Clean, direct. Shape confirms severity; color confirms intent.
- **Shape:** Gently rounded (12px, `{rounded.md}`)
- **Primary:** Diagnostic Blue fill (`#0EA5E9`), white text, 10px/20px padding. The primary action on any given screen.
- **Primary Hover:** Shifts to Diagnostic Blue Dark (`#0284C7`), `-translate-y-px` lift, `0.15s ease` transition.
- **Primary Active:** Scale `0.97`, removes lift.
- **Ghost:** Transparent background, 1.5px Diagnostic Blue border, Diagnostic Blue text. Secondary actions alongside a primary.
- **Warmth CTA (landing page only):** Warmth Coral fill (`#EA6C49`), white text, 16px/32px padding, 20px radius. Used only for the landing-page CTA, never in the product UI.
- **Destructive:** Critical Red fill. For delete/remove confirmations only. Always paired with a confirmation dialog.

### Input Fields
- **Style:** 1.5px Cool Divide border, Pure Surface background, 12px radius, DM Sans 14px
- **Focus:** Border shifts to Diagnostic Blue, `0 0 0 3px rgba(14,165,233,0.15)` ring. Immediate, no delay.
- **Error:** Border shifts to Critical Red, Critical Red Light background tint.
- **Disabled:** Opacity 0.5, Canvas Deep background, not-allowed cursor.
- **Placeholder:** Slate Muted at 40% opacity. Must not be used as a label substitute.

### Cards
- **Corner style:** Gently rounded (16px, `{rounded.lg}`)
- **Background:** Pure Surface (`#FFFFFF`)
- **Border:** 1px Cool Divide (`#E2E8F0`)
- **Shadow:** None at rest. Hover lift only for interactive cards.
- **Internal padding:** 20px (`{spacing.lg}`)
- **Nested cards:** Prohibited. If content hierarchy requires nesting, use Canvas Deep background and a divider instead.

### Stat Cards (Dashboard)
- **Background:** Pure Surface, no shadow
- **Icon area:** Semantic-color tinted circle at 8% opacity (Clinical Green/10 for patients, etc.)
- **Value:** Display weight (600), semantic accent color
- **Label:** Body size, Slate Muted
- **Hover:** Lift shadow + `-translate-y-0.5`

### Clinical Badges (Risk Flags)
Shape + color + label. Never color alone.
- **Normal** (`.badge-normal`): Clinical Green text on Clinical Green Light bg, rounded-full, 10px/6px padding
- **Warning** (`.badge-warning`): Attention Amber text on Attention Amber Light bg
- **Critical** (`.badge-danger`): Critical Red text on Critical Red Light bg
- **Info** (`.badge-info`): Diagnostic Blue text on Diagnostic Blue Light bg

### Navigation Sidebar
- **Background:** Pure Surface in light mode, Deep Navy surface in dark mode
- **Active item:** Diagnostic Blue/10 background, Diagnostic Blue text and icon
- **Inactive item:** Slate Muted text. Hover: Deep Navy text, ink/5 background
- **Typography:** Inter 500, 14px
- **User card:** Canvas Deep background, rounded-xl, role badge in semantic color

### Dashboard Header (Sticky)
- **Background:** Canvas at 90% opacity + `backdrop-blur-md`
- **Border:** 1px Cool Divide on bottom
- **Greeting:** Display weight, "สวัสดี [First Name] 👋" — uses first name only for warmth

## 6. Do's and Don'ts

### Do:
- **Do** use Diagnostic Blue exclusively for interactive elements and active states. If it's not clickable, it shouldn't be blue.
- **Do** use semantic colors only for their assigned clinical meaning: green = normal, amber = attention, red = critical.
- **Do** place risk flags with shape + label + color always. A parent may be colorblind.
- **Do** set body text at minimum 14px (0.875rem) with line-height 1.6, especially for Thai script.
- **Do** use Canvas (`#F8FAFC`) as the page background. Cool, not warm.
- **Do** keep stat card values as the largest number on screen in their section.
- **Do** provide `prefers-reduced-motion` alternatives for every transition and animation.
- **Do** surface the patient's X-ray, bone age value, and risk flag as the visual hero of any assessment screen.

### Don't:
- **Don't** use old-hospital-EHR visual patterns: dense blue-grey tables, tiny fonts, no whitespace, legacy chrome. This is the #1 anti-reference.
- **Don't** use SaaS purple-on-white: purple gradients, rounded card grids, Generic AI aesthetics.
- **Don't** use warm-tinted backgrounds (cream, sand, beige, parchment). Canvas is cool off-white.
- **Don't** use border-left as a colored accent stripe on cards or alerts. Use full background tints or full borders.
- **Don't** use gradient text (`background-clip: text`).
- **Don't** use Warmth Coral inside the product dashboard. It belongs on the landing page and human-care moments only.
- **Don't** nest cards inside cards. Use Canvas Deep and dividers for hierarchy.
- **Don't** put decorative text in uppercase body copy. Reserve uppercase for short status labels (≤4 words) only.
- **Don't** animate layout properties (width, height, padding, top/left). Animate only transform and opacity.
- **Don't** color a risk flag with color alone. Always include the label text ("ปกติ", "ต้องติดตาม", "ความเสี่ยงสูง") alongside the badge color.
