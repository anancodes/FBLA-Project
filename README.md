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

**Volunteers:** find opportunities as a list or calendar, filter by cause and skills, sign up (blocks overlapping shifts), join a waitlist for full events and get the spot automatically when someone cancels, reminders for shifts in the next 3 days, track verified hours toward a goal, print a service certificate, download hours as CSV, read announcements, edit skills and availability.

**Coordinators:** program overview, create/edit/delete events (list or calendar), waitlists that fill automatically when spots open, check-in (present, no-show, walk-ins) with roster download and print, volunteer directory with reliability and certificates, reports filtered by dates, cause, and volunteer and grouped by volunteer, event, month, or cause, with CSV download, copy, and print, and announcements to everyone or to one event's volunteers.

**Everyone:** guided tour on first login (replay from Help), help page and FAQ, adjustable text size, high-contrast mode, dark mode, full keyboard support.

## Project structure

| File | What it does |
|---|---|
| `index.html` | Page skeleton; loads the stylesheet and scripts in order |
| `css/styles.css` | All styling, with colors defined once as variables |
| `js/utils.js` | General helpers: dates, times, HTML escaping, CSV |
| `js/data.js` | Constants and the sample (seed) data |
| `js/store.js` | App data, saving/loading with localStorage, waitlist logic, query helpers |
| `js/validation.js` | Input validation and error display |
| `js/components.js` | Reusable pieces: charts, calendar, tiles, pop-ups, messages, CSV export, printing |
| `js/views/auth.js` | Login and create-account screens |
| `js/views/volunteer.js` | Volunteer screens |
| `js/views/coordinator.js` | Coordinator screens and report calculations |
| `js/views/help.js` | Help screen |
| `js/views/news.js` | Announcements screen (post for coordinators, read for volunteers) |
| `js/tour.js` | First-login guided tour |
| `js/actions.js` | What each button does |
| `js/app.js` | Starts the app, draws screens, routes clicks and form submits |

## Credits

- Fonts: Bricolage Grotesque and Public Sans, from Google Fonts (SIL Open Font License)
- AI assistance (Claude) was used as a coding tool. The team reviewed and can explain all code.
