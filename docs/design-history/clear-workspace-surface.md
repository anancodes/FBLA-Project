---
version: 1
slug: "volunteerhub-web-vh-web-js-views-home-preview-js"
primary_target: "volunteerhub-web/vh-web/js/views/home-preview.js"
related_targets: ["volunteerhub-web/vh-web/css/home-preview.css","volunteerhub-web/vh-web/js/app.js","volunteerhub-web/vh-web/index.html"]
---

# Volunteer Home visual preview

Mode: Operate. Scope: one working volunteer Home screen, its navigation shell, and its event-detail/display interactions. Preserve existing routes, actions, data, permissions and the vanilla HTML/CSS/JavaScript stack. Other screens retain their existing visual implementation until the owner reviews this screen.

The owner requests two simple visual directions and one built screen before a site-wide decision. This is a reviewable prototype of Clear workspace, not approval to roll it out. Public signup, database architecture and Firebase permissions are outside this visual task.

## Direction contract

THESIS: A volunteer should recognise the next commitment immediately; service totals and possible commitments carry less weight. Avoid metric tiles, interchangeable cards and a wall of equally small rows.

OWN-WORLD: Clear workspace draws on campus student services. Public Sans carries all UI text; white reading areas, pale blue-grey navigation, slate-blue actions, dark ink and restrained semantic status colours. Controls state their action; account actions are explicit and display preferences expand inline.

STORY: Read the next shift's date, time and place; open its practical details; then review other commitments or sign up for a recommendation. Keep verified hours distinct from scheduled commitments.

FIRST VIEWPORT: The existing five navigation destinations stay in a left rail. A readable greeting and Find opportunities action lead. The first shift is larger within a chronological list, verified hours sit in a quieter right column, and recommendations occupy a lower section. Phones show all five destinations in wrapping navigation and one content column, without hiding routes behind horizontal scrolling. Signature interaction: open a clearly named View shift action with reliable dialog focus and return to that same action.

FORM: Grounded candidate 3, campus student-services directory; seed:d1036f369104af8f. Restrained colour follows a daylight phone/laptop use scene. Clear workspace is the built proposal; Open agenda is the second, visually distinct proposal with a dark blue rail and an equal-weight date-led agenda.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Reference evidence

Official interface images inspected: Things (https://culturedcode.com/things/), Todoist (https://www.todoist.com/features), and Google Calendar (https://workspace.google.com/products/calendar/). Carry forward hierarchy through spacing, readable dates, quiet secondary metadata, and explicit event actions. Do not copy branding, imagery, proprietary copy, coloured pictograms, full week grids or marketing effects. SignUpGenius is the owner's anti-reference for clutter.

## Deliberate exclusions and quality raises

The six dealt catalog challengers lose audience identification and product clarity after applying this brief: Metro tiles (neon/tile panorama), glass timetable (raked panes), acetate manual (unfamiliar layered controls), ticket wallet (travel-themed controls), transit mural (map as primary work area), and font specimen (type experiment as task). None becomes a third proposal.

Their transferable disciplines raise Clear workspace without importing their motifs: Metro—one unmistakable selected navigation state; timetable—date/time column alignment; manual—consistent control vocabulary; ticket wallet—explicit signup/attendance states; transit—obvious reading order; type specimen—intentional readable type hierarchy.

## Owner review boundary

Review both directions and the working Home screen before choosing the site-wide visual system. Do not mark either proposal approved, migrate other screens, remove existing features or invent programme claims. The owner has delegated construction of one representative screen, so this prototype does not wait on an abstract palette approval.
