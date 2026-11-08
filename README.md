# VolunteerHub

**Live demo:** https://anancodes.github.io/FBLA-Project/volunteerhub-web/vh-web/

A website that helps nonprofits recruit, organize, and manage volunteers, built for the FBLA Coding & Programming 2026–27 topic, *Serving the Community: Nonprofit Volunteer Management*.

## How to run

Double-click `index.html` to open it in a browser. No install or server is needed.

Demo accounts (password `demo1234`):

- Volunteer: `volunteer@demo.org`
- Coordinator: `coordinator@demo.org`

All data is sample data for a fictional organization. It is saved in your browser only. Use **Reset demo data** at the bottom of the app to start over.

## Features

**Volunteers:** find and filter opportunities, sign up (blocks full events and overlapping shifts), cancel shifts, track verified hours toward a goal, edit skills and availability.

**Coordinators:** program overview, create/edit/delete events, check-in (present, no-show, walk-ins), volunteer directory with reliability, reports grouped by volunteer, event, month, or cause, with CSV export.

**Everyone:** help page and FAQ, adjustable text size, high-contrast mode, dark mode, full keyboard support.

## Project structure

| File | What it does |
|---|---|
| `index.html` | Page skeleton; loads the stylesheet and scripts in order |
| `css/styles.css` | All styling, with colors defined once as variables |
| `js/utils.js` | General helpers: dates, times, HTML escaping, CSV |
| `js/data.js` | Constants and the sample (seed) data |
| `js/store.js` | App data, saving/loading with localStorage, query helpers |
| `js/validation.js` | Input validation and error display |
| `js/components.js` | Reusable pieces: charts, tiles, pills, pop-ups, messages |
| `js/views/auth.js` | Login and create-account screens |
| `js/views/volunteer.js` | Volunteer screens |
| `js/views/coordinator.js` | Coordinator screens and report calculations |
| `js/views/help.js` | Help screen |
| `js/actions.js` | What each button does |
| `js/app.js` | Starts the app, draws screens, routes clicks and form submits |

## Credits

- Fonts: Bricolage Grotesque and Public Sans, from Google Fonts (SIL Open Font License)
- AI assistance (Claude) was used as a coding tool. The team reviewed and can explain all code.
