/*
 * views/volunteer.js
 * Screens for volunteers: Home, Find opportunities, My shifts, My hours, and Profile.
 * Each function takes the logged-in user and returns that screen's HTML.
 */
"use strict";

function eventMini(e, right = ""){
  return `<div class="mini">${dateChip(e.date)}<div style="min-width:0"><h3>${esc(e.title)}</h3><p>${timeRange(e)} · ${esc(e.location)}</p></div><div>${right}</div></div>`;
}
function vHome(u){
  const s = userStats(u.id), pct = Math.min(100, Math.round(s.hours / HOUR_GOAL * 100));
  const up = s.upcoming.map(r => eventById(r.eventId)).sort(byDate);
  const recs = state.events.filter(e => e.date >= TODAY && spotsLeft(e) > 0 && !activeRegs(e.id).some(r => r.userId === u.id) && e.skills.some(k => u.skills.includes(k))).sort(byDate).slice(0, 3);
  const next = up[0];
  return `<div class="head"><div><span class="eyebrow">${fmtDate(TODAY, {weekday:"long", month:"long", day:"numeric"})}</span><h1>Welcome back, ${esc(u.name.split(" ")[0])}</h1></div><button class="btn" data-act="nav" data-v="find">Find opportunities</button></div>
  <section class="tiles">
    ${tile("Service hours", fmtH(s.hours), "Approved by coordinators", "hrs")}
    ${tile("Events attended", s.attended, s.noShows ? `${s.noShows} missed` : "No missed shifts")}
    ${tile("Upcoming shifts", up.length, next ? `Next: ${fmtDate(next.date)}` : "Nothing scheduled")}
    <div class="card tile"><span class="lab">Hour goal</span><span class="val">${pct}<small>%</small></span><div class="meter ${pct >= 100 ? "full" : ""}"><span style="width:${pct}%"></span></div><span class="sub">${fmtH(s.hours)} of ${HOUR_GOAL} hours</span></div>
  </section>
  <div class="cols">
    <section class="card"><div class="spread"><h2>Your next shifts</h2><button class="linkbtn small" data-act="nav" data-v="shifts">See all</button></div>
      ${up.length ? up.slice(0, 4).map(e => eventMini(e, `<span class="pill accent">Signed up</span>`)).join("") : `<div class="empty" style="margin-top:12px">You have no upcoming shifts. <button class="linkbtn" data-act="nav" data-v="find">Find one</button></div>`}</section>
    <section class="card"><h2>Recommended for you</h2><p class="muted small">Open shifts that need your skills: ${esc(u.skills.join(", ") || "add skills on your profile")}</p>
      ${recs.length ? recs.map(e => eventMini(e, `<button class="btn sm" data-act="signup" data-id="${e.id}">Sign up</button>`)).join("") : `<div class="empty" style="margin-top:12px">No matching open shifts right now.</div>`}</section>
  </div>`;
}

function vFind(u){
  const f = ui.find, q = f.q.trim().toLowerCase();
  let list = state.events.filter(e => e.date >= TODAY).sort(byDate);
  if (f.cat !== "all") list = list.filter(e => e.category === f.cat);
  if (q) list = list.filter(e => (e.title + " " + e.location + " " + e.desc).toLowerCase().includes(q));
  if (f.match) list = list.filter(e => e.skills.length === 0 || e.skills.some(k => u.skills.includes(k)));
  if (f.hideFull) list = list.filter(e => spotsLeft(e) > 0);
  const card = e => {
    const regs = activeRegs(e.id), mine = regs.some(r => r.userId === u.id), left = e.slots - regs.length;
    const match = e.skills.some(k => u.skills.includes(k));
    return `<article class="card ev">${dateChip(e.date)}
      <div class="ev-body">
        <div class="tags"><span class="pill">${esc(e.category)}</span>${match ? `<span class="pill good">Matches your skills</span>` : ""}${e.date === TODAY ? `<span class="pill mark">Today</span>` : ""}</div>
        <h3>${esc(e.title)}</h3>
        <p class="muted small">${fmtDate(e.date)} · ${timeRange(e)} · ${fmtH(duration(e))} hrs · ${esc(e.location)}</p>
        <p>${esc(e.desc)}</p>
        ${e.skills.length ? `<p class="small"><b>Helpful skills:</b> ${esc(e.skills.join(", "))}</p>` : `<p class="small muted">No special skills needed.</p>`}
      </div>
      <div class="ev-side">
        <div class="spots">${fillMeter(e)}<span>${left > 0 ? `<b>${left}</b> of ${e.slots} spots open` : "<b>Full</b>"}</span></div>
        ${mine ? `<span class="pill good" style="justify-content:center;padding:8px">You're signed up</span>` : left > 0 ? `<button class="btn" data-act="signup" data-id="${e.id}">Sign up</button>` : `<button class="btn" disabled>Full</button>`}
      </div></article>`;
  };
  return `<div class="head"><div><h1>Find opportunities</h1><p class="muted">${list.length} upcoming ${list.length === 1 ? "shift" : "shifts"} match your filters.</p></div></div>
  <div class="card filters" role="search">
    <div class="field grow"><label for="f-q">Search</label><input id="f-q" data-filter="find.q" value="${esc(f.q)}" placeholder="Search by name, place, or description"></div>
    <div class="field"><label for="f-cat">Cause</label><select id="f-cat" data-filter="find.cat"><option value="all">All causes</option>${CATS.map(c => `<option ${f.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
    <label class="toggle-inline"><input type="checkbox" id="f-match" data-filter="find.match" ${f.match ? "checked" : ""}> Matches my skills</label>
    <label class="toggle-inline"><input type="checkbox" id="f-full" data-filter="find.hideFull" ${f.hideFull ? "checked" : ""}> Hide full events</label>
  </div>
  <div class="evlist">${list.length ? list.map(card).join("") : `<div class="empty">No shifts match these filters. Try clearing the search or choosing "All causes".</div>`}</div>`;
}

function vShifts(u){
  const mine = state.regs.filter(r => r.userId === u.id && r.status !== "cancelled").map(r => ({r, e:eventById(r.eventId)}));
  const up = mine.filter(x => x.e.date >= TODAY && x.r.status === "registered").sort((a,b) => byDate(a.e,b.e));
  const past = mine.filter(x => x.e.date < TODAY || x.r.status !== "registered").sort((a,b) => byDate(b.e,a.e));
  return `<div class="head"><div><h1>My shifts</h1><p class="muted">Cancel at least 24 hours ahead when you can so someone else can take your spot.</p></div></div>
  <section class="card"><h2>Upcoming</h2>
    ${up.length ? up.map(({r, e}) => eventMini(e, armBtn(`cancel:${r.id}`, "Cancel", "Confirm cancel"))).join("") : `<div class="empty" style="margin-top:12px">No upcoming shifts. <button class="linkbtn" data-act="nav" data-v="find">Browse opportunities</button></div>`}
  </section>
  <section><h2 style="margin-bottom:10px">History</h2>
    <div class="tablewrap"><table><thead><tr><th>Date</th><th>Event</th><th>Status</th><th class="num">Hours</th></tr></thead><tbody>
    ${past.length ? past.map(({r, e}) => `<tr><td class="num" style="text-align:left">${fmtDate(e.date, {month:"short", day:"numeric", year:"numeric"})}</td><td>${esc(e.title)}<span class="sub">${esc(e.location)}</span></td><td>${e.date < TODAY && r.status === "registered" ? `<span class="pill warn">Awaiting check-in</span>` : statusPill(r.status)}</td><td class="num">${r.status === "attended" ? fmtH(r.hours) : "—"}</td></tr>`).join("") : `<tr><td colspan="4" class="muted">No past shifts yet.</td></tr>`}
    </tbody></table></div></section>`;
}

function vHours(u){
  const rs = state.regs.filter(r => r.userId === u.id && r.status === "attended").map(r => ({r, e:eventById(r.eventId)})).sort((a,b) => byDate(b.e,a.e));
  const total = sum(rs.map(x => x.r.hours));
  const byCat = CATS.map(c => ({label:c, value:sum(rs.filter(x => x.e.category === c).map(x => x.r.hours))})).filter(x => x.value > 0).sort((a,b) => b.value - a.value);
  ui.csv = () => toCSV([["Date","Event","Cause","Location","Hours"], ...rs.map(({r, e}) => [e.date, e.title, e.category, e.location, r.hours]), ["","","","Total", total]]);
  return `<div class="head"><div><h1>My hours</h1><p class="muted">Your verified service record. Hours count once a coordinator checks you in.</p></div><button class="btn secondary" data-act="csv">Copy as CSV</button></div>
  <section class="tiles">${tile("Total hours", fmtH(total), "", "hrs")}${tile("Events", rs.length)}${tile("Average shift", rs.length ? fmtH(total / rs.length) : "0", "", "hrs")}${tile("Goal progress", Math.min(100, Math.round(total / HOUR_GOAL * 100)), `${HOUR_GOAL}-hour goal`, "%")}</section>
  <div class="cols">
    <section class="card stack"><h2>Hours by month</h2>${colChart(hoursByMonth(state.regs.filter(r => r.userId === u.id)), "")}</section>
    <section class="card stack"><h2>Hours by cause</h2>${hbars(byCat, " h")}</section>
  </div>
  <div class="tablewrap"><table><thead><tr><th>Date</th><th>Event</th><th>Cause</th><th class="num">Hours</th></tr></thead><tbody>
    ${rs.length ? rs.map(({r, e}) => `<tr><td>${fmtDate(e.date, {month:"short", day:"numeric", year:"numeric"})}</td><td>${esc(e.title)}</td><td>${esc(e.category)}</td><td class="num">${fmtH(r.hours)}</td></tr>`).join("") : `<tr><td colspan="4" class="muted">No verified hours yet.</td></tr>`}
    ${rs.length ? `<tr><td colspan="3"><b>Total</b></td><td class="num"><b>${fmtH(total)}</b></td></tr>` : ""}
  </tbody></table></div>`;
}

function vProfile(u){
  return `<div class="head"><div><h1>Profile</h1><p class="muted">Your skills and availability help us recommend the right shifts.</p></div></div>
  <form id="profileForm" class="card stack" novalidate style="max-width:720px">
    <div class="grid2">
      <div class="field"><label for="p-name">Full name</label><input id="p-name" name="name" value="${esc(u.name)}"><span class="ferr" id="e-name"></span></div>
      <div class="field"><label for="p-email">Email</label><input id="p-email" value="${esc(u.email)}" disabled><span class="muted small">Contact a coordinator to change your email.</span></div>
      <div class="field"><label for="p-phone">Phone</label><input id="p-phone" name="phone" value="${esc(u.phone)}"><span class="ferr" id="e-phone"></span></div>
    </div>
    <div class="field"><span class="lbl">Skills</span><div class="checks">${SKILLS.map(s => `<label class="check"><input type="checkbox" name="skills" value="${s}" ${u.skills.includes(s) ? "checked" : ""}> ${s}</label>`).join("")}</div></div>
    <div class="field"><span class="lbl">Availability</span><div class="checks">${AVAIL.map(s => `<label class="check"><input type="checkbox" name="availability" value="${s}" ${u.availability.includes(s) ? "checked" : ""}> ${s}</label>`).join("")}</div></div>
    <div class="row"><button class="btn" type="submit">Save profile</button></div>
  </form>`;
}
