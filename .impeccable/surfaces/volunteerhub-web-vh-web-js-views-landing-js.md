---
version: 1
slug: "volunteerhub-web-vh-web-js-views-landing-js"
primary_target: "volunteerhub-web/vh-web/js/views/landing.js"
related_targets: ["volunteerhub-web/vh-web/css/landing.css","volunteerhub-web/vh-web/js/views/auth.js"]
---

# Public landing page

Mode: Persuade. First-time visitors and judges must understand how volunteering connects to attendance and school-club hours. Sign-in has primary emphasis; demo access is visible immediately. Preserve existing account and role behavior.

## Direction contract

THESIS: One human service scene introduces a practical volunteering website. Remove the proposal's supporting photographs and keep only useful explanation and evidence.

OWN-WORLD: Open agenda navy, white and slate actions; small control corners; Bitter's sturdy serif voice for this public surface. Existing operational typography stays scoped to the signed-in site.

STORY: Understand the purpose, sign in or explore sample data, then see how a shift becomes an attended record and club progress. Concrete actions replace marketing filler.

FIRST VIEWPORT: A simple horizontal masthead sits above one broad garden-service photograph, with a white introduction inset at left. The two-line heading, short explanation, primary Sign in and secondary demo action remain visible. The next section begins beneath the photo. Lower sections use text and one sample record, with no further photographs.

FORM: Community-led composition, grounded candidate 2, dealt option 1; seed:935a6cb90cfffdfc. Approved reference: `.impeccable/mocks/decision/landing-community.webp`. The owner's choice explicitly changes its typography, removes all supporting photographs and calls for the third proposal's restraint. These changes take precedence over literal comp matching.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Owner authorization

“try and limit how many real photos of volunteers we need, but other than that, the second is pretty good”; “the third design ... feels a bit more visually appealing”; “be purposeful with every change, and keep a harmony to the landing page”; “stray away from the AI slop sans type font.” The combined choice authorizes a single-photo build and scoped public typography change; it does not replace the signed-in visual system. No commercial claims, invented partners or testimonials.

## Production and behavior

Produce one separate opaque garden photograph from the reference, with no baked text or controls. All navigation, copy, actions, records and account forms are semantic HTML/CSS. Reuse the existing Firebase/demo handlers. Use ordinary URLs for public routes, browser history, section anchors, skip navigation, visible focus and normal page scrolling. Check 320/390/768/1024/1440px, dark/high contrast, enlarged text, missing-image recovery and keyboard flows. Use no paid service or backend migration. Existing DESIGN.md remains authority for the global system; record only this approved public variant at finish.

## Photo and verification status

The owner confirmed after seeing the produced image: “the image for now is okay, but its js a filler. we are planing on adding our one image.” Treat it as the single temporary placeholder and keep replacement guidance in docs/PUBLIC_LANDING.md.

Direct Chromium checks pass all 43 isolated checks using sample data and a mocked Firebase configuration. The fresh reviewer found no material UI defect across 17 valid captures. Impeccable font matching reports no resolvable browser/catalog; the automated state remains SPEC open with subsequent phases pending. No asset-review receipt or completed automated workflow is claimed. The numerical comp diff includes the owner-authorized serif, copy and supporting-photo removals. Global design documentation was merged only for this scoped public variant. The follow-up narrow verdict resolved the two persistence findings; that ship covers the scored fixes only and does not close the automated workflow.
