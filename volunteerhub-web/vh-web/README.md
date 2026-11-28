# VolunteerHub

[Open VolunteerHub](https://anancodes.github.io/FBLA-Project/volunteerhub-web/vh-web/)

A website that helps nonprofits recruit, organize, and manage volunteers, built for the FBLA Coding & Programming 2026–27 topic, *Serving the Community: Nonprofit Volunteer Management*.

VolunteerHub includes club hour alerts, an email preview, a monthly service breakdown and an optional outside-service filter in Reports. [Competition evaluation](../../docs/FBLA-REVIEW.md) · [Connecting Gmail and enabling clubs](../../docs/GMAIL-ALERTS.md)

## Accounts

Choose **Create an account**, enter an email and password, and select **Volunteer** or **Coordinator**. Returning members sign in with the same email and password. Firebase Authentication manages credentials. Each Firestore `users/{uid}` profile stores the selected role and name.

The first workspace shows role-specific examples. Use **Send verification email**, open the email link, then select **Check verification** to access shared records. Coordinators need administrator approval before managing volunteers. Illustrative hours stay out of personal totals and email alerts.

Volunteers don't need an account. A verified coordinator shares a guest link or QR code (People & clubs → Invite, an event's **Share** button, or a club's **Share join link**). Guests enter their name, accept the waiver, and sign up for shifts. Their guest pass is saved in that browser, and they can add an email from Profile to keep their hours on other devices.

## How to run

From the repository root, run `python -m http.server 4173 --directory volunteerhub-web/vh-web` and open `http://localhost:4173`. The published app requires its configured Firebase service. The separately built offline workbook and its fictional credentials are documented in the [repository guide](../../README.md). [Firebase setup](SETUP-FIREBASE.md)

## Features

**Volunteers:** search eligible open shifts by event, place or cause. A saved city enables approximate nearby filtering. Open a shift for practical details or to report a concern. My schedule has list and calendar views, a full history and waitlist status. My hours shows verified service with a downloadable CSV. Inbox carries shift changes, announcements and club approval updates.

**Coordinators:** program overview, create/edit/delete events (list or calendar), waitlists that fill automatically when spots open, check-in (present, no-show, walk-ins) with roster download and print, volunteer directory with reliability and certificates, reports filtered by dates, cause, and volunteer and grouped by volunteer, event, month, or cause, with CSV download, copy, and print, announcements to everyone or to one event's volunteers, and a review list for concerns volunteers report.

**Trust and safety:** Opportunities shows eligible shifts from verified organizers or clubs. Organizer contact, access details and the way to report a concern are available from the shift.

**Settings:** coordinators enter their organization's name, home ZIP code, and description, and they appear across the whole site, so any nonprofit can use it as its own.

**School clubs:** each club (for example HOSA or NHS) has a join code, an adviser, and student officers. Members earn hours at club events, which count automatically at check-in, and by logging outside service with a supervisor's contact for an officer to approve. Each club sets an hour requirement for the term. Members see approved progress and hours waiting for approval. Officers can review claims and export member records. Club events are visible only to members. Officers can't approve their own hours.

**Guest links and QR codes:** coordinators share a guest link and QR code from People & clubs → Invite, a single event from its Share button, or a club from Share join link. Volunteers who open the link enter their name, accept the waiver and start signing up. No account is needed. Event links open that event; club links also make the guest a member. A new link turns the old one off.

**Site admins:** verify new organizers on the Organizers screen, which includes a checklist for confirming they're real.

**More for coordinators:** copy an event to the next week or repeat it weekly, notify everyone signed up when an event's date, time, or place changes or it's cancelled, copy a roster's email addresses, and see volunteers' emergency contacts.

**Everyone:** Light, Dark, or Auto theme, guided tour on first login (replay from Help), help page and FAQ, adjustable text size, high-contrast mode, dark mode, full keyboard support.

## Project structure

| File | What it does |
|---|---|
| `index.html` | Page skeleton; loads the stylesheet and scripts in order |
| `css/styles.css` | Base components and layout styles |
| `css/open-agenda.css` | Shared Open agenda design, responsive layouts and accessible themes |
| `css/landing.css` | Scoped public landing and account design |
| `js/website.js` | Website navigation, page URLs and volunteer Home |
| `js/utils.js` | General helpers: dates, times, HTML escaping, CSV |
| `js/zipdata.js` | US ZIP codes with locations, so distance search works offline |
| `js/geo.js` | ZIP lookup, ZIP validation, and distance math |
| `js/data.js` | Constants and the sample (seed) data |
| `js/firebase-config.js` | Public project identifiers for Firebase Authentication and Firestore |
| `js/db.js` | The one place data changes; routes saves to the browser or to Firebase |
| `js/cloud.js` | Live mode: Firebase accounts, the database, live updates, and offline support |
| `js/store.js` | App data, saving/loading with localStorage, waitlist logic, query helpers |
| `js/validation.js` | Input validation and error display |
| `js/components.js` | Reusable pieces: calendar, progress, dialogs, messages, CSV export and printing |
| `js/views/auth.js` | Login and create-account screens |
| `js/views/landing.js` | Public landing, public links and demo entry points |
| `js/views/volunteer.js` | Volunteer screens |
| `js/views/coordinator.js` | Coordinator screens and report calculations |
| `js/views/help.js` | Help screen |
| `js/views/settings.js` | Organization settings (name, home ZIP, description) |
| `js/clubs.js` | Club logic: join codes, hour requirements and progress, logging and approving hours |
| `js/views/clubs.js` | My clubs (members) and Manage clubs (advisers and officers) |
| `js/guest.js` | Guest links and QR codes: the welcome screen, invites, sharing, and adding an email later |
| `js/vendor/qrcode.js` | QR code generator by Kazuhiko Arase (MIT License), served from this site |
| `js/views/organizers.js` | Site admin screen for verifying organizers |
| `js/views/news.js` | Announcements screen (post for coordinators, read for volunteers) |
| `js/tour.js` | First-login guided tour |
| `js/actions.js` | What each button does |
| `js/app.js` | Starts the app, draws screens, routes clicks and form submits |

## Other files

| File | What it does |
|---|---|
| `firestore.rules` | Database security rules (paste into Firebase) |
| `SETUP-FIREBASE.md` | Step-by-step guide to turning on live mode |

## Credits

- Firebase (Google): accounts and database, loaded from Google's servers in live mode
- Fonts: locally served Atkinson Hyperlegible Next and Bitter (SIL Open Font License; bundled in `fonts/`)
- Landing image: generated temporary placeholder, to be replaced with the team's photo
- Icons: simple line icons drawn for this project (in `js/components.js`)
- QR codes: `qrcode-generator` 1.4.4 by Kazuhiko Arase (MIT License), bundled in `js/vendor/`, license in `licenses/`
- ZIP code locations: from the open-source `zipcodes` package by Sean Pianka (MIT License), github.com/seanpianka/zipcodes
- The original project credits Claude. The current redesign and alert implementation used Codex with Impeccable and UI UX Designer.

## Interface cleanup

See [the change guide](../../docs/UI_CLEANUP.md) and [test instructions](../../tests/README.md).

The selected visual redesign is documented in [Open agenda](../../docs/OPEN_AGENDA.md), with desktop and mobile screenshots.

See [the public landing page](../../docs/PUBLIC_LANDING.md) for the selected one-photo composition, account navigation and image replacement instructions.
