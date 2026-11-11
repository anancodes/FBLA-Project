# VolunteerHub

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Schools and nonprofits are equally important audiences. Neither should be treated as an optional extension of the other.

- Volunteers and students find appropriate service opportunities, manage commitments, and keep an accurate record of approved hours.
- Nonprofit coordinators recruit volunteers, manage event capacity and attendance, communicate changes, and report service activity.
- School-club members track service against a club's term requirements, including service completed outside club events.
- Club officers and advisers manage membership, review outside service, and monitor members' progress.
- Site administrators verify organizer accounts and manage administrative access.

These are related responsibilities, not necessarily separate people: a student can be a volunteer and a club officer.

## Product Purpose

Help people take part in community service and help schools and nonprofits coordinate and verify that service in one place.

The owner confirmed that the intended release is for real use by schools and nonprofits now. The FBLA Coding & Programming 2026–27 event remains part of the project's context, but the product must support actual users and records rather than optimize solely for a competition demonstration.

Success means people can find and keep service commitments, coordinators can record attendance and hours, and clubs can track approved service against their requirements without confusing pending claims with verified hours.

## Positioning

VolunteerHub connects nonprofit opportunity discovery and event attendance with school-club service requirements. Club event hours and reviewed outside-service logs feed the member's progress within the club's configured term. This shared workflow is the product's mechanism; no comparative market or adoption claims have been established.

## Operating Context

- Volunteers browse event lists or calendars, inspect practical details and organizer status, sign up or join a waitlist, and manage their schedule.
- Coordinators create and edit events, manage capacity, check people in, communicate through announcements, and export or print records and reports.
- Students join clubs using join codes. Club managers set term requirements, organize club events, review outside-service claims, and manage officers and members.
- Live accounts and shared records use Firebase Authentication and Firestore when configured. Demo mode uses fictional sample records saved in the browser and remains available for demonstrations and local testing.
- Organization settings supply the deployment's name, home ZIP code, description, and volunteer waiver. The sample organization is not a confirmed customer or deployment.

## Capabilities and Constraints

### Existing implementation

- Preserve the existing vanilla HTML, CSS, and JavaScript application. Its entry point is `volunteerhub-web/vh-web/index.html`; classic scripts load in a deliberate order. The app has no package build step.
- `js/db.js` centralizes data changes. `js/cloud.js` handles the optional Firebase connection; `firestore.rules` contains server-side access rules. UI refinements must preserve backend behavior and permission boundaries.
- Opportunity browsing includes cause, location, skill, and organizer filters, event details, calendar views, waitlists, and schedule-conflict checks.
- Service records include attended event hours and approved outside-service logs. Club progress uses the club's hour requirement and term dates; pending logs are displayed separately.
- Verified coordinators, site administrators, club advisers, officers, and ordinary members have different responsibilities and access. Preserve those distinctions when changing navigation or flows.
- Records can be exported or printed, including service certificates, rosters, and reports. On-screen totals and exported records should communicate the same underlying service activity.

### Confirmed requirements and open decisions

- Keep both school and nonprofit workflows usable as the product evolves.
- Account creation must allow users to skip providing a location. Location-based discovery is available only after a user provides one; users who skip it can discover opportunities manually through search. The owner requested a specific location instead of ZIP-only input. The location's precise granularity and implementation remain to be decided during that UI work.
- Preserve the current framework and design system during scoped UI changes. A request for initialization is not a redesign.
- The owner's requested progress semantics are a continuous spectrum from red for low progress, through yellow halfway, to vibrant green at completion. Communicate amounts and status in text as well as color.
- Real-world use is the confirmed goal. This initialization records that intent; it does not verify a production Firebase deployment, security posture, or launch readiness.
- Specific initial schools, nonprofit partners, deployment ownership, support arrangements, and operational success targets have not been confirmed. Do not invent them.

## Brand Commitments

- The product is named VolunteerHub.
- The organization's identity is configurable. Use the configured organization's details in the product rather than treating the fictional sample organization as a permanent brand or real partner.
- Use plain, task-oriented language and keep the distinction between signed up, waitlisted, attended, pending approval, and approved clear.

## Evidence on Hand

- The owner's confirmed priorities and release intent are recorded above.
- `README.md` documents the FBLA topic, core volunteer/coordinator workflows, fictional demo data, and GitHub Pages demo URL.
- `volunteerhub-web/vh-web/SETUP-FIREBASE.md` documents the optional live backend setup, organizer verification, organization settings, and school-club setup. It is setup guidance, not proof of a completed deployment.
- `js/clubs.js` and `js/views/clubs.js` implement membership, term requirements, club events, outside-service logging, and review workflows.
- `js/views/settings.js`, `js/views/organizers.js`, and `firestore.rules` describe organization settings and role-dependent behavior.
- The repository contains working screens and sample content. No real partner endorsements, testimonials, adoption statistics, or independently verified compliance claims have been supplied.
- `docs/NEXT_UI_BRIEF.md` captures the owner's queued interface changes. They are a follow-up brief, not evidence that those changes have been implemented.

## Product Principles

1. Serve schools and nonprofits with equal care while keeping each role's immediate job clear.
2. Keep commitments and service records understandable: show what is scheduled, completed, pending, and approved without conflating them.
3. Preserve the connection between event participation, reviewed outside service, and club requirements.
4. Treat permission boundaries, organizer status, and accurate records as part of the user experience.
5. Preserve useful existing behavior when refining the interface; make deliberate, scoped changes that work on phones and with a keyboard.

## Accessibility & Inclusion

Mobile usability and keyboard accessibility are explicit owner requirements. Retain the existing text-size, high-contrast, and theme controls when refining the app. Progress and other status information must remain understandable without color alone. No product-specific screen-reader study or independently verified accessibility certification has been established.
