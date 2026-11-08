# VolunteerHub frontend review

Reviewed November 8, 2026. This branch includes `main` at `ddf7507`, which adds the requested frontend skills; the application review baseline is `7f85ec7`.

## Visual direction and implementation

Keep the existing community-service identity: forest-green navigation, warm neutral surfaces, Bricolage Grotesque headings, Public Sans body text, rounded cards, and compact information tables. The application uses plain HTML, CSS variables, and JavaScript view functions; this branch follows that structure.

Applied [frontend-design](../.agents/skills/frontend-design/SKILL.md) for visual direction, then [frontend-ui-engineering](../.agents/skills/frontend-ui-engineering/SKILL.md) for implementation and verification. The latter references an accessibility checklist that was not included in the added files; its own checklist and axe scans were used for verification.

The core palette remains forest rail `#13302a`, soft canvas `#f2f5f3`, white surface `#ffffff`, action green `#1d6b58`, text `#15221d`, and border `#d2dcd7`. The existing Home, My hours, and Find screens served as product references for hierarchy, density, controls, and responsive behavior. The primary actions remain Find opportunities for volunteers and New event for coordinators.

Design contract: keep content left aligned, preserve the current type hierarchy and card spacing, make staffing counts explicit, and show the tutorial in the normal page flow. A floating guide covered the very controls it described, especially on phones, so the guide now precedes the page content. Its body text is limited to 72ch. On phones the guide and cards stack, the navigation scrolls horizontally, and wide tables scroll within their own containers. Decorative gradients, new hero sections, and framework changes would distract from this focused review.

Progress communicates completion with a continuous red → yellow → green spectrum. The low endpoint is muted red, halfway is yellow, and full progress is saturated green. Theme-specific colors and perceptual interpolation keep the transitions smooth. The filled portions contrast with their tracks by at least 3:1 in the tested light and dark themes. Hour goals use progressbar semantics; staffing uses meter semantics, following the [WAI meter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/meter/) and [MDN progressbar guidance](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role). Counts and labels communicate the value independently of color.

Comparison charts use the existing accent color consistently. They compare quantities, such as hours by cause, without implying that a smaller category failed a goal.

## Changes in this branch

- Share the color scale across staffing meters and hour-goal bars. Goal displays cap the bar at 100% while preserving actual hours earned, and do not declare completion before reaching the goal.
- Add the same goal meter to My hours and Home. Label event bars as spots **filled**, alongside the number still open.
- Remove chart highlights based only on the first or last position. Reserve enough space for horizontal bars on narrow screens, and allow zero-value columns to have zero height.
- Show the tutorial above the screen it describes so it does not cover controls or data. Keep its step synchronized with manual navigation, focus and describe each new step for keyboard users, and return to the original screen and replay control when it ends. Keep unfinished first-login tours available after refresh. Visiting Announcements through the tutorial does not mark messages read.
- Use green for fully staffed coordinator calendar events. Give calendar buttons explicit names containing the date, time, and status, and raise their phone touch targets from 8px to at least 24px tall.
- Correct copy that promised date filtering or availability-based recommendations. Current recommendations match skills; availability is displayed to coordinators.
- Name pop-up dialogs, keep keyboard focus inside them, make the background inert, and restore focus to the opener even after the app redraws. Label the walk-in selector, align text-size accessible names with their visible labels, and correct skipped heading levels and the login landmark.

## Remaining findings

These were reproduced in an isolated browser using sample data. They are documented for follow-up; the progress/tutorial changes do not alter these behaviors.

### High: deleting a past event removes earned service hours

[Event deletion](../volunteerhub-web/vh-web/js/actions.js#L105) removes every registration for the event. Certificates, totals, and reports derive their hours from those registrations. In the demo, deleting one attended Saturday Food Sort reduced Maya's hours from **47.5 to 44.5**.

Archive events with attendance records, or preserve immutable service records when removing the listing. Make destructive behavior explicit in the confirmation.

### High: the concern form's privacy promise is incorrect

The [report form](../volunteerhub-web/vh-web/js/views/volunteer.js#L66) says the reporter is not shown to the organizer by name. The [coordinator Overview](../volunteerhub-web/vh-web/js/views/coordinator.js#L30) renders every open concern with the reporter's name for every coordinator. Signing in as Casey, the organizer of the reported listing, exposes Maya's name.

Limit report details to appropriate reviewers and exclude the listing's organizer from reporter identity. Until that exists, change the privacy statement to match what the demo actually exposes.

### Medium: event rescheduling can create conflicts without notifying volunteers

[Saving an edited event](../volunteerhub-web/vh-web/js/actions.js#L36) changes its date and times without rechecking its registered volunteers or creating schedule-change notices. Moving Maya's first upcoming shift onto her second shift's time saved successfully, created an overlap, and generated **zero notices**.

Check conflicts before saving and identify the affected volunteers. Require a deliberate resolution and send a schedule-change update to registered and waitlisted volunteers.

### Medium: ended events remain available for same-day sign-up

[Sign-up](../volunteerhub-web/vh-web/js/actions.js#L10) and [waitlisting](../volunteerhub-web/vh-web/js/actions.js#L24) compare the calendar date only. A test event ending at 12:01 AM today still accepted a sign-up later that day and appeared as upcoming.

Use event timestamps consistently for opportunity filtering, sign-up, reminders, cancellation eligibility, and waitlist promotion. Decide whether new sign-ups close at the start time or at another explicit cutoff.

### Medium: reports combine different volunteers who share a name

[Report grouping](../volunteerhub-web/vh-web/js/views/coordinator.js#L148) uses the volunteer's display name as the grouping key. Giving two accounts the same name produced one row with their combined **59.5 hours**.

Group by user ID and display the name separately. Include an email or other identifier when names collide. Apply the same principle to event grouping, which currently uses title plus a date label that omits the year.

## Validation

- **14 automated checks passed:** seven dependency-free progress/data checks and seven browser checks covering both tutorials, color continuity/contrast, screen layouts, dialog focus, and axe accessibility scans.
- Tested 1440px desktop, 1024px and 768px tablet layouts, 390px phone in dark mode, and 320px width with 21px text and high contrast. All 14 role screens fit without document-level horizontal overflow; tables retain their own horizontal scrolling.
- Checked Tab/Enter through tutorial controls, Back to the first step, manual navigation during a tour, refresh, completion, replay from Help/Profile, Escape, dialog focus boundaries, and return focus after sign-up and event editing. Calendar controls retain accessible names when their visible text is hidden on phones.
- Axe reported no violations for login, all role screens, both tutorials, event pop-ups, a service certificate, and the new-event form in light and dark themes.
- Reviewed desktop and phone screenshots. JavaScript syntax checks and `git diff --check` passed.
- Browser validation used Chromium. Screen-reader announcements and other browser engines still need manual verification; keyboard checks are not a full accessibility audit.

See [test instructions](../tests/README.md) to rerun the checks.
