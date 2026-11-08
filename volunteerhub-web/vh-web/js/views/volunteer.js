/*
 * views/volunteer.js
 * Screens for volunteers: Home, Find opportunities (list or calendar, with ZIP code +
 * distance search and a verified-organizer filter), the event details pop-up, My shifts,
 * My hours (with certificate), and Profile. Each function takes the logged-in user
 * and returns that screen's HTML. eventCard() and certificate() are also used
 * by pop-ups and by the coordinator screens.
 */
"use strict";

// One compact event row: date chip, title, time and place, plus something on the right.
function eventMini(e, right = ""){
  return `<div class="mini">${dateChip(e.date)}<div style="min-width:0"><h3>${esc(e.title)}</h3><p>${timeRange(e)} · ${esc(e.location)}</p></div><div>${right}</div></div>`;
}

// The sign-up button area for one event, based on the user's status for it.
function signupControl(e, u){
  const r = myReg(u.id, e.id), left = spotsLeft(e);
  if (r && r.status === "registered") return `<span class="pill good" style="justify-content:center;padding:8px">You're signed up</span>`;
  if (r && r.status === "waitlist") return `<span class="pill mark" style="justify-content:center;padding:8px">Waitlist #${waitlistPosition(r)}</span>${armBtn(`leave:${r.id}`, "Leave waitlist", "Confirm leave", "secondary sm")}`;
  if (left > 0) return `<button class="btn" data-act="signup" data-id="${e.id}">Sign up</button>`;
  const line = waitlistFor(e.id).length;
  return `<button class="btn secondary" data-act="waitlist" data-id="${e.id}">Join waitlist</button><span class="small muted" style="text-align:center">${line ? `${line} ${line === 1 ? "person" : "people"} waiting` : "Be first in line"}</span>`;
}

// Shows how far away an event is when a ZIP search is active, otherwise its town and ZIP.
function placePill(e){
  const o = searchOrigin();
  return o ? `<span class="pill accent num">${fmtMiles(milesTo(e, o))} away</span>` : `<span class="pill">${esc(eventZipInfo(e).city)} ${esc(eventZipInfo(e).zip)}</span>`;
}

// Full event card used on Find opportunities and in the calendar pop-up.
function eventCard(e, u){
  const regs = activeRegs(e.id), left = e.slots - regs.length;
  const match = e.skills.some(k => u.skills.includes(k));
  return `<article class="card ev">${dateChip(e.date)}
    <div class="ev-body">
      <div class="tags"><span class="pill">${esc(e.category)}</span>${placePill(e)}${e.clubId && clubById(e.clubId) ? `<span class="pill accent">${esc(clubById(e.clubId).short)} members</span>` : isVerified(e) ? `<span class="pill good">✓ Verified organizer</span>` : `<span class="pill warn">⚠ Unverified organizer</span>`}${match ? `<span class="pill accent">Matches your skills</span>` : ""}${e.date === TODAY ? `<span class="pill mark">Today</span>` : ""}</div>
      <h3>${esc(e.title)}</h3>
      <p class="muted small">${fmtDate(e.date)} · ${timeRange(e)} · ${fmtH(duration(e))} hrs · ${esc(e.location)}</p>
      <p>${esc(e.desc)}</p>
      <p class="small muted">${e.minAge ? `Ages ${e.minAge}+ · ` : ""}Posted by ${esc(posterOf(e).name)}${posterOf(e).org ? `, ${esc(posterOf(e).org)}` : ""}</p>
    </div>
    <div class="ev-side">
      <div class="spots">${fillMeter(e)}<span>${left > 0 ? `<b>${left}</b> of ${e.slots} spots open` : "<b>Full</b>"}</span></div>
      ${signupControl(e, u)}
      <button class="btn secondary sm" data-act="moreInfo" data-id="${e.id}">More info</button>
    </div></article>`;
}

// Full details pop-up for one event: trust check, practical details, who's going, and actions.
function volunteerEventPopup(e, u){
  const going = activeRegs(e.id).length, left = spotsLeft(e), r = myReg(u.id, e.id);
  return `<div class="spread"><h2>${esc(e.title)}</h2><button class="btn secondary sm" data-act="close">Close</button></div>
    <div class="tags"><span class="pill">${esc(e.category)}</span>${placePill(e)}${e.date === TODAY ? `<span class="pill mark">Today</span>` : ""}</div>
    <p><b>${fmtDate(e.date, {weekday:"long", month:"long", day:"numeric"})}</b> · ${timeRange(e)}</p>
    <p>${esc(e.desc)}</p>
    ${trustBox(e)}
    ${eventFacts(e)}
    <div class="going"><div class="fillcell">${fillMeter(e)}<span class="small num">${going} of ${e.slots} volunteers going${left > 0 ? ` · ${left} ${left === 1 ? "spot" : "spots"} left` : ""}${waitlistFor(e.id).length ? ` · ${waitlistFor(e.id).length} on waitlist` : ""}</span></div></div>
    <div class="popup-actions">
      <div class="row">${signupControl(e, u).replace(/style="[^"]*"/g, "")}</div>
      <div class="row">${r && r.status === "registered" ? `<button class="btn secondary" data-act="ics" data-id="${e.id}">Add to my calendar</button>` : ""}<button class="linkbtn small" data-act="concern" data-id="${e.id}">Report a concern</button></div>
    </div>`;
}

// Form to report a listing that looks wrong, unsafe, or like a scam.
function concernForm(e){
  const reasons = ["Asks for money, bank details, or ID numbers", "Doesn't seem like a real organization", "Feels unsafe", "Wrong date, time, or place", "Something else"];
  return `<form id="concernForm" class="stack" novalidate data-id="${e.id}">
    <div class="spread"><h2>Report a concern</h2><button type="button" class="btn secondary sm" data-act="moreInfo" data-id="${e.id}">Back</button></div>
    <p class="muted">About <b>${esc(e.title)}</b> on ${fmtDate(e.date)}. A coordinator will review it. Your report isn't shown to the organizer by name.</p>
    <div class="field"><span class="lbl">What's wrong?</span><div class="stack" role="radiogroup">${reasons.map((r, i) => `<label class="check" style="border-radius:10px"><input type="radio" name="reason" value="${esc(r)}" ${i === 0 ? "" : ""}> ${esc(r)}</label>`).join("")}</div><span class="ferr" id="e-reason"></span></div>
    <div class="field"><label for="cf-details">Details <span class="muted">(required for "Something else")</span></label><textarea id="cf-details" name="details" rows="3" maxlength="500"></textarea><span class="ferr" id="e-details"></span></div>
    <p class="small muted">If you're ever in danger, call 911 first.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn" type="submit">Send report</button></div>
  </form>`;
}

function vHome(u){
  const s = userStats(u.id), pct = Math.min(100, Math.round(s.hours / HOUR_GOAL * 100));
  const up = s.upcoming.map(r => eventById(r.eventId)).sort(byDate);
  const soon = up.filter(e => { const h = hoursUntil(e); return h > -duration(e) && h <= 72; });   // shifts in the next 3 days
  const recs = state.events.filter(e => e.date >= TODAY && canSeeEvent(e, u) && isVerified(e) && spotsLeft(e) > 0 && !myReg(u.id, e.id) && e.skills.some(k => u.skills.includes(k))).sort(byDate).slice(0, 3);
  const notes = noticesFor(u.id).filter(n => !n.read);
  const seen = readSet(u.id), news = announcementsFor(u).slice(0, 2);
  const next = up[0];
  const when = e => { const h = hoursUntil(e); return h <= 0 ? "is happening now" : e.date === TODAY ? `starts today at ${fmtTime(e.start)}` : `starts ${fmtDate(e.date, {weekday:"long"})} at ${fmtTime(e.start)}`; };
  return `<div class="head"><div><span class="eyebrow">${fmtDate(TODAY, {weekday:"long", month:"long", day:"numeric"})}</span><h1>Welcome back, ${esc(u.name.split(" ")[0])}</h1></div><button class="btn" data-act="nav" data-v="find">Find opportunities</button></div>
  ${soon.map(e => `<div class="banner reminder"><span class="banner-icon" aria-hidden="true">⏰</span><div><b>Reminder: ${esc(e.title)} ${when(e)}.</b><span>${esc(e.location)} · ${timeRange(e)}. Can't make it? Cancel in My shifts so someone on the waitlist can go.</span></div></div>`).join("")}
  ${notes.map(n => `<div class="banner notice"><span class="banner-icon" aria-hidden="true">✓</span><div><b>${esc(n.text)}</b><span>${new Date(n.at).toLocaleDateString("en-US", {month:"short", day:"numeric"})}</span></div><button class="btn secondary sm" data-act="dismiss" data-id="${n.id}">Dismiss</button></div>`).join("")}
  <section class="tiles">
    ${tile("Service hours", fmtH(s.hours), "Approved by coordinators", "hrs")}
    ${tile("Events attended", s.attended, s.noShows ? `${s.noShows} missed` : "No missed shifts")}
    ${tile("Upcoming shifts", up.length, next ? `Next: ${fmtDate(next.date)}` : s.waitlisted.length ? `${s.waitlisted.length} on waitlist` : "Nothing scheduled")}
    <div class="card tile"><span class="lab">Hour goal</span><span class="val">${pct}<small>%</small></span><div class="meter ${pct >= 100 ? "full" : ""}"><span style="width:${pct}%"></span></div><span class="sub">${fmtH(s.hours)} of ${HOUR_GOAL} hours</span></div>
  </section>
  <div class="cols">
    <section class="card"><div class="spread"><h2>Your next shifts</h2><button class="linkbtn small" data-act="nav" data-v="shifts">See all</button></div>
      ${up.length ? up.slice(0, 4).map(e => eventMini(e, `<button class="btn secondary sm" data-act="moreInfo" data-id="${e.id}">Details</button>`)).join("") : `<div class="empty" style="margin-top:12px">You have no upcoming shifts. <button class="linkbtn" data-act="nav" data-v="find">Find one</button></div>`}</section>
    <section class="card"><h2>Recommended for you</h2><p class="muted small">Open shifts that need your skills: ${esc(u.skills.join(", ") || "add skills on your profile")}</p>
      ${recs.length ? recs.map(e => eventMini(e, `<button class="btn sm" data-act="signup" data-id="${e.id}">Sign up</button>`)).join("") : `<div class="empty" style="margin-top:12px">No matching open shifts right now.</div>`}</section>
  </div>
  <section class="card stack"><div class="spread"><h2>Announcements</h2><button class="linkbtn small" data-act="nav" data-v="news">See all</button></div>
    ${news.length ? news.map(a => `<div class="ann-mini">${seen.has(a.id) ? "" : `<span class="pill mark">New</span>`}<div><b>${esc(a.title)}</b><p class="muted small">${esc(a.body)}</p></div></div>`).join("") : `<div class="empty">No announcements yet.</div>`}</section>`;
}

function vFind(u){
  const f = ui.find, q = f.q.trim().toLowerCase();
  if (f.zip === null) f.zip = u.zip || "";                   // start from the volunteer's saved ZIP
  const zipTyped = String(f.zip).trim(), zipMsg = zipTyped.length >= 5 || /\D/.test(zipTyped) ? zipError(zipTyped) : "";
  const origin = searchOrigin();
  let list = state.events.filter(e => e.date >= TODAY && canSeeEvent(e, u)).sort(byDate);
  if (f.cat !== "all") list = list.filter(e => e.category === f.cat);
  if (f.verifiedOnly) list = list.filter(isVerified);
  if (q) list = list.filter(e => (e.title + " " + e.location + " " + e.desc + " " + addressOf(e)).toLowerCase().includes(q));
  if (origin){
    if (f.radius !== "any") list = list.filter(e => milesTo(e, origin) <= +f.radius);
    list.sort((a, b) => milesTo(a, origin) - milesTo(b, origin) || byDate(a, b));   // nearest first
  }
  if (f.match) list = list.filter(e => e.skills.length === 0 || e.skills.some(k => u.skills.includes(k)));
  if (f.hideFull) list = list.filter(e => spotsLeft(e) > 0);
  const chip = e => { const r = myReg(u.id, e.id);
    if (r && r.status === "registered") return calChip(e, "mine", "signed up");
    if (r && r.status === "waitlist") return calChip(e, "wait", "on waitlist");
    return spotsLeft(e) > 0 ? calChip(e, "open", "open") : calChip(e, "full", "full"); };
  const legend = `<div class="cal-legend small"><span><i class="sw mine"></i>Signed up</span><span><i class="sw open"></i>Open</span><span><i class="sw wait"></i>On waitlist</span><span><i class="sw full"></i>Full</span></div>`;
  const hiddenUnverified = f.verifiedOnly ? state.events.filter(e => e.date >= TODAY && !isVerified(e)).length : 0;
  return `<div class="head"><div><h1>Find opportunities</h1><p class="muted">${list.length} upcoming ${list.length === 1 ? "shift" : "shifts"}${origin ? ` ${f.radius === "any" ? "sorted by distance from" : `within ${f.radius} miles of`} ${esc(origin.zip)} (${esc(placeName(origin))}), nearest first.` : " match your filters."}${hiddenUnverified ? ` ${hiddenUnverified} from unverified organizers ${hiddenUnverified === 1 ? "is" : "are"} hidden.` : ""}</p></div>${listCalToggle(f.mode, "find")}</div>
  <div class="card filters" role="search">
    <div class="field grow"><label for="f-q">Search</label><input id="f-q" data-filter="find.q" value="${esc(f.q)}" placeholder="Search by name, place, or description"></div>
    <div class="field"><label for="f-cat">Cause</label><select id="f-cat" data-filter="find.cat"><option value="all">All causes</option>${CATS.map(c => `<option ${f.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
    <div class="field zipfield"><label for="f-zip">ZIP code</label><input id="f-zip" data-filter="find.zip" value="${esc(f.zip)}" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="e.g. 20001" ${zipMsg ? 'aria-invalid="true" aria-describedby="f-zip-err"' : ""}><span class="ferr" id="f-zip-err">${esc(zipMsg)}</span></div>
    <div class="field"><label for="f-radius">Distance</label><select id="f-radius" data-filter="find.radius" ${origin ? "" : "disabled"}>${[["5","Within 5 miles"],["10","Within 10 miles"],["25","Within 25 miles"],["50","Within 50 miles"],["any","Any distance"]].map(([v, l]) => `<option value="${v}" ${f.radius === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="filter-checks">
      <label class="toggle-inline"><input type="checkbox" id="f-verified" data-filter="find.verifiedOnly" ${f.verifiedOnly ? "checked" : ""}> Verified organizers only</label>
      <label class="toggle-inline"><input type="checkbox" id="f-match" data-filter="find.match" ${f.match ? "checked" : ""}> Matches my skills</label>
      <label class="toggle-inline"><input type="checkbox" id="f-full" data-filter="find.hideFull" ${f.hideFull ? "checked" : ""}> Hide full events</label>
    </div>
  </div>
  ${f.mode === "calendar" ? calendarView(list, chip, legend)
    : `<div class="evlist">${list.length ? list.map(e => eventCard(e, u)).join("") : `<div class="empty">${origin && f.radius !== "any" ? `No shifts within ${f.radius} miles of ${esc(origin.zip)}. Try a larger distance.` : `No shifts match these filters. Try clearing the search or choosing "All causes".`}</div>`}</div>`}`;
}

function vShifts(u){
  const mine = state.regs.filter(r => r.userId === u.id && r.status !== "cancelled").map(r => ({r, e:eventById(r.eventId)}));
  const up = mine.filter(x => x.e.date >= TODAY && x.r.status === "registered").sort((a, b) => byDate(a.e, b.e));
  const wait = mine.filter(x => x.e.date >= TODAY && x.r.status === "waitlist").sort((a, b) => byDate(a.e, b.e));
  const past = mine.filter(x => x.r.status !== "waitlist" && (x.e.date < TODAY || x.r.status !== "registered")).sort((a, b) => byDate(b.e, a.e));
  return `<div class="head"><div><h1>My shifts</h1><p class="muted">Cancel at least 24 hours ahead when you can. The first person on the waitlist gets your spot automatically.</p></div></div>
  <section class="card"><h2>Upcoming</h2>
    ${up.length ? up.map(({r, e}) => eventMini(e, `<div class="row" style="justify-content:flex-end"><button class="btn secondary sm" data-act="moreInfo" data-id="${e.id}">Details</button>${armBtn(`cancel:${r.id}`, "Cancel", "Confirm cancel")}</div>`)).join("") : `<div class="empty" style="margin-top:12px">No upcoming shifts. <button class="linkbtn" data-act="nav" data-v="find">Browse opportunities</button></div>`}
  </section>
  ${wait.length ? `<section class="card"><h2>Waitlist</h2><p class="muted small">You'll be signed up automatically if a spot opens, and you'll see an update on your Home page.</p>
    ${wait.map(({r, e}) => eventMini(e, `<div class="row" style="justify-content:flex-end"><span class="pill mark">#${waitlistPosition(r)} in line</span>${armBtn(`leave:${r.id}`, "Leave", "Confirm leave", "secondary sm")}</div>`)).join("")}</section>` : ""}
  <section><h2 style="margin-bottom:10px">History</h2>
    <div class="tablewrap"><table><thead><tr><th>Date</th><th>Event</th><th>Status</th><th class="num">Hours</th></tr></thead><tbody>
    ${past.length ? past.map(({r, e}) => `<tr><td>${fmtDate(e.date, {month:"short", day:"numeric", year:"numeric"})}</td><td>${esc(e.title)}<span class="sub">${esc(e.location)}</span></td><td>${e.date < TODAY && r.status === "registered" ? `<span class="pill warn">Awaiting check-in</span>` : statusPill(r.status)}</td><td class="num">${r.status === "attended" ? fmtH(r.hours) : "—"}</td></tr>`).join("") : `<tr><td colspan="4" class="muted">No past shifts yet.</td></tr>`}
    </tbody></table></div></section>`;
}

// Verified-hours certificate for one volunteer, shown in a printable pop-up.
// Approved outside service, shaped like event sign-ups so hours lists and certificates can include it.
const outsideRows = uid => state.hourLogs.filter(l => l.userId === uid && l.status === "approved")
  .map(l => ({r:{hours:l.hours}, e:{date:l.date, start:"00:00", title:`${l.place} (outside service)`, category:"Outside service", location:l.place}}));

function certificate(u){
  const rs = state.regs.filter(r => r.userId === u.id && r.status === "attended").map(r => ({r, e:eventById(r.eventId)})).concat(outsideRows(u.id)).sort((a, b) => byDate(a.e, b.e));
  const total = sum(rs.map(x => x.r.hours));
  const byCat = [...CATS, "Outside service"].map(c => ({c, h:sum(rs.filter(x => x.e.category === c).map(x => x.r.hours))})).filter(x => x.h > 0);
  const range = rs.length ? `${fmtDate(rs[0].e.date, {month:"long", day:"numeric", year:"numeric"})} through ${fmtDate(rs[rs.length - 1].e.date, {month:"long", day:"numeric", year:"numeric"})}` : "";
  const certNo = `${orgCode()}-${new Date().getFullYear()}-${String(u.id).padStart(4, "0")}`;
  return `<div class="spread no-print"><h2>Service certificate</h2><div class="row"><button class="btn" data-act="printCert">Print certificate</button><button class="btn secondary" data-act="close">Close</button></div></div>
  <div class="cert">
    <div class="cert-top">${LOGO}<span>${esc(state.org.name)}</span></div>
    <p class="cert-kicker">Certificate of Volunteer Service</p>
    <p class="cert-presented">This certifies that</p>
    <p class="cert-name">${esc(u.name)}</p>
    ${rs.length ? `<p class="cert-body">completed <b>${fmtH(total)} hours</b> of verified volunteer service with ${esc(state.org.name)} across <b>${rs.length} ${rs.length === 1 ? "event" : "events"}</b>, from ${range}.</p>
    <div class="cert-break">${byCat.map(x => `<span><b>${fmtH(x.h)}</b> hrs ${esc(x.c)}</span>`).join("")}</div>` : `<p class="cert-body">has no verified volunteer hours yet.</p>`}
    <div class="cert-sign"><div><span class="cert-line"></span>${esc(coordinatorName())}<small>Volunteer Coordinator</small></div><div><span class="cert-line"></span>${fmtDate(TODAY, {month:"long", day:"numeric", year:"numeric"})}<small>Date issued</small></div></div>
    <p class="cert-no">Certificate no. ${certNo} · Hours verified through check-in records</p>
  </div>`;
}

function vHours(u){
  const rs = state.regs.filter(r => r.userId === u.id && r.status === "attended").map(r => ({r, e:eventById(r.eventId)})).concat(outsideRows(u.id)).sort((a, b) => byDate(b.e, a.e));
  const total = sum(rs.map(x => x.r.hours));
  const byCat = [...CATS, "Outside service"].map(c => ({label:c, value:sum(rs.filter(x => x.e.category === c).map(x => x.r.hours))})).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
  ui.csv = {name:`volunteer-hours-${u.name.toLowerCase().replace(/\s+/g, "-")}.csv`, build:() => toCSV([["Date","Event","Cause","Location","Hours"], ...rs.map(({r, e}) => [e.date, e.title, e.category, e.location, r.hours]), ["","","","Total", total]])};
  return `<div class="head"><div><h1>My hours</h1><p class="muted">Your verified service record. Hours count once a coordinator checks you in.</p></div>
    <div class="row no-print"><button class="btn" data-act="cert" data-id="${u.id}">View certificate</button>${exportBar()}</div></div>
  <section class="tiles">${tile("Total hours", fmtH(total), "", "hrs")}${tile("Events", rs.length)}${tile("Average shift", rs.length ? fmtH(total / rs.length) : "0", "", "hrs")}${tile("Goal progress", Math.min(100, Math.round(total / HOUR_GOAL * 100)), `${HOUR_GOAL}-hour goal`, "%")}</section>
  <div class="cols">
    <section class="card stack"><h2>Hours by month</h2>${colChart(hoursByMonth(state.regs.filter(r => r.userId === u.id)))}</section>
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
      <div class="field"><label for="p-emergency">Emergency contact <span class="muted">(optional)</span></label><input id="p-emergency" name="emergency" maxlength="100" value="${esc(u.emergency || "")}" placeholder="Name and phone, e.g. Ana Chen 555-201-3344"><span class="muted small">Only verified coordinators can see this.</span><span class="ferr" id="e-emergency"></span></div>
      <div class="field"><label for="p-zip">Home ZIP code <span class="muted">(optional)</span></label><input id="p-zip" name="zip" inputmode="numeric" maxlength="5" value="${esc(u.zip || "")}" placeholder="e.g. 20001"><span class="muted small">Used to show shifts near you first.</span><span class="ferr" id="e-zip"></span></div>
    </div>
    <div class="field"><span class="lbl">Skills</span><div class="checks">${SKILLS.map(s => `<label class="check"><input type="checkbox" name="skills" value="${s}" ${u.skills.includes(s) ? "checked" : ""}> ${s}</label>`).join("")}</div></div>
    <div class="field"><span class="lbl">Availability</span><div class="checks">${AVAIL.map(s => `<label class="check"><input type="checkbox" name="availability" value="${s}" ${u.availability.includes(s) ? "checked" : ""}> ${s}</label>`).join("")}</div></div>
    <div class="row"><button class="btn" type="submit">Save profile</button><button class="btn secondary" type="button" data-act="tour">Replay the tour</button></div>
  </form>
  <section class="card stack" style="max-width:720px">
    <h2>Privacy and your account</h2>
    <p class="muted">${u.waiverAt ? `You accepted the <button class="linkbtn" data-act="waiver">volunteer waiver</button> on ${new Date(u.waiverAt).toLocaleDateString("en-US", {month:"long", day:"numeric", year:"numeric"})}. ` : `Read the <button class="linkbtn" data-act="waiver">volunteer waiver</button>. `}Your phone, ZIP code, and emergency contact are only shown to you and verified coordinators.</p>
    <div class="row">${armBtn("delacct:me", "Delete my account", "Yes, delete it permanently")}</div>
    <p class="muted small">This cancels your upcoming shifts and removes your profile. Hours you've already served stay in the organization's records.</p>
  </section>`;
}
