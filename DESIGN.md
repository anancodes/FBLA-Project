---
name: VolunteerHub — Open agenda
description: A readable service website with dark blue wayfinding and clear records.
colors:
  action: "#496a80"
  action-hover: "#34566d"
  sidebar: "#263f50"
  field: "#ffffff"
  field-quiet: "#f2f5f7"
  ink: "#182c3c"
  muted: "#526b7b"
  divider: "#dce5eb"
  control-line: "#7c94a4"
  selected: "#e7eef3"
  progress-low: "#b45c52"
  progress-mid: "#ad851b"
  progress-full: "#248348"
typography:
  headline: {fontFamily: 'Public Sans, "Segoe UI", sans-serif', fontSize: "1.875rem", fontWeight: 600, lineHeight: 1.35, letterSpacing: "-0.025em"}
  title: {fontFamily: 'Public Sans, "Segoe UI", sans-serif', fontSize: "1.3125rem", fontWeight: 600, lineHeight: 1.5, letterSpacing: "-0.018em"}
  event: {fontFamily: 'Public Sans, "Segoe UI", sans-serif', fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.4, letterSpacing: "-0.012em"}
  body: {fontFamily: 'Public Sans, "Segoe UI", sans-serif', fontSize: "1rem", fontWeight: 400, lineHeight: 1.5}
  label: {fontFamily: 'Public Sans, "Segoe UI", sans-serif', fontSize: "0.9375rem", fontWeight: 500, lineHeight: 1}
  meta: {fontFamily: 'Public Sans, "Segoe UI", sans-serif', fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.5}
rounded: {control: "4px", dialog: "12px"}
spacing: {fine: "4px", small: "8px", compact: "12px", normal: "16px", group: "24px", section: "32px", desktop: "56px"}
components:
  button-primary: {backgroundColor: "{colors.action}", textColor: "{colors.field}", typography: "{typography.label}", rounded: "{rounded.control}", padding: "10px 18px"}
  button-secondary: {backgroundColor: "{colors.field}", textColor: "{colors.ink}", typography: "{typography.label}", rounded: "{rounded.control}", padding: "10px 18px"}
  input: {backgroundColor: "{colors.field}", textColor: "{colors.ink}", rounded: "{rounded.control}", padding: "7px 10px"}
  nav-link: {backgroundColor: "{colors.sidebar}", textColor: "#f0f5f8", rounded: "{rounded.control}", padding: "10px 12px"}
  progress: {backgroundColor: "{colors.divider}", rounded: "0", height: "6px"}
  inline-settings: {backgroundColor: "{colors.sidebar}", padding: "12px 0 20px"}
---

# Design System: VolunteerHub

## Overview

**Creative North Star: "Open agenda"**

The owner selected Open agenda and explicitly required a website. Dark blue wayfinding, a white reading field, readable Public Sans and ordinary web controls establish a simple, ordered service website. This system applies to login, signup and both existing role experiences.

Schools and nonprofits receive equal care. Clear dates, explicit actions and distinct service states support people finding opportunities and coordinators maintaining accurate records. Organization details remain configurable; sample content does not establish customers or endorsements.

Source authority is `volunteerhub-web/vh-web/css/open-agenda.css` and `js/website.js`, composed with `css/styles.css`, `js/app.js` and `index.html`. The selected code-led reference is `.impeccable/mocks/decision/open-agenda.html`; the website direction contract is `.impeccable/surfaces/volunteerhub-web-vh-web-js-website-js.md`. Frontmatter records reused light-mode tokens; source overrides govern dark and high-contrast modes. Sidecar ramps are panel previews, not shipped scales.

The finish disposition is **ship** for the reviewed states (28 required captures and sampled source). The 38 isolated workflow, responsive, keyboard and axe checks use fixtures; they do not establish production Firebase behavior or load-test readiness.

**Key Characteristics:**

- Dark blue navigation and flat, generously spaced reading areas.
- One readable UI family, tabular dates and amounts, explicit task labels.
- Real navigation links, browser history, natural page scrolling and visible mobile destinations.
- Numeric and verbal status alongside color, with retained display preferences and keyboard access.

## Colors

### Primary

Slate-blue action and its deeper hover state identify deliberate controls. Dark blue sidebar anchors wayfinding; the pale selected tone identifies the current destination with dark ink. The login identity panel uses the same sidebar family.

### Neutral

White field carries content; quiet field supports table headers and secondary hover states. Ink carries primary reading, muted supports practical detail, divider separates records, and control line gives fields a stronger boundary. Navigation uses its own light text and subdued account detail from the source.

### Named Rules

**The Semantic Progress Rule.** Progress continuously mixes low red through midpoint yellow to completion green in OKLCH, accompanied by amounts and percentage text. Keep pending claims distinct from verified service.

Dark mode uses a deep slate reading field with pale blue actions and softer semantic colors; the sidebar stays dark blue. High contrast promotes quiet text and borders to ink and thickens supported control borders. Preserve these source variants rather than deriving them from the light preview ramps.

## Typography

Public Sans is self-hosted in `fonts/public-sans-latin.woff2` with weights (400–700) and a Segoe UI/sans-serif fallback. It carries headings, body text and controls. Technical codes and inherited dialog textareas retain a system monospace.

The runtime preference starts at (16px), preserves saved preferences, and adjusts the root between (13px) and (21px). Body copy follows the root; the stylesheet's pre-runtime fallback is (15px).

- **Headline:** page title; reduces to (1.75rem) at the narrow breakpoint.
- **Title / event:** Home section heading and readable event title; the section heading reduces to (1.25rem) on narrow phones.
- **Body / label / meta:** normal reading, standard buttons and supporting text. Existing forms and tables retain their denser subordinate sizes.
- Dates use tabular numerals; Home date values use the headline size with line height (1.25). Verified hours use (1.625rem), weight (600), line height (1.3).

**The Readable Preference Rule.** Use rem-based hierarchy and retain text size, Auto/Light/Dark and high-contrast controls across the website.

## Layout

Desktop uses a navigation column (256px) and a flexible reading column; the rail becomes (224px) at widths up to (1200px). Main content has padding (56px 56px 48px), a centered maximum width (1280px) and a page gap (28px). The document scrolls normally; above (900px), the sidebar is sticky and independently scrolls only when needed.

At widths up to (900px), navigation becomes a header with wrapped links and no navigation icons; main padding becomes (32px 24px 36px). At (620px), horizontal padding is (20px) and Home becomes one column. Tables retain local overflow. Login's two equal columns collapse at (820px), with forms capped at (380px).

Home shows equal-weight dated shifts beside a quieter hours column (224px; 192px at the intermediate size), then recommendations across the full width. Groups use whitespace and hairline dividers. Footer actions remain in the normal document flow. Print hides navigation and footer and restores a single reading column.

## Elevation & Depth

**The Flat Reading Surface Rule.** Use whitespace, tone and divider lines for page structure. Shifts, recommendations and service summaries do not become raised cards.

Inherited dialogs and toasts use the existing popup shadow, with a darker shadow in dark mode. Fields add a soft focus ring; visible keyboard focus uses an outline (2px) offset (4px), with a pale outline on the sidebar. Button state transitions take (0.16s); reduced motion removes transitions and animations.

## Shapes

Regular controls use the small frontmatter radius; progress on Home is square-ended. Dialogs use the larger radius with padding (32px), reduced to (24px) on narrow phones. Existing demo-choice and waiver surfaces retain their own (8px) corners. Line icons remain SVG; status dots are accompanied by text.

## Components

**Buttons.** Primary actions use slate blue and white; hover deepens background and border. Secondary actions use a white field, dark ink and a stronger divider, with a quiet-field hover. Standard controls have minimum height (42px); small controls use (34px), while Home row actions use (40px) and padding (8px 15px). Disabled controls reduce opacity to (0.45).

**Inputs.** Labels sit above fields with a small gap (5px). Fields use a stronger control boundary, minimum height (36px) and font size (0.92rem). Focus adds the action-colored boundary and accent-soft ring; invalid fields use the red boundary, ring and error text. Textareas can resize vertically.

**Navigation.** Destinations are anchors with usable URL fragments and `aria-current="page"`. Desktop links have minimum height (48px); header links use (44px), wrap on phones, and retain every destination. Current links use pale fill, dark ink and weight (600). Subnavigation uses an accent underline. Role guards still decide which pages exist for each user; Back, Forward, refresh and new-tab navigation resolve through the same routes.

**Progress and records.** Home uses a slim meter with numeric hours, goal and percentage. Other progress surfaces retain their existing compact boundaries and status text. Signed up, waitlisted, attended, pending and approved remain separate states.

**Inline settings.** Display settings expand inside navigation with a labeled text-size pair, theme segments and an `aria-pressed` high-contrast control. Help and Profile are ordinary links; tour, sign-out and demo reset remain explicit actions in the footer.

## Do's and Don'ts

### Do:

- **Do** keep website links, browser navigation, ordinary scrolling and all mobile destinations usable.
- **Do** preserve saved display preferences, reduced motion, visible keyboard focus and text alongside semantic color.
- **Do** use explicit actions and maintain accurate role, permission and service-state distinctions.

### Don't:

- **Don't** add OS window chrome, app-like bottom navigation, neon accents or unnecessary account dropdowns.
- **Don't** add descriptive tab clutter or vague actions; the owner rejects SignUpGenius-style clutter.
- **Don't** turn sample organizations, demo records or isolated checks into commercial, production-readiness or accessibility-certification claims.
