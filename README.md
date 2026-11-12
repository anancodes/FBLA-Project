# VolunteerHub

On `codex/visual-redesign-preview`, [compare the two visual proposals and try the working volunteer Home screen](docs/VISUAL_PREVIEW.md). The broader site awaits the owner's design review.

**Live demo:** https://anancodes.github.io/FBLA-Project/volunteerhub-web/vh-web/

A website that helps nonprofits recruit, organize, and manage volunteers, built for the FBLA Coding & Programming 2026–27 topic, *Serving the Community: Nonprofit Volunteer Management*.

## How to run

Open `volunteerhub-web/vh-web/index.html` with your local preview workflow. For consistent font loading, run `python -m http.server 4173 --directory volunteerhub-web/vh-web` from the repository root and visit `http://localhost:4173`.

Demo accounts (password `demo1234`):

- Volunteer: `volunteer@demo.org`
- Coordinator: `coordinator@demo.org`

Demo accounts use fictional sample data saved in your browser only. Configured live accounts use Firebase; see the web app's `SETUP-FIREBASE.md` for setup. Use **Reset demo data** at the bottom of the app to start over.

## Features

**Volunteers:** find opportunities as a list or calendar, search by event, place, or cause, optionally find nearby shifts using a saved city or town, and filter by skills and verified organizers, open More info for the address, parking, accessibility, what to bring and wear, minimum age, contact, and who posted it, add a shift to their own calendar (.ics), report a listing that seems wrong or unsafe, sign up (blocks overlapping shifts), join a waitlist for full events and get the spot automatically when someone cancels, track verified hours toward a goal, download hours as CSV, read announcements, edit skills and availability.

**Coordinators:** program overview, create/edit/delete events (list or calendar), waitlists that fill automatically when spots open, check-in (present, no-show, walk-ins) with roster download and print, volunteer directory with reliability and certificates, reports filtered by dates, cause, and volunteer and grouped by volunteer, event, month, or cause, with CSV download, copy, and print, announcements to everyone or to one event's volunteers, and a review list for concerns volunteers report.

**Trust and safety:** every listing shows who posted it and when. Listings from verified organizers carry a badge, and volunteers see only verified listings unless they turn that filter off. Unverified listings show a safety warning. Volunteers can report a concern on any listing.

**Everyone:** guided tour on first login (replay from Help), help page and FAQ, adjustable text size, high-contrast mode, dark mode, full keyboard support.

## Project structure

| File | What it does |
|---|---|
| `index.html` | Page skeleton; loads the stylesheet and scripts in order |
| `css/styles.css` | Existing screen styles, with colors defined once as variables |
| `css/home-preview.css` | Scoped volunteer Home visual proposal |
| `js/utils.js` | General helpers: dates, times, HTML escaping, CSV |
| `js/data.js` | Constants and the sample (seed) data |
| `js/store.js` | App data, saving/loading with localStorage, waitlist logic, query helpers |
| `js/validation.js` | Input validation and error display |
| `js/components.js` | Reusable pieces: charts, calendar, tiles, pop-ups, messages, CSV export, printing |
| `js/views/auth.js` | Login and create-account screens |
| `js/views/volunteer.js` | Volunteer screens |
| `js/views/home-preview.js` | Working volunteer Home proposal |
| `js/views/coordinator.js` | Coordinator screens and report calculations |
| `js/views/help.js` | Help screen |
| `js/views/news.js` | Announcements screen (post for coordinators, read for volunteers) |
| `js/tour.js` | First-login guided tour |
| `js/actions.js` | What each button does |
| `js/app.js` | Starts the app, draws screens, routes clicks and form submits |

## Credits

- Fonts: Public Sans (self-hosted for the Home proposal), IBM Plex Sans, and IBM Plex Mono; SIL Open Font License
- AI assistance (Claude) was used as a coding tool. The team reviewed and can explain all code.

## Design assistance in Codex

Impeccable is included as a project skill. Type `$impeccable init` in Codex, then use `$impeccable critique` or `$impeccable distill` with a specific screen. See [the team usage guide](docs/IMPECCABLE.md) for setup, examples, and installation scope.

## Interface cleanup

See [the change guide](docs/UI_CLEANUP.md) for the current navigation, optional location behavior, compact histories, club workflows, and verification. Run the optional checks using [tests/README.md](tests/README.md).
