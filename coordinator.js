/*
 * views/coordinator.js
 * Screens for coordinators: Overview, Events (list or calendar, plus the create/edit form),
 * Check-in (with waitlist), Volunteers directory, Reports (reportRows() does the grouping
 * math), and the event-details pop-up used by the calendar.
 */
"use strict";

function cHome(){
  const d30 = addDays(-30), d90 = addDays(-90);
  const inRange = (r, a) => { const e = eventById(r.eventId); return e.date >= a && e.date <= TODAY; };
  const hours30 = sum(state.regs.filter(r => r.status === "attended" && inRange(r, d30)).map(r => r.hours));
  const active = new Set(state.regs.filter(r => r.status === "attended" && inRange(r, d90)).map(r => r.userId)).size;
  const att90 = state.regs.filter(r => r.status === "attended" && inRange(r, d90)).length;
  const ns90 = state.regs.filter(r => r.status === "no-show" && inRange(r, d90)).length;
  const upcoming = state.events.filter(e => e.date >= TODAY).sort(byDate);
  const fill = upcoming.length ? Math.round(sum(upcoming.map(e => Math.min(1, activeRegs(e.id).length / e.slots))) / upcoming.length * 100) : 0;
  const needs = upcoming.filter(e => activeRegs(e.id).length / e.slots < 0.5);
  const pending = state.events.filter(e => e.date <= TODAY && activeRegs(e.id).some(r => r.status === "registered")).sort(byDate);
  const top = Object.entries(state.regs.filter(r => r.status === "attended" && inRange(r, d90)).reduce((m, r) => (m[r.userId] = (m[r.userId] || 0) + r.hours, m), {})).map(([id, v]) => ({label:userById(+id).name, value:v})).sort((a,b) => b.value - a.value).slice(0, 6);
  return `<div class="head"><div><span class="eyebrow">${fmtDate(TODAY, {weekday:"long", month:"long", day:"numeric"})}</span><h1>Program overview</h1></div><button class="btn" data-act="newEvent">New event</button></div>
  <section class="tiles">
    ${tile("Active volunteers", active, "Attended in the last 90 days")}
    ${tile("Hours served", fmtH(hours30), "Last 30 days", "hrs")}
    ${tile("Upcoming events", upcoming.length, `${needs.length} need volunteers`)}
    ${tile("Average fill rate", fill, "Upcoming events", "%")}
    ${tile("No-show rate", att90 + ns90 ? Math.round(ns90 / (att90 + ns90) * 100) : 0, "Last 90 days", "%")}
  </section>
  ${pending.length ? `<section class="card" style="border-color:var(--mark)"><div class="spread"><div><h2>Check-in needed</h2><p class="muted small">These events have volunteers who haven't been marked present or absent.</p></div></div>
    ${pending.map(e => eventMini(e, `<button class="btn sm" data-act="goCheckin" data-id="${e.id}">Open check-in</button>`)).join("")}</section>` : ""}
  <div class="cols">
    <section class="card"><h2>Needs volunteers</h2><p class="muted small">Upcoming events under half full.</p>
      ${needs.length ? needs.map(e => eventMini(e, `<div class="fillcell" style="min-width:110px">${fillMeter(e)}<span class="small num">${activeRegs(e.id).length}/${e.slots}</span></div>`)).join("") : `<div class="empty" style="margin-top:12px">Every upcoming event is at least half full.</div>`}</section>
    <section class="card stack"><h2>Hours served by month</h2>${colChart(hoursByMonth(state.regs))}</section>
  </div>
  <section class="card stack"><div class="spread"><h2>Top volunteers, last 90 days</h2><button class="linkbtn small" data-act="nav" data-v="reports">Open reports</button></div>${hbars(top, " h")}</section>`;
}

function cEvents(){
  const t = ui.ev.tab, q = ui.ev.q.trim().toLowerCase();
  let list = state.events.filter(e => t === "upcoming" ? e.date >= TODAY : e.date < TODAY);
  list.sort(t === "upcoming" ? byDate : (a,b) => byDate(b,a));
  if (q) list = list.filter(e => (e.title + " " + e.location + " " + e.category).toLowerCase().includes(q));
  const chip = e => { const pct = activeRegs(e.id).length / e.slots; return calChip(e, e.date < TODAY ? "done" : pct >= 1 ? "wait" : pct < 0.5 ? "low" : "open"); };
  const legend = `<div class="cal-legend small"><span><i class="sw open"></i>Half full or more</span><span><i class="sw low"></i>Needs volunteers</span><span><i class="sw wait"></i>Full</span><span><i class="sw done"></i>Past</span></div>`;
  const head = `<div class="head"><div><h1>Events</h1><p class="muted">Create shifts, set how many volunteers you need, and track sign-ups.</p></div><div class="row">${listCalToggle(ui.ev.mode, "ev")}<button class="btn" data-act="newEvent">New event</button></div></div>`;
  if (ui.ev.mode === "calendar") return head + calendarView(state.events, chip, legend);
  return `${head}
  <div class="spread"><div class="tabs" role="tablist">
    <button role="tab" aria-selected="${t === "upcoming"}" data-act="evtab" data-v="upcoming">Upcoming (${state.events.filter(e => e.date >= TODAY).length})</button>
    <button role="tab" aria-selected="${t === "past"}" data-act="evtab" data-v="past">Past (${state.events.filter(e => e.date < TODAY).length})</button></div>
    <div class="field" style="min-width:240px;flex:0 1 320px"><label for="ev-q" class="small">Search events</label><input id="ev-q" data-filter="ev.q" value="${esc(ui.ev.q)}" placeholder="Title, place, or cause"></div></div>
  <div class="tablewrap"><table><thead><tr><th>Date</th><th>Event</th><th>Cause</th><th>Volunteers</th><th class="num">Actions</th></tr></thead><tbody>
  ${list.length ? list.map(e => { const n = activeRegs(e.id).length; return `<tr>
    <td style="white-space:nowrap"><b>${fmtDate(e.date)}</b><span class="sub">${timeRange(e)}</span></td>
    <td>${esc(e.title)}<span class="sub">${esc(e.location)}</span></td>
    <td><span class="pill">${esc(e.category)}</span></td>
    <td><div class="fillcell">${fillMeter(e)}<span class="num small">${n}/${e.slots}</span></div>${waitlistFor(e.id).length ? `<span class="sub">+${waitlistFor(e.id).length} on waitlist</span>` : ""}</td>
    <td><div class="actions"><button class="btn secondary sm" data-act="goCheckin" data-id="${e.id}">Roster</button><button class="btn secondary sm" data-act="editEvent" data-id="${e.id}">Edit</button>${armBtn(`delete:${e.id}`, "Delete", "Confirm delete")}</div></td></tr>`; }).join("") : `<tr><td colspan="5" class="muted">No events found.</td></tr>`}
  </tbody></table></div>`;
}

function eventForm(e){
  const isNew = !e; e = e || {title:"", category:CATS[0], date:addDays(7), start:"09:00", end:"12:00", location:"", slots:8, skills:[], desc:""};
  return `<form id="eventForm" class="stack" novalidate data-id="${isNew ? "" : e.id}">
    <div class="spread"><h2>${isNew ? "New event" : "Edit event"}</h2><button type="button" class="btn secondary sm" data-act="close">Close</button></div>
    <p class="formerr" id="ef-err"></p>
    <div class="field"><label for="ef-title">Event name</label><input id="ef-title" name="title" value="${esc(e.title)}" placeholder="e.g. Saturday Food Sort"><span class="ferr" id="e-title"></span></div>
    <div class="grid2">
      <div class="field"><label for="ef-cat">Cause</label><select id="ef-cat" name="category">${CATS.map(c => `<option ${c === e.category ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="field"><label for="ef-loc">Location</label><input id="ef-loc" name="location" value="${esc(e.location)}"><span class="ferr" id="e-location"></span></div>
    </div>
    <div class="grid3">
      <div class="field"><label for="ef-date">Date</label><input id="ef-date" name="date" type="date" value="${e.date}"><span class="ferr" id="e-date"></span></div>
      <div class="field"><label for="ef-start">Start</label><input id="ef-start" name="start" type="time" value="${e.start}"><span class="ferr" id="e-start"></span></div>
      <div class="field"><label for="ef-end">End</label><input id="ef-end" name="end" type="time" value="${e.end}"><span class="ferr" id="e-end"></span></div>
      <div class="field"><label for="ef-slots">Volunteers needed</label><input id="ef-slots" name="slots" type="number" min="1" max="200" value="${e.slots}"><span class="ferr" id="e-slots"></span></div>
    </div>
    <div class="field"><span class="lbl">Helpful skills</span><div class="checks">${SKILLS.map(s => `<label class="check"><input type="checkbox" name="skills" value="${s}" ${e.skills.includes(s) ? "checked" : ""}> ${s}</label>`).join("")}</div></div>
    <div class="field"><label for="ef-desc">Description</label><textarea id="ef-desc" name="desc" rows="3">${esc(e.desc)}</textarea></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="close">Cancel</button><button class="btn" type="submit">${isNew ? "Create event" : "Save changes"}</button></div>
  </form>`;
}

function cCheckin(){
  const pickable = state.events.filter(e => e.date >= addDays(-45)).sort(byDate);
  if (!ui.ciEvent || !eventById(ui.ciEvent)){
    const past = state.events.filter(e => e.date <= TODAY).sort((a,b) => byDate(b,a));
    ui.ciEvent = (past[0] || pickable[0] || {}).id;
  }
  const e = eventById(ui.ciEvent);
  if (!e) return `<h1>Check-in</h1><div class="empty">No events yet.</div>`;
  if (!pickable.includes(e)) pickable.unshift(e);
  const roster = activeRegs(e.id).map(r => ({r, u:userById(r.userId)})).sort((a,b) => a.u.name.localeCompare(b.u.name));
  const locked = e.date > TODAY;
  const present = roster.filter(x => x.r.status === "attended").length, absent = roster.filter(x => x.r.status === "no-show").length;
  const wait = waitlistFor(e.id).map(r => ({r, u:userById(r.userId)}));
  const others = state.users.filter(u => u.role === "volunteer" && !roster.some(x => x.u.id === u.id)).sort((a,b) => a.name.localeCompare(b.name));
  ui.csv = {name:`roster-${e.date}-${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, build:() => toCSV([[e.title, fmtDate(e.date), timeRange(e), e.location], [], ["Volunteer","Phone","Email","Status","Hours","Signature"], ...roster.map(({r, u}) => [u.name, u.phone, u.email, r.status, r.status === "attended" ? r.hours : "", ""])])};
  return `<div class="head"><div><h1>Check-in</h1><p class="muted">Mark who showed up. Hours are credited to each volunteer automatically.</p></div></div>
  <div class="card stack">
    <div class="field"><label for="ci-ev">Event</label><select id="ci-ev" data-filter="ciEvent">${pickable.map(x => `<option value="${x.id}" ${x.id === e.id ? "selected" : ""}>${fmtDate(x.date)} · ${esc(x.title)}${x.date === TODAY ? " (today)" : ""}</option>`).join("")}</select></div>
    <div class="row small"><span class="pill">${esc(e.category)}</span><span class="muted">${fmtDate(e.date, {weekday:"long", month:"long", day:"numeric"})} · ${timeRange(e)} · ${esc(e.location)}</span></div>
    <div class="row"><span class="pill accent num">${roster.length}/${e.slots} signed up</span><span class="pill good num">${present} present</span><span class="pill bad num">${absent} no-show</span><span class="pill num">${roster.length - present - absent} not marked</span></div>
    ${locked ? `<p class="formerr" style="background:var(--warn-soft);color:var(--warn)">Check-in opens on the day of the event (${fmtDate(e.date)}). You can still view the roster.</p>` : ""}
  </div>
  <div class="spread"><h2>Roster</h2><div class="row">${!locked && roster.some(x => x.r.status === "registered") ? `<button class="btn secondary sm" data-act="allPresent" data-id="${e.id}">Mark everyone else present</button>` : ""}${exportBar()}</div></div>
  <div class="tablewrap"><table><thead><tr><th>Volunteer</th><th>Status</th><th class="num">Hours</th><th class="num">Actions</th></tr></thead><tbody>
  ${roster.length ? roster.map(({r, u}) => `<tr><td><b>${esc(u.name)}</b><span class="sub">${esc(u.phone || u.email)}</span></td>
    <td>${statusPill(r.status)}</td>
    <td class="num">${r.status === "attended" ? `<input class="hours-in" type="number" step="0.25" min="0.25" max="12" value="${r.hours}" data-hours="${r.id}" aria-label="Hours for ${esc(u.name)}" ${locked ? "disabled" : ""}>` : "—"}</td>
    <td><div class="actions">${locked ? `<span class="muted small">Not open yet</span>` : r.status === "registered"
      ? `<button class="btn sm" data-act="mark" data-v="attended" data-id="${r.id}">Present</button><button class="btn danger sm" data-act="mark" data-v="no-show" data-id="${r.id}">No-show</button>`
      : `<button class="btn secondary sm" data-act="mark" data-v="registered" data-id="${r.id}">Undo</button>`}</div></td></tr>`).join("") : `<tr><td colspan="4" class="muted">Nobody has signed up yet.</td></tr>`}
  </tbody></table></div>
  ${wait.length ? `<section class="card"><h2>Waitlist (${wait.length})</h2><p class="muted small">If someone cancels, the first person in line gets the spot automatically. You can also add more spots by editing the event.</p>
    ${wait.map(({r, u}, i) => `<div class="mini"><span class="datechip" style="padding:8px 0"><strong>${i + 1}</strong></span><div><h3>${esc(u.name)}</h3><p>${esc(u.phone || u.email)}</p></div><div></div></div>`).join("")}</section>` : ""}
  ${locked ? "" : `<section class="card no-print"><h2>Add a walk-in</h2><p class="muted small">Someone showed up without signing up? Add them here and they'll be marked present.</p>
    <form id="walkinForm" class="row" style="margin-top:12px" novalidate><select id="wi-user" name="user" style="flex:1;min-width:200px"><option value="">Choose a volunteer…</option>${others.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join("")}</select><button class="btn" type="submit">Add walk-in</button></form></section>`}`;
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
    return `<tr><td><b>${esc(u.name)}</b><span class="sub">${esc(u.email)}</span></td><td><div class="tags">${u.skills.map(k => `<span class="pill">${esc(k)}</span>`).join("") || `<span class="muted small">None listed</span>`}</div></td><td class="small">${esc(u.availability.join(", ") || "—")}</td><td class="num">${s.attended}</td><td class="num"><b>${fmtH(s.hours)}</b></td><td class="num">${rel === null ? "—" : `<span class="pill ${rel >= 90 ? "good" : rel >= 75 ? "warn" : "bad"}">${rel}%</span>`}</td><td class="num no-print"><button class="btn secondary sm" data-act="cert" data-id="${u.id}" ${s.attended ? "" : "disabled"}>View</button></td></tr>`; }).join("") : `<tr><td colspan="7" class="muted">No volunteers match.</td></tr>`}
  </tbody></table></div>`;
}

function reportRows(f){
  const evs = state.events.filter(e => e.date >= f.from && e.date <= f.to && (f.cat === "all" || e.category === f.cat));
  const ids = new Set(evs.map(e => e.id));
  const rs = state.regs.filter(r => ids.has(r.eventId) && (r.status === "attended" || r.status === "no-show") && (f.vol === "all" || r.userId === +f.vol));
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
  let body = `<p class="formerr">${err}</p>`;
  if (!err){
    const {rows, events} = reportRows(f);
    const hours = sum(rows.map(r => r.hours)), att = sum(rows.map(r => r.attended)), ns = sum(rows.map(r => r.noShows));
    const volName = f.vol === "all" ? "All volunteers" : userById(+f.vol).name;
    ui.csv = {name:`report-by-${f.group}-${f.from}-to-${f.to}.csv`, build:() => toCSV([[`VolunteerHub report: hours by ${groupName.toLowerCase()}`], [`${f.from} to ${f.to}`, f.cat === "all" ? "All causes" : f.cat, volName], [], [groupName, "Hours", "Attended", "No-shows"], ...rows.map(r => [r.key, fmtH(r.hours), r.attended, r.noShows]), ["Total", fmtH(hours), att, ns]])};
    body = `<p class="print-only"><b>Riverbend Community Pantry · Volunteer report</b><br>${fmtDate(f.from, {month:"short", day:"numeric", year:"numeric"})} to ${fmtDate(f.to, {month:"short", day:"numeric", year:"numeric"})} · ${f.cat === "all" ? "All causes" : esc(f.cat)} · ${esc(volName)} · Grouped by ${groupName.toLowerCase()}</p>
    <section class="tiles">${tile("Total hours", fmtH(hours), "", "hrs")}${tile("Events in range", events)}${tile("Volunteer shifts", att, "Attended")}${tile("No-show rate", att + ns ? Math.round(ns / (att + ns) * 100) : 0, `${ns} missed shifts`, "%")}</section>
    <section class="card stack"><h2>Hours by ${groupName.toLowerCase()}</h2>${f.group === "month" ? (rows.length ? colChart(rows.map(r => ({label:r.key.split(" ")[0].slice(0,3), value:r.hours}))) : hbars([])) : hbars(rows.slice(0, 12).map(r => ({label:r.key, value:r.hours})), " h")}${f.group !== "month" && rows.length > 12 ? `<p class="muted small">Showing the top 12. The table has all ${rows.length}.</p>` : ""}</section>
    <div class="tablewrap"><table><thead><tr><th>${groupName}</th><th class="num">Hours</th><th class="num">Attended</th><th class="num">No-shows</th></tr></thead><tbody>
      ${rows.length ? rows.map(r => `<tr><td>${esc(r.key)}</td><td class="num"><b>${fmtH(r.hours)}</b></td><td class="num">${r.attended}</td><td class="num">${r.noShows}</td></tr>`).join("") + `<tr><td><b>Total</b></td><td class="num"><b>${fmtH(hours)}</b></td><td class="num"><b>${att}</b></td><td class="num"><b>${ns}</b></td></tr>` : `<tr><td colspan="4" class="muted">No completed shifts in this range.</td></tr>`}
    </tbody></table></div>`;
  }
  const preset = (label, days) => `<button class="btn secondary sm" data-act="preset" data-v="${days}">${label}</button>`;
  return `<div class="head"><div><h1>Reports</h1><p class="muted">Service hours and attendance for board updates, grant applications, and recognition.</p></div>${err ? "" : exportBar()}</div>
  <div class="card stack no-print">
    <div class="filters">
      <div class="field"><label for="r-from">From</label><input type="date" id="r-from" data-filter="rep.from" value="${f.from}"></div>
      <div class="field"><label for="r-to">To</label><input type="date" id="r-to" data-filter="rep.to" value="${f.to}"></div>
      <div class="field"><label for="r-cat">Cause</label><select id="r-cat" data-filter="rep.cat"><option value="all">All causes</option>${CATS.map(c => `<option ${f.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="field"><label for="r-vol">Volunteer</label><select id="r-vol" data-filter="rep.vol"><option value="all">All volunteers</option>${state.users.filter(u => u.role === "volunteer").sort((a, b) => a.name.localeCompare(b.name)).map(u => `<option value="${u.id}" ${String(f.vol) === String(u.id) ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="r-group">Group by</label><select id="r-group" data-filter="rep.group">${[["volunteer","Volunteer"],["event","Event"],["month","Month"],["category","Cause"]].map(([v, l]) => `<option value="${v}" ${f.group === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    </div>
    <div class="row small"><span class="muted">Quick ranges:</span>${preset("Last 30 days", 30)}${preset("Last 90 days", 90)}${preset("Last 12 months", 365)}</div>
  </div>
  ${body}`;
}

// Pop-up with one event's details, opened from the coordinator calendar.
function eventDetail(e){
  const n = activeRegs(e.id).length, w = waitlistFor(e.id).length;
  return `<div class="spread"><h2>${esc(e.title)}</h2><button class="btn secondary sm" data-act="close">Close</button></div>
    <div class="row"><span class="pill">${esc(e.category)}</span>${e.date < TODAY ? `<span class="pill">Past</span>` : ""}</div>
    <p class="muted">${fmtDate(e.date, {weekday:"long", month:"long", day:"numeric"})} · ${timeRange(e)} · ${esc(e.location)}</p>
    <p>${esc(e.desc)}</p>
    <div class="fillcell">${fillMeter(e)}<span class="num small">${n}/${e.slots} signed up${w ? ` · ${w} on waitlist` : ""}</span></div>
    <div class="row" style="justify-content:flex-end"><button class="btn secondary" data-act="goCheckin" data-id="${e.id}">Open roster</button><button class="btn" data-act="editEvent" data-id="${e.id}">Edit event</button></div>`;
}
