# VolunteerHub

**Live demo:** https://anancodes.github.io/FBLA-Project/volunteerhub-web/vh-web/

A website that helps nonprofits recruit, organize, and manage volunteers, built for the FBLA Coding & Programming 2026–27 topic, *Serving the Community: Nonprofit Volunteer Management*.

## Two modes

- **Live mode** uses Firebase for real accounts and one shared database, with live updates across devices, offline support, and password reset by email. Turn it on with `SETUP-FIREBASE.md`.
- **Demo mode** uses sample data saved only in your browser and works with no internet. It's always available from the login page's demo buttons.

## Security and privacy

- **Passwords:** in live mode, Firebase Authentication handles passwords and the site never sees them. In demo mode, only a salted SHA-256 hash is stored.
- **Database rules:** `firestore.rules` controls access. Volunteers can change only their own sign-ups. Only coordinators can mark attendance and hours, and only verified coordinators can see volunteers' contact details or post announcements. Only site admins can verify organizers.
- **Accounts:** volunteers accept the organization's waiver when they sign up, and anyone can delete their own account from Profile.

## How to run

Double-click `index.html` to open it in a browser. No install or server is needed.

Demo accounts (password `demo1234`):

- Volunteer: `volunteer@demo.org`
- Coordinator: `coordinator@demo.org`

All volunteers, events, and places are sample data. Set your organization's name in Settings. It is saved in your browser only. Use **Reset demo data** at the bottom of the app to start over.

## Features

**Volunteers:** search eligible open shifts by event, place or cause. A saved city enables approximate nearby filtering. Open a shift for practical details or to report a concern. My schedule has list and calendar views, a full history and waitlist status. My hours shows verified service with a downloadable CSV. Inbox carries shift changes, announcements and club approval updates.

**Coordinators:** program overview, create/edit/delete events (list or calendar), waitlists that fill automatically when spots open, check-in (present, no-show, walk-ins) with roster download and print, volunteer directory with reliability and certificates, reports filtered by dates, cause, and volunteer and grouped by volunteer, event, month, or cause, with CSV download, copy, and print, announcements to everyone or to one event's volunteers, and a review list for concerns volunteers report.

**Trust and safety:** Opportunities shows eligible shifts from verified organizers or clubs. Organizer contact, access details and the way to report a concern are available from the shift.

**Settings:** coordinators enter their organization's name, home ZIP code, and description, and they appear across the whole site, so any nonprofit can use it as its own.

**School clubs:** each club (for example HOSA or NHS) has a join code, an adviser, and student officers. Members earn hours at club events, which count automatically at check-in, and by logging outside service with a supervisor's contact for an officer to approve. Each club sets an hour requirement for the term. Members see approved progress and hours waiting for approval. Officers can review claims and export member records. Club events are visible only to members. Officers can't approve their own hours.

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
| `js/firebase-config.js` | Your Firebase settings (leave empty for demo-only) |
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
- ZIP code locations: from the open-source `zipcodes` package by Sean Pianka (MIT License), github.com/seanpianka/zipcodes
- AI assistance (Claude) was used as a coding tool. The team reviewed and can explain all code.

## Interface cleanup

See [the change guide](../../docs/UI_CLEANUP.md) and [test instructions](../../tests/README.md).

The selected visual redesign is documented in [Open agenda](../../docs/OPEN_AGENDA.md), with desktop and mobile screenshots.

See [the public landing page](../../docs/PUBLIC_LANDING.md) for the selected one-photo composition, account navigation and image replacement instructions.
