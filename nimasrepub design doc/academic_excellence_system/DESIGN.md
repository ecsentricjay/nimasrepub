---
name: Academic Excellence System
colors:
  surface: '#faf9ff'
  surface-dim: '#dad9df'
  surface-bright: '#faf9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f9'
  surface-container: '#eeedf3'
  surface-container-high: '#e8e7ed'
  surface-container-highest: '#e3e2e8'
  on-surface: '#1a1b20'
  on-surface-variant: '#434750'
  inverse-surface: '#2f3035'
  inverse-on-surface: '#f1f0f6'
  outline: '#747781'
  outline-variant: '#c4c6d2'
  surface-tint: '#3c5d9c'
  primary: '#001b44'
  on-primary: '#ffffff'
  primary-container: '#002f6c'
  on-primary-container: '#7999dc'
  inverse-primary: '#aec6ff'
  secondary: '#1b6d24'
  on-secondary: '#ffffff'
  secondary-container: '#a0f399'
  on-secondary-container: '#217128'
  tertiary: '#371000'
  on-tertiary: '#ffffff'
  tertiary-container: '#591f00'
  on-tertiary-container: '#db835a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#aec6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#224583'
  secondary-fixed: '#a3f69c'
  secondary-fixed-dim: '#88d982'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005312'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#753311'
  background: '#faf9ff'
  on-background: '#1a1b20'
  surface-variant: '#e3e2e8'
  medical-blue: '#0077C8'
  science-green: '#4CAF50'
  paper-white: '#FFFFFF'
  ink-black: '#1A1C1E'
  status-under-review: '#F59E0B'
  status-accepted: '#10B981'
  status-published: '#002F6C'
  status-rejected: '#EF4444'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  article-body:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 32px
  article-abstract:
    fontFamily: Source Serif 4
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 34px
  ui-body:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  section-gap: 64px
---

## Brand & Style

The design system is engineered for **NIMASREPUB**, a scholarly repository that demands the highest levels of trust, institutional authority, and clarity. The brand personality is **Stately, Precise, and Scientific**, mirroring the rigor of the Nigerian medical and allied sciences community.

The visual direction follows a **Modern Corporate** aesthetic with a strong emphasis on **Literary Minimalism**. It prioritizes readability above all else to ensure that complex medical research remains the central focus. The atmosphere is calm and organized, utilizing generous whitespace and a "content-first" hierarchy to reduce the cognitive load inherent in academic publishing.

Key visual pillars include:
- **Scholarly Authority:** High-legibility serif typography for research content.
- **Institutional Trust:** A palette of deep, professional greens and blues derived from the Nigerian flag and the medical DNA motif.
- **Clinical Precision:** Sharp execution of UI elements, clear boundaries, and systematic information density.

## Colors

The palette is anchored by a deep **Oxford Blue** (Primary) and a **Forest Green** (Secondary), establishing a professional tone that feels rooted in Nigerian identity and global medical standards. 

- **Primary Blue:** Used for navigation, primary calls to action, and header elements to provide a sense of stability.
- **Secondary Green:** Used for secondary actions and environmental/science-related accents.
- **Neutral Surface:** The background remains a pure, high-contrast white to facilitate long-form reading on screens.
- **Semantic Accents:** A specialized range of status colors is defined for manuscript tracking, ensuring that authors can instantly recognize the state of their submission (e.g., Amber for "Under Review," Emerald for "Accepted").

## Typography

This system uses a dual-font strategy to balance UI utility with reading comfort.

- **UI Elements (Manrope):** A modern, geometric sans-serif used for navigation, dashboard controls, and labels. It provides a technical, clean counterpoint to the article text.
- **Research Content (Source Serif 4):** A highly legible serif font specifically designed for long-form digital reading. It is used for article titles, abstracts, and body text to evoke the feeling of a traditional printed journal.

**Scale & Rhythm:**
Headlines use tight line heights for impact, while the `article-body` role employs a generous 1.7x line height (32px line height for 18px text) to maximize readability and reduce eye strain during peer reviews.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Content is centered within a 1280px container on desktop to maintain optimal line lengths for reading, while margins scale fluidly on smaller devices.

- **Grid:** A 12-column grid system is used for dashboards and landing pages.
- **The "Reading Column":** For article pages, the main text is restricted to a 720px wide centered column (spanning 8 central columns) to prevent lines from becoming too long, which is a common failure in scientific repositories.
- **Rhythm:** An 8px base unit drives all padding and margin decisions. Generous vertical spacing (`section-gap`) is used between article sections (Abstract, Methods, Results) to create a clear visual hierarchy.

## Elevation & Depth

To maintain a scholarly and "flat" professional feel, the design system avoids heavy shadows or skeumorphic effects.

- **Tonal Layering:** Hierarchy is achieved through subtle background shifts (e.g., using a light gray `#F8F9FA` for secondary dashboard panels) rather than shadows.
- **Low-Contrast Outlines:** Cards and input fields use a 1px border (`#E5E7EB`). This provides structure without the visual "noise" of drop shadows.
- **Elevated States:** Only primary action buttons and floating manuscript trackers utilize a soft, 4px blur ambient shadow to indicate interactivity and priority.

## Shapes

The design system utilizes **Soft** geometry (`0.25rem` base radius). This subtle rounding takes the edge off the "clinical" feel of the site, making it approachable while remaining firmly professional.

- **UI Components:** Buttons, inputs, and cards use the `rounded-sm` (4px) or `rounded-md` (8px) values.
- **Badges:** Status badges for manuscript tracking use a higher `rounded-full` pill shape to distinguish them as metadata items rather than interactive components.

## Components

### Buttons
- **Primary ('Submit Manuscript'):** Solid Oxford Blue background with white text. High-contrast and always prominent.
- **Secondary:** Outlined Forest Green with green text. Used for "Download PDF" or "Export Citation."

### Article Cards
- Used in "Latest Issues" feeds. Features a clean white background, a 1px border, and a layout that prioritizes the Title (Serif) followed by Authors and DOI. Hover states should include a subtle scale-up and border-color shift to Primary Blue.

### Status Badges
- Small, pill-shaped tags used in the Author Dashboard. 
- **Under Review:** Amber text on Amber-50 background.
- **Accepted:** Emerald text on Emerald-50 background.
- **In Production:** Blue text on Blue-50 background.

### Input Fields
- Understated styling with a focus on clear labels (Manrope, 12px, Uppercase). Focused states must use a 2px Oxford Blue border to assist with accessibility during the submission process.

### Manuscript Tracker
- A vertical stepper component for authors to see their progress from "Submitted" to "Published." Completed steps use the Secondary Green to indicate success.