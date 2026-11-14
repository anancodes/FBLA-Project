---
version: 1
slug: "volunteerhub-web-vh-web-js-website-js"
primary_target: "volunteerhub-web/vh-web/js/website.js"
related_targets: ["volunteerhub-web/vh-web/css/open-agenda.css","volunteerhub-web/vh-web/js/app.js","volunteerhub-web/vh-web/js/actions.js","volunteerhub-web/vh-web/index.html"]
---

# Open agenda website

Mode: Operate. The owner selected **Open agenda — dark blue sidebar; alternate concept** after reviewing the two proposals, then specified: **"this is meant to look like a website. dont lean into making it a native app design"** and requested continuation. The selected direction replaces the provisional Clear workspace system. Preserve all routes, permissions, records, forms and the vanilla stack.

## Direction contract

THESIS: A coherent service website with obvious destinations and readable records. Ordinary web links, natural document scrolling and browser navigation support the task; avoid OS window chrome, app-like bottom tabs and novelty controls.

OWN-WORLD: Public Sans, white reading areas, dark blue navigation #263f50, ink #182c3c, slate-blue actions #496a80, quiet dividers #dce5eb, 4px controls and semantic red–yellow–green completion. Dark and high-contrast settings remain available without neon accents.

STORY: Find a page, understand its records and act through explicit controls. Volunteers move from upcoming shifts to opportunities and hours; coordinators manage events, attendance, people/clubs and reports through the existing sections. Browser Back, refresh and new tabs retain the chosen page and permission boundaries.

FIRST VIEWPORT: Home adopts the selected sketch's dark 256px sidebar, equal-weight dated shifts, quieter service-hours column, and full-width recommendations. Other pages use the same website shell and typography around their existing content. Phones reflow into a header with wrapping navigation, one reading column and locally scrollable tables; every destination remains visible.

FORM: Grounded public-library wayfinding direction, candidate 1, selected by the owner from the prior round; seed:d1036f369104af8f. The approved decision sketch is `.impeccable/mocks/decision/open-agenda.html`, used as a code-led visual reference rather than an image-comp contract. The user's website constraint governs all adaptations.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Boundaries

Keep optional city search, three-event previews and collapsed records, CSV overflow, merged club workflows, Inbox, tutorial and role guards. Do not migrate databases, deploy main, add claims, or add paid dependencies. Source the existing self-hosted Public Sans and keep its license. Compare desktop and mobile renders with the selected sketch, verify standard web behavior, and document the built system after review.
