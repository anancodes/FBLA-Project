# VolunteerHub

VolunteerHub helps nonprofits and school clubs recruit volunteers, schedule shifts, verify service and report hours. The site includes volunteer and coordinator workspaces and scheduled Gmail check-ins. [Competition scorecard and implementation plan](docs/FBLA-REVIEW.md) · [Gmail setup](docs/GMAIL-ALERTS.md)

GitHub Pages publishes the website from `main`. [Open VolunteerHub](https://anancodes.github.io/FBLA-Project/volunteerhub-web/vh-web/)

Create an account with an email, password and role. Firebase Authentication manages the sign-in. Firestore stores the name and role under the same user ID. Sign in from another device with the same credentials to return to that workspace. New accounts can explore shifts, service records and clubs immediately. Email verification opens shared organization records, and a site administrator approves coordinator access.

## How to run

Open `volunteerhub-web/vh-web/index.html` with your local preview workflow. For consistent font loading, run `python -m http.server 4173 --directory volunteerhub-web/vh-web` from the repository root and visit `http://localhost:4173`.

For the competition’s offline fallback, run `node scripts/build-demo.cjs VolunteerHub-offline.html` and open the file directly. The workbook accepts fictional accounts stored on that device. Use `maya.chen@example.org` for a volunteer or `jordan.reyes@example.org` for a coordinator with the fixture password `demo1234`. Hosted accounts always use Firebase. [Firebase setup](volunteerhub-web/vh-web/SETUP-FIREBASE.md)

## Why this stack fits the event

Volunteers need to search and join shifts from an ordinary browser, including on phones. Vanilla JavaScript and semantic HTML support native forms, links, focus and browser history. The interface has no runtime build service. Self-hosted assets and the optional offline workbook let both roles run without internet access. Firestore provides shared records and atomic changes to live data. Firebase Authentication establishes account identity and server-enforced permissions.

Time passes even when nobody visits the app. A scheduled Node.js function therefore calculates expected club hours independently of the browser. The browser and worker import the same policy. A private Gmail OAuth credential authorizes the sending account, and a persisted draft ID lets a retry address the same message. [Delivery design and setup](docs/GMAIL-ALERTS.md)

## Features

**Volunteers:** find opportunities as a list or calendar, search by event, place, or cause, optionally find nearby shifts using a saved city or town, and filter by skills and verified organizers, open More info for the address, parking, accessibility, what to bring and wear, minimum age, contact, and who posted it, add a shift to their own calendar (.ics), report a listing that seems wrong or unsafe, sign up (blocks overlapping shifts), join a waitlist for full events and get the spot automatically when someone cancels, track verified hours toward a goal, download hours as CSV, read announcements, edit skills and availability.

**Coordinators:** program overview, create/edit/delete events (list or calendar), waitlists that fill automatically when spots open, check-in (present, no-show, walk-ins) with roster download and print, volunteer directory with reliability and certificates, reports filtered by dates, cause, and volunteer and grouped by volunteer, event, month, or cause, with CSV download, copy, and print, announcements to everyone or to one event's volunteers, and a review list for concerns volunteers report.

**Trust and safety:** every listing shows who posted it and when. Listings from verified organizers carry a badge, and volunteers see only verified listings unless they turn that filter off. Unverified listings show a safety warning. Volunteers can report a concern on any listing.

**Everyone:** guided tour on first login (replay from Help), help page and FAQ, adjustable text size, high-contrast mode, dark mode, full keyboard support.

Advisers can set a term threshold and preview the volunteer and adviser copies in **People & clubs → Clubs**. Administrators connect the sending mailbox in **Settings**. Volunteers see their status in **Hours & clubs → My clubs**.

## Project structure

| File | What it does |
|---|---|
| `index.html` | Page skeleton; loads the stylesheet and scripts in order |
| `css/styles.css` | Existing screen styles, with colors defined once as variables |
| `css/open-agenda.css` | Shared Open agenda website design |
| `css/landing.css` | Scoped public landing and account design |
| `js/utils.js` | General helpers: dates, times, HTML escaping, CSV |
| `js/data.js` | Constants and the sample (seed) data |
| `js/store.js` | App data, saving/loading with localStorage, waitlist logic, query helpers |
| `js/validation.js` | Input validation and error display |
| `js/components.js` | Reusable pieces: charts, calendar, tiles, pop-ups, messages, CSV export, printing |
| `js/views/auth.js` | Login and create-account screens |
| `js/views/landing.js` | Public landing, public links and demo entry points |
| `js/views/volunteer.js` | Volunteer screens |
| `js/website.js` | Shared website shell, page URLs and volunteer Home |
| `js/views/coordinator.js` | Coordinator screens and report calculations |
| `js/views/help.js` | Help screen |
| `js/views/news.js` | Announcements screen (post for coordinators, read for volunteers) |
| `js/tour.js` | First-login guided tour |
| `js/actions.js` | What each button does |
| `js/app.js` | Starts the app, draws screens and routes interaction |
| `js/pace.js`, `js/gmail.js` | Shared pace and message logic, Gmail status and preview UI |
| `functions/` (repository root) | OAuth consent, scheduled checks, Gmail transport and persistent delivery records |
| `scripts/build-demo.cjs` (repository root) | Packages the full offline single-file demo |

## Credits

- Atkinson Hyperlegible Next and Bitter are self-hosted. Their SIL Open Font Licenses are in the web application's `fonts/` directory.
- The garden image is an AI-generated illustration from the existing design branch. Its provenance is stored with the image. [Image record](volunteerhub-web/vh-web/images/community-garden.webp.json)
- Offline locations use Sean Pianka's Zipcodes data. [Project source](https://github.com/seanpianka/Zipcodes) · [Bundled MIT license](volunteerhub-web/vh-web/licenses/zipcodes-MIT.txt)
- The live website uses the Firebase JavaScript SDK. The optional worker uses Firebase Admin, Firebase Functions and Google's Auth Library. Reproducible dependency versions are in `functions/package-lock.json`.
- The original project credits Claude. This branch used Codex, Impeccable and UI UX Designer for implementation and review.

## Design assistance in Codex

Impeccable is included as a project skill. Type `$impeccable init` in Codex, then use `$impeccable critique` or `$impeccable distill` with a specific screen. See [the team usage guide](docs/IMPECCABLE.md) for setup, examples, and installation scope.

## Interface cleanup

See [the change guide](docs/UI_CLEANUP.md) for the current navigation, optional location behavior, compact histories, club workflows, and verification. Run the optional checks using [tests/README.md](tests/README.md).
