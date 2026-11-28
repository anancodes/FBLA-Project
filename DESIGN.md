---
name: VolunteerHub — Open agenda
description: A readable service website with forest-green wayfinding and clear records.
colors:
  action: "#22624d"
  action-hover: "#164837"
  sidebar: "#193e33"
  field: "#ffffff"
  field-quiet: "#f0f4ed"
  ink: "#192f2b"
  muted: "#4c6159"
  divider: "#d8e1d8"
  control-line: "#798c80"
  selected: "#e3efdf"
  schedule-ink: "#335978"
  schedule-field: "#e8f1f6"
  hours-ink: "#594570"
  hours-field: "#eee9f6"
  alerts-ink: "#833e26"
  alerts-field: "#fae7d7"
  hero-accent: "#f8ce77"
  progress-low: "#b45c52"
  progress-mid: "#ad851b"
  progress-full: "#248348"
typography:
  headline: {fontFamily: 'Atkinson Hyperlegible Next, "Segoe UI", sans-serif', fontSize: "1.875rem", fontWeight: 600, lineHeight: 1.35, letterSpacing: "-0.025em"}
  title: {fontFamily: 'Atkinson Hyperlegible Next, "Segoe UI", sans-serif', fontSize: "1.3125rem", fontWeight: 600, lineHeight: 1.5, letterSpacing: "-0.018em"}
  event: {fontFamily: 'Atkinson Hyperlegible Next, "Segoe UI", sans-serif', fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.4, letterSpacing: "-0.012em"}
  body: {fontFamily: 'Atkinson Hyperlegible Next, "Segoe UI", sans-serif', fontSize: "1rem", fontWeight: 400, lineHeight: 1.5}
  label: {fontFamily: 'Atkinson Hyperlegible Next, "Segoe UI", sans-serif', fontSize: "0.9375rem", fontWeight: 500, lineHeight: 1}
  meta: {fontFamily: 'Atkinson Hyperlegible Next, "Segoe UI", sans-serif', fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.5}
  public-display: {fontFamily: 'Bitter, Georgia, serif', fontSize: "clamp(3rem, 5.5vw, 5.8rem)", fontWeight: 550, lineHeight: 1.03, letterSpacing: "-0.025em"}
  public-headline: {fontFamily: 'Bitter, Georgia, serif', fontSize: "clamp(1.75rem, 2.4vw, 2.25rem)", fontWeight: 500, lineHeight: 1.25, letterSpacing: "-0.025em"}
  public-title: {fontFamily: 'Bitter, Georgia, serif', fontSize: "1.1875rem", fontWeight: 600, lineHeight: 1.4, letterSpacing: "-0.025em"}
  public-body: {fontFamily: 'Atkinson Hyperlegible Next, "Segoe UI", sans-serif', fontSize: "1rem", fontWeight: 400, lineHeight: 1.65}
  public-label: {fontFamily: 'Atkinson Hyperlegible Next, "Segoe UI", sans-serif', fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1}
  public-field: {fontFamily: 'Atkinson Hyperlegible Next, "Segoe UI", sans-serif', fontSize: "1rem", fontWeight: 400, lineHeight: 1.65}
  public-meta: {fontFamily: 'Atkinson Hyperlegible Next, "Segoe UI", sans-serif', fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.65}
rounded: {control: "4px", dialog: "12px"}
spacing: {fine: "4px", small: "8px", compact: "12px", normal: "16px", group: "24px", section: "32px", desktop: "36px", public-gutter: "clamp(1.25rem, 4vw, 4rem)", public-section: "3.5rem", public-columns: "4rem"}
components:
  button-primary: {backgroundColor: "{colors.action}", textColor: "{colors.field}", typography: "{typography.label}", rounded: "{rounded.control}", padding: "10px 18px"}
  button-secondary: {backgroundColor: "{colors.field}", textColor: "{colors.ink}", typography: "{typography.label}", rounded: "{rounded.control}", padding: "10px 18px"}
  input: {backgroundColor: "{colors.field}", textColor: "{colors.ink}", rounded: "{rounded.control}", padding: "7px 10px"}
  nav-link: {backgroundColor: "{colors.sidebar}", textColor: "#f0f5f8", rounded: "{rounded.control}", padding: "10px 12px"}
  progress: {backgroundColor: "{colors.divider}", rounded: "0", height: "6px"}
  display-popover: {backgroundColor: "{colors.field}", textColor: "{colors.ink}", rounded: "{rounded.dialog}", padding: "12px 16px"}
  public-button-primary: {backgroundColor: "{colors.action}", textColor: "{colors.field}", typography: "{typography.public-label}", rounded: "{rounded.control}", padding: "10px 20px"}
  public-button-secondary: {backgroundColor: "{colors.field}", textColor: "{colors.ink}", typography: "{typography.public-label}", rounded: "{rounded.control}", padding: "10px 20px"}
  public-input: {backgroundColor: "{colors.field}", textColor: "{colors.ink}", typography: "{typography.public-field}", rounded: "{rounded.control}", padding: "7px 10px"}
  public-navigation: {backgroundColor: "{colors.field}", textColor: "{colors.ink}", padding: "12px clamp(1.25rem, 4vw, 4rem)"}
  public-sample-record: {backgroundColor: "{colors.field-quiet}", textColor: "{colors.ink}", typography: "{typography.public-meta}", rounded: "0", padding: "1.75rem 2rem"}
---

# Design System: VolunteerHub

## Overview

**Creative North Star: "Open agenda"**

The website builds on the owner’s Open agenda layout. Forest-green wayfinding, a white reading field, readable Atkinson Hyperlegible Next and ordinary web controls establish a simple, ordered service website for both signed-in roles. The approved public landing, sign-in, signup and reset variant uses Bitter's sturdy serif voice within the same navy, white and slate system.

Schools and nonprofits receive equal care. Clear dates, explicit actions and distinct service states support people finding opportunities and coordinators maintaining accurate records. Organization details remain configurable; sample content does not establish customers or endorsements.

Source authority is `volunteerhub-web/vh-web/css/open-agenda.css` and `js/website.js`, composed with `css/styles.css`, `js/app.js` and `index.html`. The selected code-led reference is `.impeccable/mocks/decision/open-agenda.html`; the website direction contract is `.impeccable/surfaces/volunteerhub-web-vh-web-js-website-js.md`. Frontmatter records reused light-mode tokens; source overrides govern dark and high-contrast modes. Sidecar ramps are panel previews, not shipped scales.

The public variant is grounded in `css/landing.css`, `js/views/landing.js` and `js/views/auth.js` under the same web root, with its scoped direction recorded in `.impeccable/surfaces/volunteerhub-web-vh-web-js-views-landing-js.md`. It merges the community-led composition with the owner's requested restraint, short purposeful copy and one large photograph; it does not replace the signed-in system.

The current branch gives the public entry two immediate paths. Returning users can sign in, and first-time visitors can open either role with sample data. The two workspaces keep the previously reviewed navigation. Daily alerts and their preview share the same term calculations. [Current evaluation](docs/FBLA-REVIEW.md)

**Key Characteristics:**

- Forest-green navigation and flat, generously spaced reading areas.
- Bitter for public headings, Atkinson Hyperlegible Next for reading and controls, tabular dates and amounts, explicit task labels.
- Real navigation links, browser history, natural page scrolling and visible mobile destinations.
- Numeric and verbal status alongside color, with retained display preferences and keyboard access.

## Colors

### Primary

Forest green identifies primary controls and anchors the navigation. The pale green selected destination retains its text label. The public hero pairs a forest background with a warm gold action and the garden image. Sky-blue dates identify scheduled work, violet groups verified hours, and clay introduces alerts. Every pace state includes a text label.

### Neutral

White field carries content; quiet field supports table headers and secondary hover states. Ink carries primary reading, muted supports practical detail, divider separates records, and control line gives fields a stronger boundary. Navigation uses its own light text and subdued account detail from the source.

### Named Rules

**The Semantic Progress Rule.** Overall service goals use a continuous color scale from red through yellow to green, paired with numeric progress. Club progress uses a single accent and shows approved hours against the term requirement. Hours waiting for approval appear in their own section.

Dark mode uses deep green surfaces, pale mint actions and lighter semantic foregrounds. The sidebar stays forest green. High contrast promotes quiet text and borders to ink and thickens supported control borders. Preserve these source variants rather than deriving them from the light preview ramps.

## Typography

Atkinson Hyperlegible Next is self-hosted with Latin and extended Latin subsets in `fonts/`, weights (400–700) and a Segoe UI fallback. It carries signed-in headings and body text, public body text, and controls. Its distinct letter and number shapes help in addresses, times, join codes and hour records. Bitter is self-hosted at `fonts/bitter-latin.woff2` with Georgia fallback and is reserved for public headings and the public wordmark.

The runtime preference starts at (16px), preserves saved preferences, and adjusts the root between (13px) and (21px). Body copy follows the root; the stylesheet's pre-runtime fallback is (15px).

- **Headline:** page title; reduces to (1.75rem) at the narrow breakpoint.
- **Title / event:** Home section heading and readable event title; the section heading reduces to (1.25rem) on narrow phones.
- **Body / label / meta:** normal reading, standard buttons and supporting text. Existing forms and tables retain their denser subordinate sizes.
- Dates use tabular numerals; Home date values use the headline size with line height (1.25). Verified hours use (1.625rem), weight (600), line height (1.3).
- **Public hierarchy:** scoped display, headline and title tokens serve account/page headings, section headings and process/demo headings. Public reading has a generous line height and maximum measure (68ch); hero introduction text uses (1.0625rem), then (1rem) at widths up to (900px). The masthead wordmark uses (1.5rem), weight (650), line height (1.3) and tracking (-0.035em). At widths up to (700px), the hero heading uses (2.375rem); account demo section headings use (1.25rem), while role headings retain the public title token.

**The Readable Preference Rule.** Use rem-based hierarchy and retain text size, Auto/Light/Dark and high-contrast controls across the website.

**The Public Type Scope Rule.** Use Bitter for public display type. Use Atkinson Hyperlegible Next for the text people read and enter across the site.

## Layout

Desktop uses a navigation column (256px) and a flexible reading column. The rail becomes (224px) at widths up to (1200px). Above (900px), the sidebar is sticky and scrolls independently as needed. The reading column is centered at up to (1280px), with side gutters that grow from (32px) to (56px) before centering. Vertical padding and section gaps grow modestly with screen height. The content determines where the reading surface ends, and footer actions follow directly on the quiet surface.

At widths up to (900px), signed-in navigation becomes a header with wrapped text links and main padding becomes (24px 24px 32px). At (620px), horizontal padding is (20px) and Home becomes one column. Tables retain local overflow.

Home shows equal-weight dated shifts beside a quieter hours column (224px or 192px at the intermediate size), then recommendations across the full width. Groups use whitespace and hairline dividers. At desktop widths of (1120px) and up, shift lists align date and time in a dedicated column beside place and description. Desktop Inbox separates sender from the two-line message preview. My hours shows up to five recent records before the older records disclosure. Print hides navigation and footer and restores a single reading column.

Public pages use fluid gutters and a masthead with prominent sign-in. On wide screens the introduction and garden image share a forest-green field in two columns. On phones the primary action appears before the photograph. Two labeled role choices lead directly into their sample workspaces.

Sign-in, signup and live password reset share the public masthead, footer and a centered account column. Signup and reset use a maximum width of (31rem). Sign-in uses (40rem) to give the volunteer and coordinator demo panels equal columns below the form. The demo panels wrap to one column if the available width is too small for the selected text size.

## Elevation & Depth

**The Flat Reading Surface Rule.** Use whitespace, tone and divider lines for page structure. Shifts, recommendations and service summaries do not become raised cards.

Inherited dialogs and toasts use the existing popup shadow, with a darker shadow in dark mode. Fields add a soft focus ring; visible keyboard focus uses an outline (2px) offset (4px), with a pale outline on the sidebar. Button state transitions take (0.16s); reduced motion removes transitions and animations.

The hero uses a flat forest background. Soft clay and violet distinguish the two role choices. The sample record uses a quiet tinted surface with accessible labels and amounts.

## Shapes

Regular controls and the desktop public introduction use the small frontmatter radius; progress on Home, the sample record and the narrow public introduction are square-ended. Dialogs use the larger radius with padding (32px), reduced to (24px) on narrow phones. Waiver surfaces retain their own (8px) corners. Line icons remain SVG; status dots are accompanied by text.

## Components

**Buttons.** Primary actions use forest green and white; hover deepens background and border. Secondary actions use a white field, dark ink and a stronger divider, with a quiet-field hover. Standard controls have minimum height (42px); small controls use (34px), while Home row actions use (40px) and padding (8px 15px). Disabled controls reduce opacity to (0.45).

**Public actions and fields.** Scoped buttons use the public label tokens and minimum height (46px). The masthead sign-in reduces to (44px) at (700px). Account text and select fields use the public field tokens and minimum height (44px), retaining visible labels, error text and focus treatment. Live forms disable submission while connecting. Password reset appears in live mode and returns to sign-in after requesting the link.

**Inputs.** Labels sit above fields with a small gap (5px). Fields use a stronger control boundary, minimum height (36px) and font size (0.92rem). Focus adds the action-colored boundary and accent-soft ring; invalid fields use the red boundary, ring and error text. Textareas can resize vertically.

**Navigation.** Destinations are anchors with usable URL fragments and `aria-current="page"`. Desktop links have minimum height (48px); header links use (44px), wrap on phones, and retain every destination. Current links use pale fill, dark ink and weight (600). Subnavigation uses an accent underline. Role guards still decide which pages exist for each user; Back, Forward, refresh and new-tab navigation resolve through the same routes.

**Progress and records.** Home uses a slim meter with numeric hours, goal and percentage. Other progress surfaces retain their existing compact boundaries and status text. Signed up, waitlisted, attended, pending and approved remain separate states.

**Display settings.** Help and Display settings are grouped immediately after the signed-in navigation. The public footer uses the same settings popover. The popover anchors to its trigger and fits within the current viewport. It groups text size, theme and high contrast, and dismisses on an outside click, Escape or Close. Escape and Close return focus to the trigger.

**Shifts and service records.** Opportunity, schedule and coordinator event rows present title, date and time, location and description in the same order. Row actions stack below text on narrow phones. My schedule gives upcoming shifts the first position and keeps the full history under Past shifts. My hours uses a compact goal summary and a chronological ledger with an explicit CSV action. Coordinator Overview gives priority to work needing attention and the next events. Reports put dates, grouping and CSV up front, with additional filters and exports in disclosures.

**Event entry.** Put the name, date and time, location, description, capacity and audience in the visible form. Cause, ZIP, skills, preparation and repeat options belong under Optional event details. Pair each validation message with its field.

**Inbox and announcements.** Message rows group the subject, sender and preview, with the delivery time and disclosure control on the right. Unread items pair a dot with a spoken label. Coordinators open an announcement dialog with audience, headline and message fields. The post and cancel actions sit together below the message.

**Event confirmations.** Sign-ups, event publication and roster actions use a review dialog with the event name, date, time, location and effect. Cancellations, leaving a waitlist and event deletion use a narrower version. Focus starts on Go back. Escape returns to the previous control, and a save in progress blocks repeat submissions.

**Public navigation and content.** The masthead links to process and school/nonprofit sections and keeps sign-in primary. The hero's adjacent demo link leads to both existing volunteer and coordinator demo handlers. Ordinary fragment links, browser history, a skip link, route-heading focus and focusable section targets support keyboard navigation. The lower page pairs an ordered three-step process with a labeled sample record, gives schools and nonprofits equal standing, offers both fictional role demos and ends with footer access to the demo and display settings. Dark and high-contrast colors and root text-size preferences remain shared. The sample record gains an ink outline in high contrast.

**Public photograph.** The generated garden scene is identified as illustrative. Keep the volunteers visible in the desktop and phone crops. If the image fails, the heading and both entry actions remain available. The asset provenance accompanies the image.

## Do's and Don'ts

### Do:

- **Do** keep website links, browser navigation, ordinary scrolling and all mobile destinations usable.
- **Do** preserve saved display preferences, reduced motion, visible keyboard focus and text alongside semantic color.
- **Do** use explicit actions and maintain accurate role, permission and service-state distinctions.

### Don't:

- **Don't** add OS window chrome, app-like bottom navigation, neon accents or unnecessary account dropdowns.
- **Don't** add descriptive tab clutter or vague actions; the owner rejects SignUpGenius-style clutter.
- **Don't** turn sample organizations, demo records or isolated checks into commercial, production-readiness or accessibility-certification claims.
