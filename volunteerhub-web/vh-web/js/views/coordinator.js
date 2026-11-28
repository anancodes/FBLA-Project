/*
 * views/coordinator.js
 * Screens for coordinators: Overview, Events (list or calendar, plus the create/edit form),
 * Check-in (with waitlist), Volunteers directory, Reports (reportRows() does the grouping
 * math), and the event-details pop-up used by the calendar.
 */
"use strict";

function cHome(u){
  const upcoming = state.events.filter(e => e.date >= TODAY).sort(byDate);
  const pending = state.events.filter(e => e.date <= TODAY && activeRegs(e.id).some(r => r.status === "registered")).sort(byDate);
  const concerns = u.admin ? openConcerns().length : 0;
  const clubHours = managedClubs(u).reduce((n, c) => n + state.hourLogs.filter(l => l.clubId === c.id && l.status === "pending" && l.userId !== u.id).length, 0);
  const waitingOrgs = u.admin ? state.users.filter(x => x.role === "coordinator" && !x.verified).length : 0;
  const btn = (act, label, extra = "") => `<button class="btn secondary sm" data-act="${act}" ${extra}>${label}</button>`;
  // Everything that needs action, in one list
  const items = [
    ...(u.role === "coordinator" && !u.verified && !u.admin ? [{icon:"hourglass", tone:"mark", title:"Your organizer account is waiting for verification", detail:"Your events show as unverified, and volunteers' contact details stay hidden until a site admin verifies you."}] : []),
    ...(state.org.name === "Your Organization" && (DB.live ? u.admin : DB.isVerifiedCoordinator(u)) ? [{icon:"edit", tone:"accent", title:"Add your organization's name and ZIP code", detail:"They appear on the login page, event details, certificates, and reports.", action:btn("nav", "Open Settings", 'data-v="settings"')}] : []),
    ...(concerns ? [{icon:"alert", tone:"bad", title:`${concerns} reported ${concerns === 1 ? "concern" : "concerns"} about listings`, detail:"Volunteers flagged something that looked wrong or unsafe.", action:btn("concerns", "Review")}] : []),
    ...pending.slice(0, 3).map(e => ({icon:"clipboard", tone:"mark", title:`Finish check-in for ${e.title}`, detail:`${fmtDate(e.date)} · ${activeRegs(e.id).filter(r => r.status === "registered").length} not marked yet`, action:btn("goCheckin", "Check in", `data-id="${esc(e.id)}"`)})),
    ...(clubHours ? [{icon:"clock", tone:"accent", title:`${clubHours} club ${clubHours === 1 ? "hour log" : "hour logs"} to review`, detail:managedClubs(u).map(c => esc(c.short)).join(", "), action:btn("nav", "Review", 'data-v="manage"')}] : []),
    ...(waitingOrgs ? [{icon:"shield", tone:"accent", title:`${waitingOrgs} ${waitingOrgs === 1 ? "organizer is" : "organizers are"} waiting for verification`, action:btn("nav", "Review", 'data-v="organizers"')}] : []),
  ];
  return `<header class="head"><h1>Overview</h1>${(!DB.live || DB.isVerifiedCoordinator(u)) ? '<button class="btn" data-act="newEvent">New event</button>' : ''}</header>
  ${attentionList(items)}
  <section class="section">
    <div class="spread"><h2>Next events</h2><a class="linkbtn" href="#events" data-act="nav" data-v="events">View all events</a></div>
    ${upcoming.length ? `<ol class="shift-list">${upcoming.slice(0,3).map(e => shiftRow(e,rosterButton(e),staffingText(e))).join("")}</ol>` : '<p class="empty">No upcoming events.</p>'}
  </section>`;

}

// Pop-up listing reported concerns, so coordinators can review and resolve them.
function concernsModal(){
  const list = openConcerns();
  return `<div class="spread"><h2>Reported concerns</h2><button class="btn secondary sm" data-act="close">Close</button></div>
    <p class="muted small">Check each listing, fix or delete it if needed, then mark the concern resolved.</p>
    ${list.length ? list.map(c => { const e = eventById(c.eventId); return `<div class="att-row"><span class="att-icon bad">${icon("alert")}</span>
      <div class="att-text"><b>${esc(c.reason)}</b><span>${e ? `${esc(e.title)} · ${fmtDate(e.date)} · posted by ${esc(posterOf(e).name)}` : "Event was deleted"}${c.details ? ` · "${esc(c.details)}"` : ""}</span>
      <span>Reported ${new Date(c.at).toLocaleDateString("en-US", {month:"short", day:"numeric"})} by ${esc(userById(c.userId).name)}</span></div>
      <div class="att-action">${e ? `<button class="btn secondary sm" data-act="calEvent" data-id="${esc(e.id)}">View listing</button>` : ""}<button class="btn sm" data-act="resolve" data-id="${esc(c.id)}">Resolve</button></div></div>`; }).join("")
      : `<div class="empty">No open concerns.</div>`}`;
}

function rosterButton(e){
  return `<button class="btn secondary sm" data-act="goCheckin" data-id="${esc(e.id)}" aria-label="Roster for ${esc(e.title)}">Roster</button>`;
}

function staffingText(e){
  const waiting = waitlistFor(e.id).length;
  return `<span class="staffing-text small muted">${activeRegs(e.id).length} of ${esc(e.slots)} signed up${waiting ? `, ${waiting} waiting` : ""}</span>`;
}

function cEvents(u){
  const t = ui.ev.tab, q = ui.ev.q.trim().toLowerCase();
  const upcoming = state.events.filter(e => e.date >= TODAY).sort(byDate);
  const past = state.events.filter(e => e.date < TODAY).sort((a,b) => byDate(b,a));
  const matches = e => !q || `${e.title} ${e.location} ${e.category}`.toLowerCase().includes(q);
  const list = (t === "upcoming" ? upcoming : past).filter(matches);
  const head = `<header class="head"><h1>Events</h1>${(!DB.live || DB.isVerifiedCoordinator(u)) ? '<button class="btn" data-act="newEvent">New event</button>' : ''}</header>`;
  return `${head}
  <div class="spread event-toolbar">${listCalToggle(ui.ev.mode, "ev")}
    <div class="field"><label for="ev-q">Search events</label><input id="ev-q" data-filter="ev.q" value="${esc(ui.ev.q)}" placeholder="Event name or place"></div>
  </div>
  ${ui.ev.mode === "calendar" ? calendarView(state.events.filter(matches),
    e => calChip(e,e.date < TODAY ? "done" : "open",`${activeRegs(e.id).length} of ${e.slots} signed up`)) : `
    <div class="tabs" role="group" aria-label="Show events">
      <button type="button" aria-pressed="${t === "upcoming"}" data-act="evtab" data-v="upcoming">Upcoming (${upcoming.length})</button>
      <button type="button" aria-pressed="${t === "past"}" data-act="evtab" data-v="past">Past (${past.length})</button>
    </div>
    <h2 class="sr-only">${t === "upcoming" ? "Upcoming events" : "Past events"}</h2>
    ${list.length ? `<ul class="shift-list">${list.map(e => shiftRow(e,`<div class="row coordinator-event-actions">${rosterButton(e)}
      <button class="btn secondary sm" data-act="editEvent" data-id="${esc(e.id)}" aria-label="Edit ${esc(e.title)}">Edit</button></div>`,staffingText(e))).join("")}</ul>`
      : `<p class="empty">No ${t} events${q ? " match your search" : ""}.</p>`}`}`;
}

function eventForm(e){
  const isNew = e?.id == null, isCopy = isNew && !!e?.title;
  const user = currentUser();
  e = e || {title:"", category:"Other", date:addDays(7), start:"09:00", end:"12:00", location:"", zip:"", slots:8, skills:[], desc:""};
  return `<form id="eventForm" class="event-form" novalidate data-id="${isNew ? "" : esc(e.id)}">
    <h2>${isCopy ? `Copy of ${esc(e.title)}` : isNew ? "New event" : "Edit event"}</h2>
    <p class="formerr" id="ef-err" role="alert"></p>
    <div class="field"><label for="ef-title">Event name</label><input id="ef-title" name="title" maxlength="80" value="${esc(e.title)}" placeholder="e.g. Saturday Food Sort" aria-describedby="e-title"><span class="ferr" id="e-title"></span></div>
    <fieldset class="event-time-fields"><legend>Date and time</legend><div class="grid3">
      <div class="field"><label for="ef-date">Date</label><input id="ef-date" name="date" type="date" value="${esc(e.date)}" aria-describedby="e-date"><span class="ferr" id="e-date"></span></div>
      <div class="field"><label for="ef-start">Start</label><input id="ef-start" name="start" type="time" value="${esc(e.start)}" aria-describedby="e-start"><span class="ferr" id="e-start"></span></div>
      <div class="field"><label for="ef-end">End</label><input id="ef-end" name="end" type="time" value="${esc(e.end)}" aria-describedby="e-end"><span class="ferr" id="e-end"></span></div>
    </div></fieldset>
    <div class="field"><label for="ef-loc">Location</label><input id="ef-loc" name="location" maxlength="160" list="venue-list" value="${esc(e.location)}" placeholder="Venue name or street address" aria-describedby="e-location"><datalist id="venue-list">${VENUES.map(v => `<option value="${esc(v.name)}"></option>`).join("")}</datalist><span class="ferr" id="e-location"></span></div>
    <div class="field"><label for="ef-desc">Description</label><textarea id="ef-desc" name="desc" rows="3" maxlength="2000" placeholder="What will volunteers do?" aria-describedby="e-desc">${esc(e.desc)}</textarea><span class="ferr" id="e-desc"></span></div>
    <div class="grid2 event-capacity-fields">
      <div class="field"><label for="ef-slots">Maximum volunteers</label><input id="ef-slots" name="slots" type="number" min="1" max="200" value="${esc(e.slots)}" aria-describedby="e-slots"><span class="ferr" id="e-slots"></span></div>
      <div class="field"><label for="ef-club">Who can sign up</label><select id="ef-club" name="club">${user.role === "coordinator" ? '<option value="">All volunteers</option>' : ""}${managedClubs().map(c => `<option value="${esc(c.id)}" ${e.clubId === c.id ? "selected" : ""}>${esc(c.short)} members only</option>`).join("")}</select></div>
    </div>
    <details class="disclosure event-form-options"><summary>Optional event details</summary>
      <div class="event-form">
        <div class="grid2">
          <div class="field"><label for="ef-cat">Cause</label><select id="ef-cat" name="category">${CATS.map(c => `<option ${c === e.category ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label for="ef-zip">ZIP code</label><input id="ef-zip" name="zip" inputmode="numeric" maxlength="5" value="${esc(e.zip || "")}" aria-describedby="ef-zip-hint e-zip"><span id="ef-zip-hint" class="muted small">Include a ZIP for nearby searches if the address has none.</span><span class="ferr" id="e-zip"></span></div>
        </div>
        <div class="field"><span class="lbl">Helpful skills</span><div class="checks">${SKILLS.map(skill => `<label class="check"><input type="checkbox" name="skills" value="${skill}" ${e.skills.includes(skill) ? "checked" : ""}> ${skill}</label>`).join("")}</div></div>
        <div class="grid3">
          <div class="field"><label for="ef-bring">What to bring</label><input id="ef-bring" name="bring" maxlength="120" value="${esc(e.bring || "")}" aria-describedby="e-bring"><span class="ferr" id="e-bring"></span></div>
          <div class="field"><label for="ef-wear">What to wear</label><input id="ef-wear" name="wear" maxlength="120" value="${esc(e.wear || "")}" aria-describedby="e-wear"><span class="ferr" id="e-wear"></span></div>
          <div class="field"><label for="ef-age">Minimum age</label><input id="ef-age" name="minAge" type="number" min="0" max="21" value="${e.minAge ?? ""}" aria-describedby="e-minAge"><span class="ferr" id="e-minAge"></span></div>
        </div>
        ${isNew ? `<div class="field"><label for="ef-repeat">Repeat weekly</label><select id="ef-repeat" name="repeat" aria-describedby="e-repeat">${[0,1,2,3,4,5,6,7,8,10,12].map(n => `<option value="${n}">${n ? `For ${n} more ${n === 1 ? "week" : "weeks"}` : "Just this once"}</option>`).join("")}</select><span class="ferr" id="e-repeat"></span></div>` : ""}
      </div>
    </details>
    ${isNew ? "" : '<p class="muted small">Changing the date, time, or location sends an update to signed-up volunteers.</p>'}
    <div class="event-form-actions"><button type="button" class="btn secondary" data-act="close">Cancel</button><button class="btn" type="submit" ${isNew ? 'aria-haspopup="dialog"' : ""}>${isNew ? "Create event" : "Save changes"}</button></div>
  </form>`;
}

function cCheckin(u){
  // Club officers check people in only for their own clubs' events
  const allowed = u.role === "coordinator" ? state.events : state.events.filter(e => e.clubId && isClubManager(e.clubId, u));
  const pickable = allowed.filter(e => e.date >= addDays(-45)).sort(byDate);
  if (!ui.ciEvent || !allowed.some(e => e.id === ui.ciEvent)){
    const past = allowed.filter(e => e.date <= TODAY).sort((a,b) => byDate(b,a));
    ui.ciEvent = (past[0] || pickable[0] || {}).id;
  }
  const e = eventById(ui.ciEvent);
  if (!e) return `<h1>Check-in</h1><div class="empty">No events to check in yet.</div>`;
  if (!pickable.includes(e)) pickable.unshift(e);
  const roster = activeRegs(e.id).map(r => ({r, u:userById(r.userId)})).sort((a,b) => a.u.name.localeCompare(b.u.name));
  const locked = e.date > TODAY;
  const present = roster.filter(x => x.r.status === "attended").length, absent = roster.filter(x => x.r.status === "no-show").length;
  const wait = waitlistFor(e.id).map(r => ({r, u:userById(r.userId)}));
  // Walk-ins: club members for a club event, otherwise any volunteer
  const people = e.clubId ? clubMembers(e.clubId).map(m => ({id:m.userId, name:memberName(m.userId)})) : state.users.filter(x => x.role === "volunteer");
  const others = people.filter(p => !roster.some(x => x.u.id === p.id)).sort((a,b) => a.name.localeCompare(b.name));
  ui.csv = {name:`roster-${e.date}-${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, build:() => toCSV([[e.title, fmtDate(e.date), timeRange(e), e.location], [], ["Volunteer","Phone","Email","Status","Hours","Signature"], ...roster.map(({r, u}) => [u.name, u.phone, u.email, r.status, r.status === "attended" ? r.hours : "", ""])])};
  return `<div class="head"><div><h1>Check-in</h1><p class="muted">Mark who showed up. Hours are credited to each volunteer automatically.</p></div></div>
  <div class="card stack">
    <div class="field"><label for="ci-ev">Event</label><select id="ci-ev" data-filter="ciEvent">${pickable.map(x => `<option value="${esc(x.id)}" ${x.id === e.id ? "selected" : ""}>${fmtDate(x.date)} · ${esc(x.title)}${x.date === TODAY ? " (today)" : ""}</option>`).join("")}</select></div>
    <div class="shift-when"><time datetime="${esc(e.date)}">${fmtDate(e.date, {weekday:"long", month:"long", day:"numeric"})}</time><span>${timeRange(e)}</span></div><p class="shift-place">${esc(e.location)}</p>
    <p class="report-recap"><strong>${roster.length} of ${esc(e.slots)} signed up</strong><span>${present} present</span><span>${absent} missed</span><span>${roster.length - present - absent} to check in</span></p>
    ${locked ? `<p class="formerr" style="background:var(--warn-soft);color:var(--warn)">Check-in opens on the day of the event (${fmtDate(e.date)}). You can still view the roster.</p>` : ""}
  </div>
  <div class="spread"><h2>Roster</h2><div class="row">${!locked && roster.some(x => x.r.status === "registered") ? `<button class="btn secondary sm" data-act="allPresent" aria-haspopup="dialog" data-id="${esc(e.id)}">Mark everyone else present</button>` : ""}${exportBar(e.id)}</div></div>
  <div class="tablewrap"><table><thead><tr><th>Volunteer</th><th>Status</th><th class="num">Hours</th><th class="num">Actions</th></tr></thead><tbody>
  ${roster.length ? roster.map(({r, u}) => `<tr><td><b>${esc(u.name)}</b><span class="sub">${esc(u.phone || u.email)}</span>${u.emergency ? `<span class="sub">Emergency: ${esc(u.emergency)}</span>` : ""}</td>
    <td>${statusPill(r.status)}</td>
    <td class="num">${r.status === "attended" ? `<input class="hours-in" type="number" step="0.25" min="0.25" max="12" value="${esc(r.hours)}" data-hours="${esc(r.id)}" aria-label="Hours for ${esc(u.name)}" ${locked ? "disabled" : ""}>` : "—"}</td>
    <td><div class="actions">${locked ? `<span class="muted small">Not open yet</span>` : r.status === "registered"
      ? `<button class="btn sm" data-act="mark" data-v="attended" data-id="${esc(r.id)}">Present</button><button class="btn danger sm" data-act="mark" data-v="no-show" data-id="${esc(r.id)}">No-show</button>`
      : `<button class="btn secondary sm" data-act="mark" data-v="registered" data-id="${esc(r.id)}">Undo</button>`}</div></td></tr>`).join("") : `<tr><td colspan="4" class="muted">Nobody has signed up yet.</td></tr>`}
  </tbody></table></div>
  ${wait.length ? `<section class="card"><h2>Waitlist (${wait.length})</h2><p class="muted small">If someone cancels, the first person in line gets the spot automatically. You can also add more spots by editing the event.</p>
    ${wait.map(({r, u}, i) => `<div class="mini"><span class="datechip" style="padding:8px 0"><strong>${i + 1}</strong></span><div><h3>${esc(u.name)}</h3><p>${esc(u.phone || u.email)}</p></div><div></div></div>`).join("")}</section>` : ""}
  ${locked ? "" : `<section class="card no-print"><h2>Add a walk-in</h2><p class="muted small">Someone showed up without signing up? Add them here and they'll be marked present.</p>
    <form id="walkinForm" class="row" style="margin-top:12px" novalidate><select id="wi-user" name="user" aria-label="Volunteer to add as a walk-in" style="flex:1;min-width:200px"><option value="">Choose a volunteer…</option>${others.map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("")}</select><button class="btn" type="submit" aria-haspopup="dialog">Add walk-in</button></form></section>`}`;
}

function cVolunteers(){
  const q = ui.vq.trim().toLowerCase();
  let vols = state.users.filter(u => u.role === "volunteer").map(u => ({u, s:userStats(u.id)}));
  if (q) vols = vols.filter(({u}) => (u.name + " " + u.email + " " + u.skills.join(" ")).toLowerCase().includes(q));
  vols.sort((a,b) => b.s.hours - a.s.hours);
  ui.csv = {name:"volunteers.csv", build:() => toCSV([["Name","Email","Phone","Skills","Availability","Events attended","Hours","No-shows","Reliability %"], ...vols.map(({u, s}) => [u.name, u.email, u.phone, u.skills.join("; "), u.availability.join("; "), s.attended, s.hours, s.noShows, s.attended + s.noShows ? Math.round(s.attended / (s.attended + s.noShows) * 100) : ""])])};
  return `<div class="head"><div><h1>Volunteers</h1><p class="muted">${vols.length} volunteers. Reliability is the share of shifts they showed up for.</p></div>${exportBar()}</div>
  <div class="field" style="max-width:380px"><label for="v-q">Search volunteers</label><input id="v-q" data-filter="vq" value="${esc(ui.vq)}" placeholder="Name, email, or skill"></div>
  <div class="tablewrap"><table><thead><tr><th>Volunteer</th><th>Skills</th><th>Availability</th><th class="num">Events</th><th class="num">Hours</th><th class="num">Reliability</th><th class="num no-print">Certificate</th></tr></thead><tbody>
  ${vols.length ? vols.map(({u, s}) => { const tot = s.attended + s.noShows, rel = tot ? Math.round(s.attended / tot * 100) : null;
    return `<tr><td><b>${esc(u.name)}</b><span class="sub">${esc(u.email)}</span></td><td><div class="tags">${u.skills.map(k => `<span class="pill">${esc(k)}</span>`).join("") || `<span class="muted small">None listed</span>`}</div></td><td class="small">${esc(u.availability.join(", ") || "—")}</td><td class="num">${s.attended}</td><td class="num"><b>${fmtH(s.hours)}</b></td><td class="num">${rel === null ? "—" : `<span class="pill ${rel >= 90 ? "good" : rel >= 75 ? "warn" : "bad"}">${rel}%</span>`}</td><td class="num no-print"><button class="btn secondary sm" data-act="cert" data-id="${esc(u.id)}" ${s.attended ? "" : "disabled"}>View</button></td></tr>`; }).join("") : `<tr><td colspan="7" class="muted">No volunteers match.</td></tr>`}
  </tbody></table></div>`;
}

function reportRows(f){
  const evs = state.events.filter(e => e.date >= f.from && e.date <= f.to && (f.cat === "all" || e.category === f.cat));
  const ids = new Set(evs.map(e => e.id));
  const rs = state.regs.filter(r => ids.has(r.eventId) && (r.status === "attended" || r.status === "no-show") && (f.vol === "all" || String(r.userId) === f.vol));
  const keyOf = r => { const e = eventById(r.eventId);
    return f.group === "volunteer" ? userById(r.userId).name : f.group === "event" ? `${e.title} (${fmtDate(e.date, {month:"short", day:"numeric"})})` : f.group === "month" ? monthKey(e.date) : e.category; };
  const m = {};
  rs.forEach(r => { const k = keyOf(r); m[k] = m[k] || {key:k, hours:0, attended:0, noShows:0}; if (r.status === "attended"){ m[k].hours += r.hours; m[k].attended++; } else m[k].noShows++; });
  let rows = Object.values(m);
  rows = f.group === "month" ? rows.sort((a,b) => a.key.localeCompare(b.key)).map(r => ({...r, key: parseDate(r.key + "-01").toLocaleDateString("en-US", {month:"long", year:"numeric"})})) : rows.sort((a,b) => b.hours - a.hours);
  return {rows, events:evs.length};
}
function cReports(){
  const f = ui.rep;
  const err = !f.from || !f.to ? "Choose both a start and end date." : f.from > f.to ? "The start date must be on or before the end date." : "";
  const groupName = {volunteer:"Volunteer", event:"Event", month:"Month", category:"Cause"}[f.group];
  let body = `<p class="formerr" id="report-error" role="alert">${err}</p>`;
  if (!err){
    const {rows, events} = reportRows(f);
    const hours = sum(rows.map(r => r.hours)), att = sum(rows.map(r => r.attended)), ns = sum(rows.map(r => r.noShows));
    const volName = f.vol === "all" ? "All volunteers" : userById(asId(f.vol)).name;
    ui.csv = {name:`report-by-${f.group}-${f.from}-to-${f.to}.csv`, build:() => toCSV([[`VolunteerHub report: hours by ${groupName.toLowerCase()}`], [`${f.from} to ${f.to}`, f.cat === "all" ? "All causes" : f.cat, volName], [], [groupName, "Hours", "Attended", "No-shows"], ...rows.map(r => [r.key, fmtH(r.hours), r.attended, r.noShows]), ["Total", fmtH(hours), att, ns]])};
    body = `<p class="print-only"><b>${esc(state.org.name)} · Volunteer report</b><br>${fmtDate(f.from, {month:"short", day:"numeric", year:"numeric"})} to ${fmtDate(f.to, {month:"short", day:"numeric", year:"numeric"})} · ${f.cat === "all" ? "All causes" : esc(f.cat)} · ${esc(volName)} · Grouped by ${groupName.toLowerCase()}</p>
    <p class="report-recap"><strong>${fmtH(hours)} hours</strong><span>${att} attended shifts</span><span>${ns} missed shifts</span><span>${events} events in range</span></p>
    <div class="tablewrap"><table><thead><tr><th>${groupName}</th><th class="num">Hours</th><th class="num">Attended</th><th class="num">No-shows</th></tr></thead><tbody>
      ${rows.length ? rows.map(r => `<tr><td>${esc(r.key)}</td><td class="num"><b>${fmtH(r.hours)}</b></td><td class="num">${r.attended}</td><td class="num">${r.noShows}</td></tr>`).join("") + `<tr><td><b>Total</b></td><td class="num"><b>${fmtH(hours)}</b></td><td class="num"><b>${att}</b></td><td class="num"><b>${ns}</b></td></tr>` : `<tr><td colspan="4" class="muted">No completed shifts in this range.</td></tr>`}
    </tbody></table></div>`;
  }
  const preset = (label, days) => `<button class="btn secondary sm" data-act="preset" data-v="${days}">${label}</button>`;
  return `<header class="head"><h1>Reports</h1>${err ? "" : exportBar()}</header>
  <div class="report-filters no-print">
    <div class="filters">
      <div class="field"><label for="r-from">From</label><input type="date" id="r-from" ${err ? 'aria-invalid="true" aria-describedby="report-error"' : ""} data-filter="rep.from" value="${f.from}"></div>
      <div class="field"><label for="r-to">To</label><input type="date" id="r-to" ${err ? 'aria-invalid="true" aria-describedby="report-error"' : ""} data-filter="rep.to" value="${f.to}"></div>
      <div class="field"><label for="r-group">Group by</label><select id="r-group" data-filter="rep.group">${[["volunteer","Volunteer"],["event","Event"],["month","Month"],["category","Cause"]].map(([v, l]) => `<option value="${v}" ${f.group === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    </div>
    <details class="disclosure" id="report-filters"><summary>More report filters <span class="muted">${f.cat !== "all" || f.vol !== "all" ? "(active)" : ""}</span></summary>
      <div class="filters">
        <div class="field"><label for="r-cat">Cause</label><select id="r-cat" data-filter="rep.cat"><option value="all">All causes</option>${CATS.map(c => `<option ${f.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        <div class="field"><label for="r-vol">Volunteer</label><select id="r-vol" data-filter="rep.vol"><option value="all">All volunteers</option>${state.users.filter(u => u.role === "volunteer").sort((a, b) => a.name.localeCompare(b.name)).map(u => `<option value="${esc(u.id)}" ${f.vol === String(u.id) ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></div>
      </div>
      <div class="row small"><span class="muted">Quick ranges</span>${preset("Last 30 days", 30)}${preset("Last 90 days", 90)}${preset("Last 12 months", 365)}</div>
    </details>
  </div>

  ${body}`;
}

// Pop-up with one event's details, opened from the coordinator calendar.
function eventDetail(e){
  const n = activeRegs(e.id).length, w = waitlistFor(e.id).length;
  const concerns = state.concerns.filter(c => c.eventId === e.id && c.status === "open").length;
  return `<div class="spread"><h2>${esc(e.title)}</h2><button class="btn secondary sm" data-act="close">Close</button></div>
    <div class="shift-when"><time datetime="${esc(e.date)}">${fmtDate(e.date, {weekday:"long", month:"long", day:"numeric", year:"numeric"})}</time><span>${timeRange(e)}</span></div>
    <p class="shift-place">${esc(e.location)}</p>
    ${e.desc ? `<p class="shift-description">${esc(e.desc)}</p>` : ""}
    ${concerns ? `<p class="formerr">${concerns} open ${concerns === 1 ? "concern" : "concerns"} about this listing. See the Overview.</p>` : ""}
    <p>${n} of ${esc(e.slots)} signed up${w ? `, ${w} on the waitlist` : ""}</p>
    <div class="row">${rosterButton(e)}${(!DB.live || DB.isVerifiedCoordinator() || (e.clubId && isClubManager(e.clubId))) ? `<button class="btn" data-act="editEvent" data-id="${esc(e.id)}">Edit event</button>` : ""}</div>
    <details class="disclosure event-details"><summary>Event options</summary>
      ${!isVerified(e) ? trustBox(e) : ""}
      ${eventFacts(e)}
      <div class="row"><button class="btn secondary sm" data-act="dupEvent" data-id="${esc(e.id)}">Copy event</button><button class="btn danger sm" type="button" data-act="deleteEvent" data-id="${esc(e.id)}" aria-haspopup="dialog">Delete event</button></div>
    </details>`;
}
