---
name: VolunteerHub — provisional Home proposal
description: Extracted Clear workspace baseline for volunteer Home only; awaiting owner style review.
colors:
  surface: '#fff'
  surface-2: '#eef2f6'
  ink: '#1e2d3b'
  muted: '#526170'
  faint: '#617181'
  line: '#dfe5eb'
  line-strong: '#bdc9d5'
  accent: '#31577f'
  accent-hover: '#244566'
  accent-ink: '#fff'
  accent-soft: '#e2ebf4'
  rail: '#eef2f6'
  rail-ink: '#405363'
  rail-active: '#dae5f0'
  rail-active-ink: '#173c61'
  good: '#247044'
  warn: '#926014'
  bad: '#ad463e'
  bad-soft: '#faeeec'
  progress-low: '#b45c52'
  progress-mid: '#ad851b'
  progress-full: '#248348'
  surface-dark: '#202831'
  surface-2-dark: '#293440'
  ink-dark: '#e5ebf1'
  muted-dark: '#b4c1ce'
  faint-dark: '#a9b8c7'
  line-dark: '#394958'
  line-strong-dark: '#6a7e91'
  accent-dark: '#c0d2e5'
  accent-hover-dark: '#d6e2ee'
  accent-ink-dark: '#243c54'
  accent-soft-dark: '#33485d'
  rail-dark: '#1a242e'
  rail-ink-dark: '#c1ced9'
  rail-active-dark: '#33485d'
  rail-active-ink-dark: '#f4f7fa'
  good-dark: '#9ec7ae'
  warn-dark: '#dfc18d'
  bad-dark: '#e2aaa4'
  bad-soft-dark: '#4b3332'
  progress-low-dark: '#c17c72'
  progress-mid-dark: '#bda15a'
  progress-full-dark: '#70b88a'
typography:
  display:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 2.75rem
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.04em
  headline:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 2rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.035em
  title:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.02em
  event-title:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 1.0625rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.02em
  body:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1
  label-small:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1
  link:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 0.9375rem
    fontWeight: 500
    lineHeight: 1.5
  meta:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
  date-value:
    fontFamily: Public Sans, Segoe UI, sans-serif
    fontSize: 1.625rem
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.04em
rounded:
  control: 8px
  dialog: 12px
  meter: 4px
  avatar: 50%
spacing:
  '4': 4px
  '8': 8px
  '12': 12px
  '16': 16px
  '20': 20px
  '24': 24px
  '28': 28px
  '32': 32px
  '40': 40px
  '48': 48px
  '56': 56px
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: 12px 18px
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: 12px 18px
  button-secondary-hover:
    backgroundColor: '{colors.surface-2}'
  button-shift:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.label-small}'
    rounded: '{rounded.control}'
    padding: 10px 14px
  button-small:
    typography: '{typography.label-small}'
    rounded: '{rounded.control}'
    padding: 8px 12px
  button-link:
    backgroundColor: transparent
    textColor: '{colors.accent}'
    typography: '{typography.link}'
    padding: '0'
  event-title-action:
    backgroundColor: transparent
    textColor: '{colors.accent}'
    typography: '{typography.event-title}'
    padding: '0'
  nav-item:
    backgroundColor: transparent
    textColor: '{colors.rail-ink}'
    rounded: '{rounded.control}'
    padding: 0 12px
    height: 44px
  nav-item-current:
    backgroundColor: '{colors.rail-active}'
    textColor: '{colors.rail-active-ink}'
  textarea:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: 7px 10px
  status-text:
    textColor: '{colors.ink}'
  service-summary:
    textColor: '{colors.muted}'
  display-panel:
    padding: 12px 8px
  event-dialog:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.dialog}'
    padding: 32px
    width: 100%
---

# Design System: VolunteerHub — provisional Home proposal

## Overview

**Creative North Star: "Clear workspace" (proposed; awaiting owner review)**

**Provisional scope: volunteer Home only.** This records the built Clear workspace proposal for `body.home-preview`, enabled only for a volunteer on `dashboard`. It is a review baseline, not an owner-approved site-wide system. Do not extend it to other routes before the owner reviews both directions and the working Home screen. Other screens continue to use `css/styles.css` and IBM Plex; Open agenda is a static alternative, not implemented app guidance.

Clear workspace is the proposal's working name, not an owner-selected brand commitment. The confirmed priorities are simplicity, readability, whitespace, order and contrast. The built screen expresses a campus student-services workspace through Public Sans, pale navigation, a white reading field, clear dates and explicit actions. Its first commitment leads; verified service and recommendations remain quieter. These composition choices describe this Home proposal only.

Source authority is `volunteerhub-web/vh-web/css/home-preview.css` and `js/views/home-preview.js`, with inherited primitives from `css/styles.css` and scoped integration in `js/app.js` and `index.html`. The surface contract is `.impeccable/surfaces/volunteerhub-web-vh-web-js-views-home-preview-js.md` (`seed:d1036f369104af8f`). Token names are extraction keys, not new owner commitments. The frontmatter governs only this scope; dark suffixes record the source overrides. Sidecar tonal ramps are synthesized panel previews, not shipped token scales.

The finish verdict cleared four scored fixes: visible mobile destinations, underlined recommendation details, semantic progress in the alternate sketch, and complete city-origin copy in the dialog. It does not approve the whole surface or a site-wide rollout. The reported 34 isolated checks use sample data and stubbed Firebase configuration; they do not establish production Firebase or load-test readiness. See `docs/VISUAL_PREVIEW.md` for the two proposals and verification context.

**Key Characteristics:**

- Flat reading areas, pale navigation and restrained slate-blue actions.
- One UI family, tabular dates and service amounts, explicit action labels.
- Visible mobile destinations, inline display preferences and retained keyboard access.
- Text accompanies semantic progress and status color; no decorative imagery or shipped raster UI.

## Colors

The light palette combines a white reading field, blue-grey rail, dark ink and restrained slate-blue actions. The frontmatter preserves source hex values for selected reused roles rather than every inherited alias.

### Primary

- **Slate-blue action** (`accent`, `accent-hover`, `accent-ink`, `accent-soft`): primary actions, links, focus and selected display settings. Dark mode uses pale blue action fills with dark text.

### Neutral

- **White reading field** (`surface`): workspace and dialog background.
- **Pale navigation** (`rail`, `surface-2`): light sidebar and secondary hover surfaces.
- **Dark ink and quiet metadata** (`ink`, `muted`, `faint`): primary text, practical details and support text.
- **Divider and control stroke** (`line`, `line-strong`): list separators and outlined controls.
- **Navigation states** (`rail-ink`, `rail-active`, `rail-active-ink`): a visible current destination and quiet inactive labels.

Semantic `good`, `warn` and `bad` remain available to existing detail/status components; `bad-soft` supports field errors. `progress-low`, `progress-mid` and `progress-full` are the three continuous progress anchors. Every listed role has a `-dark` counterpart. Auto follows the system preference unless Light or Dark is explicitly selected. High contrast maps muted/faint text and divider strokes to ink, and the secondary surface to the main surface.

**The Semantic Progress Rule.** Within this proposal, progress continuously mixes low red through midpoint yellow to completion green, with amounts and a percentage in text. Do not substitute a single accent fill.

## Typography

**Display and Body Font:** Public Sans, with Segoe UI and sans-serif fallbacks. The local variable font supports weights 400–700 with `font-display: swap`; its font file and `Public-Sans-OFL.txt` license live in `volunteerhub-web/vh-web/fonts/`.

**Character:** A readable, consistent UI voice. This Home scope also maps the inherited mono role to Public Sans. The default root is 15px; the existing text-size preference adjusts it from 13px to 21px, so retain rem-based type.

### Hierarchy

- **Display:** verified hours use `display`, reducing to 2.25rem on mobile.
- **Headline:** the greeting uses `headline`, reducing to 1.75rem below 1200px.
- **Title:** section headings use `title`, reducing to 1.0625rem at the mobile breakpoint. Event titles use `event-title`; the first shift rises to 1.25rem, then 1.1875rem on narrow phones.
- **Body and labels:** `body`, `label`, `label-small`, `link`, `meta` and `small` separate reading text, controls and quieter details. Event times use 0.9375rem with 1.5 line height.
- **Dates and amounts:** tabular numerals; `date-value` rises to 2.25rem for the next shift. There is no uniform mathematical scale ratio.

**The One UI Family Rule.** Public Sans carries Home headings, body text, dates, controls and dialog text. Other routes retain their existing typography until a separate owner decision.

## Layout

The desktop frame pairs a 240px rail with a flexible workspace. At 1199px and below the rail is 220px. The reading area is centered with a 1120px maximum width; main horizontal padding steps from 56px to 32px, then 24px at 780px and 20px at 520px. Page gaps are 32px, then 28px on mobile. The rail is sticky and scrollable vertically from 781px upward.

Within this Home composition, the schedule leads a flexible column beside a 220px service summary (180px at the intermediate breakpoint). Recommendations follow below, using two columns on desktop. At 780px and below the rail becomes a compact header, all five navigation destinations wrap visibly, content becomes one column, and recommendations use single rows. At 520px and below shift and recommendation actions move beneath the event text. Profile stays direct; mobile Help provides access to replay the tour.

Print hides the shell utilities and removes main padding, with one content column. No app-wide layout migration is implied.

## Elevation & Depth

The Home reading surface is flat: tonal contrast, whitespace and thin rules establish structure. Shift rows, the service summary, progress and the tour have no decorative elevation. Dialogs and toasts retain the inherited pop-up shadow; the dialog overlay uses `rgba(10,14,18,.45)`. Exact shadows and motion are in the sidecar because the frontmatter schema does not carry them.

**The Flat Reading Surface Rule.** Home content uses whitespace and divider rules at rest. Pop-up shadows belong to inherited dialogs and toasts, not to each shift or summary.

## Shapes

Controls and navigation use the `control` radius; the event dialog uses `dialog`, the Home meter uses `meter`, and profile initials use `avatar`. Event lists are open rows with thin dividers, not individually boxed cards. No decorative imagery or raster interface artwork ships with this proposal; documentation screenshots are evidence only.

## Components

### Buttons

Clear, task-named controls. Normal buttons have a minimum height of 42px; shift and recommendation actions use 40px, and small buttons use 34px. Filled actions use the primary colors; outlined actions use the reading surface, ink and strong stroke. Hover changes fill/border without lifting the control. The transition is 0.16s; reduced motion disables transitions and animations. Disabled buttons retain the inherited 0.45 opacity.

### Links and navigation

Recommendation titles are underlined action buttons at rest, separate from Sign up; hover changes the action color. Secondary text actions underline on hover. Desktop navigation uses 44px rows, drawn SVG icons and an `aria-current` selected state. Mobile hides icons and wraps every destination without horizontal scrolling. Counts retain readable labels rather than becoming decorative badges.

### Containers and service progress

Open schedule/recommendation lists and a divider-separated service summary replace repeated metric cards in this proposal. The Home meter is 7px tall, with no inset shadow. `progressMeter` interpolates in OKLCH over the two halves of the spectrum and exposes progress values and text through ARIA; the screen also prints hours, goal and percentage.

### Display preferences

A named button expands an inline panel using `aria-expanded`, `aria-controls` and `hidden`. Text-size controls, Auto/Light/Dark buttons and high contrast remain explicit. Theme and contrast states use `aria-pressed`. Segmented theme/text controls are 36px tall on desktop and 40px on mobile. Profile opens directly; Home has no account dropdown. The final volunteer tour step describes these controls and Help.

### Dialogs, fields and status

The existing detail dialog is 100% wide up to 720px, with 32px padding (24px on mobile), the scoped dialog radius and inherited pop-up depth. Its background follows the Home theme. Opening makes the app inert, traps focus, and closing returns focus to the matching action even after redraws. The detail flow retains plain status text with small semantic dots, complete approximate city-distance copy, signup and existing event actions.

The inherited concern textarea uses the scoped control radius, reading surface, strong stroke and `7px 10px` padding; dialog textareas use Public Sans at 0.82rem. Field focus retains the accent border and soft ring; invalid fields use the existing bad/bad-soft treatment. These are inherited controls within the Home detail flow, not a new form redesign.

Every Home focus-visible target has a 2px accent outline offset by 4px. The skip link appears on focus. High contrast also retains thicker control borders and an outlined meter. These are implemented accessibility behaviors, not a claim of certification.

## Do's and Don'ts

### Do:

- Do keep this baseline confined to the volunteer Home proposal until the owner chooses the next scope.
- Do retain all five navigation destinations at rest on phones, with wrapping rather than clipped horizontal navigation.
- Do use explicit actions such as View shift, Find opportunities, View my hours and Sign up; keep recommendation titles visibly underlined at rest.
- Do preserve text size, Auto/Light/Dark, high contrast, reduced motion and keyboard focus behavior.
- Do retain numeric progress and clear service/status text alongside semantic color.

### Don't:

- Don't treat Clear workspace, its extracted token names, the finish verdict or this file as owner style approval.
- Don't copy Open agenda's static composition into the app as an established system.
- Don't introduce neon accents, vague actions, descriptive tab clutter or unnecessary account dropdowns; the owner rejects SignUpGenius-style clutter.
- Don't replace working navigation, event IDs, data handlers or permission distinctions while applying visual changes.
