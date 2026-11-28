# Interface cleanup

This pass follows the owner's requested changes using Impeccable's [distill](../.agents/skills/impeccable/reference/distill.md), [craft floor](../.agents/skills/impeccable/reference/craft-floor.md), and [polish](../.agents/skills/impeccable/reference/polish.md) workflows, plus [frontend-design](../.agents/skills/frontend-design/SKILL.md) and [frontend-ui-engineering](../.agents/skills/frontend-ui-engineering/SKILL.md).

## Direction

Preserve the established operational interface: IBM Plex Sans, teal actions, neutral surfaces, simple line icons, and the existing light/dark/high-contrast modes. The core tokens remain surface `#ffffff`, canvas `#f6f7f8`, ink `#111418`, muted text `#59626d`, divider `#e3e6ea`, and action teal `#0f766e`.

The existing Home, My hours, Inbox, and club-management screens were inspected in the browser before editing. They repeated attention items, framed unrelated content at the same visual weight, exposed long histories by default, and separated related club tasks into different menu sections. This pass replaces those frames with page-aligned sections and dividers, while using native disclosures for detail on demand. It preserves the vanilla HTML/CSS/JavaScript stack.

## What changed

| Area | Result |
| --- | --- |
| Volunteer Home | Remove Events attended, reminders, announcements, and the attention panel. Keep a compact hours/commitments summary, next shifts, and recommendations. |
| Opportunities | Replace volunteer ZIP input with optional city/town selection. Users with no saved location search by keyword or cause before results appear; city and distance controls remain unavailable until a location is supplied. |
| Account creation and Profile | City/town is optional, can be added or removed later, and uses local suggestions. Previously saved ZIPs retain their city without resetting existing records. |
| My schedule | Preview the three most recent attended events. Keep all past statuses and records in an initially closed history disclosure. |
| My hours | Preview the last three attended events, as confirmed by the owner. Keep monthly/cause charts and the complete event/outside-service record under one disclosure. CSV export includes all records and is accessed from the three-dot menu. Certificate, copy, and print actions are removed from this volunteer screen. |
| Student club tools | Remove the separate Club admin navigation and volunteer check-in route. Officers/advisers expand Members & approvals inside the applicable My clubs entry. Ordinary members never see those controls. |
| Coordinator People & clubs | Put Volunteers, Clubs, and admin-only Organizers under one navigation section. Event attendance remains under Events → Check-in. |
| Inbox | Combine personal updates and announcements into one chronological message list with sender, subject, preview, timestamp, and an expandable body. Coordinator composition is initially collapsed; posting and delete confirmation remain available. |
| Settings | Hide the navigation entry for unverified coordinators. Keep the actual editable organization fields for verified coordinators/admins, and remove the redundant explanation panel. |
| Accessibility and interaction | Name mobile account/calendar controls, preserve native disclosure and focus state across redraws, trap focus in dialogs, restore focus after saving, and update the tour/help to match the new routes. |

Meaningful progress meters retain the owner's continuous red → yellow → green semantics and numeric labels. Comparison charts retain one accent color because they compare quantities rather than completion of a shared goal.

## Location behavior

The owner selected **city or town**, not a street address. The implementation uses the existing US location dataset to aggregate approximate city centers; it makes no external geocoding call and does not request device geolocation. Suggestions include the state to distinguish places with the same name. Unsupported or ambiguous input asks the user to select a listed city/state, and leaving it blank remains valid.

Location-based distances are explicitly approximate. Event locations still use the existing venue/event geographic data. Organization/event ZIP fields used by that existing data model remain in coordinator tools; the volunteer's discovery and account flows use city/town input.

Saving a city clears a volunteer's legacy ZIP field and stores city-level data. Clearing the city clears both, so location filtering cannot silently return through a legacy ZIP. Existing local data are preserved; the data version is not bumped.

## Deliberate access points

- Club membership, approvals, join codes, officer management, club events, and club CSV exports remain available to the appropriate roles. Their entry points are consolidated.
- Pending outside-service hours stay separate from approved totals. An officer cannot approve their own log; the existing site-admin exception is preserved.
- The coordinator directory retains its certificate capability. Only the volunteer My hours actions were reduced.
- Removing reminders and announcements from Home does not delete messages. Personal schedule changes and announcements remain in Inbox.
- Wide data tables scroll within their section instead of expanding the whole page.

## Verification

The tests cover the requested defaults and the underlying workflows: optional location at signup; invalid/ambiguous city input; saved-location removal; legacy location compatibility; explicit search without location; nearby filtering; three-event previews; complete CSV export; member/officer/adviser/admin access; club join → outside-service log → coordinator approval → updated student hours; coordinator attendance; club event creation; Inbox composition/deletion; disclosure persistence; and keyboard focus.

Responsive checks include all role screens with disclosures expanded at 320, 390, 768, 1024, and 1440px, plus 21px text and high contrast. Accessibility scans cover login/signup and both roles in light and dark themes at desktop and phone sizes. Calendar controls retain named dates/times/status and at least 24px phone targets.

See [test instructions](../tests/README.md). Browser tests use isolated sample data and mock the live-signup handoff; they do not write to production Firebase. This pass does not deploy or alter Firestore rules, authentication SDKs, or cloud synchronization code.
