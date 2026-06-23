---
name: ProRegis
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0b1c30'
  on-tertiary-container: '#75859d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter-mobile: 16px
  gutter-desktop: 24px
  margin-mobile: 16px
  margin-desktop: auto
  container-max-width: 1200px
---

## Brand & Style

This design system is engineered for a high-trust corporate environment, specifically optimized for Progressive Web App (PWA) performance. The brand personality is **Professional, Systematic, and Efficient**. It utilizes a **Corporate Modern** style—a refined evolution of HIG and Material Design principles—prioritizing clarity over decoration. 

The aesthetic focuses on "utility-first" luxury, where generous whitespace and precision alignment communicate reliability. The target audience includes enterprise users and professionals who require a tool that feels native to their device while remaining lightweight and fast-loading. The emotional response should be one of quiet confidence and technical competence.

## Colors

The color palette is anchored in a foundation of "Trustworthy Deep Blues." 

- **Primary:** A deep Navy (#0F172A) used for text, navigation, and high-level structural elements.
- **Action/Accent:** An "Electric Blue" (#0EA5E9) for primary call-to-actions, progress indicators, and interactive states. This color is chosen for its high visibility and energetic feel against the static navy.
- **Secondary/Neutral:** A range of Slate Grays (#64748B) for secondary information and borders.
- **Surface:** The background utilizes a very subtle cool white (#F8FAFC) to reduce eye strain compared to pure white, maintaining a clean, medical-grade professional look.

All color combinations must maintain a minimum contrast ratio of 4.5:1 for body text and 3:1 for large text and UI components to ensure WCAG AA compliance.

## Typography

This design system uses **Inter** exclusively to take advantage of its systematic, utilitarian nature and exceptional legibility on mobile screens. 

The hierarchy is built on a "Mobile-First" scale. For PWA implementations, we use negative letter spacing on larger headlines to ensure a compact, professional look. Labels and captions use a slightly heavier weight (Medium 500 or Semi-Bold 600) to ensure they remain legible even at smaller sizes or in high-glare environments. Large headlines scale down dynamically for mobile devices to prevent excessive line wrapping.

## Layout & Spacing

The layout follows a **Fluid Grid** model with strict horizontal padding to ensure content never touches the edge of mobile displays. 

- **Mobile:** 4-column layout with 16px margins. 
- **Tablet/Desktop:** 12-column layout with 24px gutters, capped at a 1200px container width for readability.

We use an 8px (0.5rem) spatial system for all padding and margins to maintain a rhythmic, mathematical balance. PWAs require "Safe Area" considerations for bottom navigation bars; ensure a minimum of 24px padding at the base of the viewport to accommodate OS-level home indicators.

## Elevation & Depth

We utilize **Ambient Shadows** on top of **Tonal Layers** to create a sense of organized depth.

- **Level 0 (Background):** Surface-neutral (#F8FAFC).
- **Level 1 (Cards):** Pure white background with a "Soft Ambient" shadow: `0px 4px 12px rgba(15, 23, 42, 0.05)`. This creates a subtle lift without feeling heavy.
- **Level 2 (Interactive/Hover):** Increased shadow depth: `0px 8px 24px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Modals/Overlays):** `0px 12px 32px rgba(15, 23, 42, 0.12)`.

Edges are defined by a very thin 1px border in a light slate gray (#E2E8F0) to ensure components remain distinct in low-contrast environments or on low-quality mobile screens.

## Shapes

The shape language is defined as **Rounded**, utilizing a 12px (0.75rem) base radius for standard cards and large containers. 

- **Small Components (Buttons, Inputs):** 8px radius.
- **Medium Components (Cards, Modals):** 12px radius.
- **Large Components (Sections):** 16px radius.

This "Soft-Square" approach balances the friendliness of rounded corners with the professional rigor of a corporate tool. Interactive elements like "Chips" or "Tags" may use a fully pill-shaped (999px) radius to distinguish them from actionable buttons.

## Components

### Buttons
Primary buttons use the Action Blue (#0EA5E9) with white text. They must have a minimum height of 48px for mobile "fat-finger" accessibility. Secondary buttons use a ghost style with a 1px border and the primary navy text.

### Input Fields
Fields feature a subtle gray background (#F1F5F9) that transitions to white on focus. The active state is indicated by a 2px Action Blue border. Labels are always visible (not floating) to ensure consistent context during data entry.

### Cards
Cards are the primary container. They must have 20px of internal padding. Cards should be "tappable" in their entirety when representing a single data object, with a clear visual feedback (subtle gray background change) on touch.

### Navigation
A bottom navigation bar is mandatory for the PWA. Icons should be 24px, accompanied by 10px labels. The active tab is indicated by the Action Blue color.

### Feedback
Use "Toast" notifications for system feedback, appearing at the top of the mobile screen to avoid conflict with bottom navigation.