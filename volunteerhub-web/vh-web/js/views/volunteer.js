/*
 * Volunteer screens: compact Home, explicit search with optional city-level
 * discovery, expandable service history, Hours & clubs, and Profile.
 * Certificates remain available from the coordinator directory.
 */
"use strict";

// One compact event row: date chip, title, time and place, plus something on the right.
function eventMini(e, right = ""){
  return `<div class="mini">${dateChip(e.date)}<div style="min-width:0"><h3>${esc(e.title)}</h3><p>${timeRange(e)} · ${esc(e.location)}</p></div><div>${right}</div></div>`;
}

// The sign-up button area for one event, based on the user's status for it.
function signupControl(e, u){
  const r = myReg(u.id, e.id), left = spotsLeft(e);
  if (r && r.status === "registered") return `<span class="pill good">You're signed up</span>`;
  if (r && r.status === "waitlist") return `<span class="pill mark">Waitlist #${waitlistPosition(r)}</span>${armBtn(`leave:${r.id}`, "Leave waitlist", "Confirm leave", "secondary sm")}`;
  if (left > 0) return `<button class="btn" data-act="signup" data-id="${e.id}">Sign up</button>`;
  return `<button class="btn secondary" data-act="waitlist" data-id="${e.id}">Join waitlist</button>`;
}

// Show an approximate distance from the chosen city, or the event town.
function placePill(e){
  const o = searchOrigin();
  return o ? `<span class="pill num">${fmtMiles(milesTo(e, o))} away</span>` : `<span class="pill">${esc(placeName(eventZipInfo(e)))}</span>`;
}

// Full event card used on Find opportunities and in the calendar pop-up.
function eventCard(e, u){
  const left = spotsLeft(e), line = waitlistFor(e.id).length;
  const match = e.skills.some(k => u.skills.includes(k));
  const status = e.clubId && clubById(e.clubId) ? `<span class="pill accent">${esc(clubById(e.clubId).short)} members</span>`
    : isVerified(e) ? `<span class="pill good">Verified organizer</span>` : `<span class="pill warn">Unverified organizer</span>`;
  const o = searchOrigin();
  return `<article class="ev">${dateChip(e.date)}
    <div class="ev-body">
      <button class="ev-title" data-act="moreInfo" data-id="${e.id}">${esc(e.title)}</button>
      <p class="ev-meta">${fmtDate(e.date)} · ${timeRange(e)} · ${esc(e.location)}${o ? ` · ${fmtMiles(milesTo(e, o))} away` : ""}</p>
      <div class="tags">${status}${e.date === TODAY ? `<span class="pill mark">Today</span>` : ""}<span class="pill">${esc(e.category)}</span>${match ? `<span class="pill">Matches your skills</span>` : ""}</div>
    </div>
    <div class="ev-side">
      <span class="spots-text">${left > 0 ? `${left} of ${e.slots} spots open` : `Full${line ? ` · ${line} waiting` : ""}`}</span>
      ${signupControl(e, u)}
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
  const s = userStats(u.id), up = s.upcoming.map(r => eventById(r.eventId)).filter(Boolean).sort(byDate);
  const recs = state.events.filter(e => e.date >= TODAY && canSeeEvent(e, u) && isVerified(e) && spotsLeft(e) > 0 && !myReg(u.id, e.id) && e.skills.some(k => u.skills.includes(k))).sort(byDate).slice(0, 3);
  return `<div class="head"><div><h1>Welcome back, ${esc(u.name.split(" ")[0])}</h1></div><button class="btn" data-act="nav" data-v="find">Find opportunities</button></div>
  <dl class="summary-strip">
    <div><dt>Verified service</dt><dd>${fmtH(s.hours)} <span>hours</span></dd><dd class="metric-detail">${progressMeter(s.hours, HOUR_GOAL, "Service hour goal", "progressbar", `${fmtH(s.hours)} of ${HOUR_GOAL} hours`)}<span class="muted small">${HOUR_GOAL}-hour goal</span></dd></div>
    <div><dt>Upcoming shifts</dt><dd>${up.length}</dd><dd class="metric-detail">${up[0] ? `Next: ${fmtDate(up[0].date)}` : "Nothing scheduled yet"}</dd></div>
  </dl>
  <div class="activity-columns">
    <section class="section"><div class="spread"><h2>Your next shifts</h2>${up.length > 3 ? `<button class="linkbtn small" data-act="nav" data-v="shifts">See all ${up.length}</button>` : ""}</div>
      ${up.length ? up.slice(0, 3).map(e => eventMini(e, `<button class="btn secondary sm" data-act="moreInfo" data-id="${e.id}">Details</button>`)).join("") : `<div class="empty">No upcoming shifts. <button class="linkbtn" data-act="nav" data-v="find">Find one</button></div>`}</section>
    <section class="section"><h2>Recommended for you</h2><p class="muted small">Open shifts that match your skills.</p>
      ${recs.length ? recs.map(e => eventMini(e, `<button class="btn sm" data-act="signup" data-id="${e.id}">Sign up</button>`)).join("") : `<div class="empty">${u.skills.length ? "No matching open shifts right now." : `Add skills on your <button class="linkbtn" data-act="nav" data-v="profile">profile</button> to get suggestions.`}</div>`}</section>
  </div>`;
}

function vFind(u){
  const f = ui.find, q = f.q.trim().toLowerCase(), saved = userLocation(u), origin = searchOrigin();
  const canShow = !!saved || !!q || f.cat !== "all";
  let list = state.events.filter(e => e.date >= TODAY && canSeeEvent(e, u)).sort(byDate);
  if (f.cat !== "all") list = list.filter(e => e.category === f.cat);
  if (f.verifiedOnly) list = list.filter(isVerified);
  if (q) list = list.filter(e => [e.title, e.category, e.location, e.desc, addressOf(e)].join(" ").toLowerCase().includes(q));
  if (origin){
    if (f.radius !== "any") list = list.filter(e => milesTo(e, origin) <= +f.radius);
    list.sort((a,b) => milesTo(a, origin) - milesTo(b, origin) || byDate(a,b));
  }
  if (f.match) list = list.filter(e => !e.skills.length || e.skills.some(k => u.skills.includes(k)));
  if (f.hideFull) list = list.filter(e => spotsLeft(e) > 0);
  const chip = e => {
    const r = myReg(u.id,e.id), status = r && r.status === "registered" ? ["mine","Signed up"] : r && r.status === "waitlist" ? ["wait","On waitlist"] : spotsLeft(e) > 0 ? ["open","Spots open"] : ["full","Full"];
    return calChip(e,status[0],status[1]);
  };
  return `<div class="head"><div><h1>Opportunities</h1></div>${canShow ? listCalToggle(f.mode, "find") : ""}</div>
  <form id="findForm" class="filters search-form${saved ? " has-location" : ""}" role="search" novalidate>
    <div class="field grow"><label for="f-q">Search opportunities</label><input id="f-q" name="q" value="${esc(f.q)}" placeholder="Event name, place, or cause" aria-describedby="e-q"><span class="ferr" id="e-q"></span></div>
    <div class="field"><label for="f-cat">Cause</label><select id="f-cat" name="cat"><option value="all">All causes</option>${CATS.map(c => `<option ${f.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
    ${saved ? `${cityField("f-location", placeName(origin || saved), "Search near")}<div class="field"><label for="f-radius">Distance from city center</label><select id="f-radius" name="radius">${[["5","Within about 5 miles"],["10","Within about 10 miles"],["25","Within about 25 miles"],["50","Within about 50 miles"],["any","Any distance"]].map(([v,l]) => `<option value="${v}" ${f.radius === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>` : ""}
    <button class="btn" type="submit">Search</button>
    <div class="filter-checks">
      <label class="toggle-inline"><input type="checkbox" name="verifiedOnly" ${f.verifiedOnly ? "checked" : ""}> Verified organizers only</label>
      <label class="toggle-inline"><input type="checkbox" name="match" ${f.match ? "checked" : ""}> Matches my skills</label>
      <label class="toggle-inline"><input type="checkbox" name="hideFull" ${f.hideFull ? "checked" : ""}> Hide full events</label>
    </div>
    ${!saved ? `<p class="muted small search-hint">Search for an event or place to get started. You can add an optional city or town on your <button class="linkbtn" data-act="nav" data-v="profile">profile</button> for nearby results.</p>` : ""}
  </form>
  ${canShow ? `<section id="search-results" tabindex="-1" aria-labelledby="search-results-title"><h2 id="search-results-title" class="results-heading">${list.length} ${list.length === 1 ? "opportunity" : "opportunities"}${origin ? ` near ${esc(placeName(origin))}` : " found"}</h2>${origin ? `<p class="muted small">Distances are approximate, measured from the city center.</p>` : ""}
    ${f.mode === "calendar" ? calendarView(list, chip) : `<div class="evlist">${list.length ? list.map(e => eventCard(e,u)).join("") : `<div class="empty">No opportunities match. Try a different search${origin ? " or a wider distance" : ""}.</div>`}</div>`}</section>`
    : `<section class="search-start"><h2>What would you like to help with?</h2><p class="muted">Look up an event, a place, or a cause in the search above.</p></section>`}`;
}

function servicePreview(rows){
  return `<ul class="service-preview">${rows.map(({r,e}) => `<li><time datetime="${e.date}">${fmtDate(e.date, {month:"short",day:"numeric"})}</time><span>${esc(e.title)}</span><strong class="num">${fmtH(r.hours)} <span class="muted small">hrs</span></strong></li>`).join("")}</ul>`;
}
function vShifts(u){
  const mine = state.regs.filter(r => r.userId === u.id && r.status !== "cancelled").map(r => ({r,e:eventById(r.eventId)})).filter(x => x.e);
  const up = mine.filter(x => x.e.date >= TODAY && x.r.status === "registered").sort((a,b) => byDate(a.e,b.e));
  const wait = mine.filter(x => x.e.date >= TODAY && x.r.status === "waitlist").sort((a,b) => byDate(a.e,b.e));
  const past = mine.filter(x => x.r.status !== "waitlist" && (x.e.date < TODAY || x.r.status !== "registered")).sort((a,b) => byDate(b.e,a.e));
  const recent = past.filter(x => x.r.status === "attended").slice(0,3);
  return `<div class="head"><div><h1>My schedule</h1></div></div>
  <section class="section"><h2>Upcoming</h2>
    ${up.length ? up.map(({r,e}) => eventMini(e, `<div class="row"><button class="btn secondary sm" data-act="moreInfo" data-id="${e.id}">Details</button>${armBtn(`cancel:${r.id}`, "Cancel", "Confirm cancel")}</div>`)).join("") : `<div class="empty">No upcoming shifts. <button class="linkbtn" data-act="nav" data-v="find">Browse opportunities</button></div>`}
  </section>
  ${wait.length ? `<section class="section"><h2>Waitlist</h2><p class="muted small">If a spot opens, you'll get an update in your Inbox.</p>${wait.map(({r,e}) => eventMini(e, `<div class="row"><span class="pill mark">#${waitlistPosition(r)} in line</span>${armBtn(`leave:${r.id}`, "Leave", "Confirm leave", "secondary sm")}</div>`)).join("")}</section>` : ""}
  <section class="section"><div class="spread"><h2>History</h2><span class="muted small">Last ${recent.length} attended ${recent.length === 1 ? "event" : "events"}</span></div>
    ${recent.length ? servicePreview(recent) : `<p class="muted">No attended events yet.</p>`}
    ${past.length ? `<details class="disclosure" id="schedule-history"><summary>View all ${past.length} past shifts</summary><div class="tablewrap"><table><thead><tr><th>Date</th><th>Event</th><th>Status</th><th class="num">Hours</th></tr></thead><tbody>${past.map(({r,e}) => `<tr><td>${fmtDate(e.date, {month:"short",day:"numeric",year:"numeric"})}</td><td>${esc(e.title)}<span class="sub">${esc(e.location)}</span></td><td>${e.date < TODAY && r.status === "registered" ? `<span class="pill warn">Awaiting check-in</span>` : statusPill(r.status)}</td><td class="num">${r.status === "attended" ? fmtH(r.hours) : "—"}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
  </section>`;
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
  const attended = state.regs.filter(r => r.userId === u.id && r.status === "attended").map(r => ({r,e:eventById(r.eventId)})).filter(x => x.e).sort((a,b) => byDate(b.e,a.e));
  const rs = attended.concat(outsideRows(u.id)).sort((a,b) => byDate(b.e,a.e)), total = sum(rs.map(x => x.r.hours));
  const byCat = [...CATS,"Outside service"].map(c => ({label:c,value:sum(rs.filter(x => x.e.category === c).map(x => x.r.hours))})).filter(x => x.value > 0).sort((a,b) => b.value-a.value);
  const monthly = monthsBack(6).map(key => ({label:monthLabel(key),value:sum(rs.filter(x => monthKey(x.e.date) === key).map(x => x.r.hours))}));
  ui.csv = {name:`volunteer-hours-${u.name.toLowerCase().replace(/\s+/g,"-")}.csv`,build:() => toCSV([["Date","Event","Cause","Location","Hours"],...rs.map(({r,e}) => [e.date,e.title,e.category,e.location,r.hours]),["","","","Total",total]])};
  return `<div class="head"><div><h1>My hours</h1><p class="muted">Verified event hours and approved outside service.</p></div>
    <details class="overflow-menu" id="hours-actions"><summary aria-label="More hour actions">${icon("more")}</summary><div class="overflow-content"><button class="btn secondary" data-act="csvDownload">Download CSV</button></div></details>
  </div>
  <dl class="summary-strip"><div><dt>Total verified hours</dt><dd>${fmtH(total)}</dd><dd class="metric-detail">Includes ${fmtH(approvedOutsideHours(u.id))} approved outside hours</dd></div><div><dt>Hour goal</dt><dd>${Math.floor(progressPercent(total,HOUR_GOAL))}<span>%</span></dd><dd class="metric-detail">${progressMeter(total,HOUR_GOAL,"Service hour goal","progressbar",`${fmtH(total)} of ${HOUR_GOAL} hours`)}<span class="muted small">${HOUR_GOAL} hours${total >= HOUR_GOAL ? " · Complete" : ""}</span></dd></div></dl>
  <section class="section"><div class="spread"><h2>Recent service</h2><span class="muted small">Last ${Math.min(3,attended.length)} attended events</span></div>
    ${attended.length ? hbars(attended.slice(0,3).map(({r,e}) => ({label:`${fmtDate(e.date, {month:"short",day:"numeric"})} · ${e.title}`,value:r.hours}))," hrs") : `<p class="muted">Your last three attended events will appear here after check-in.</p>`}
  </section>
  <details class="disclosure" id="hours-record"><summary>View all hours and breakdowns <span class="muted">(${rs.length} records)</span></summary>
    <div class="activity-columns"><section class="section"><h2>Hours by month</h2>${colChart(monthly)}</section><section class="section"><h2>Hours by cause</h2>${hbars(byCat," hrs")}</section></div>
    <div class="tablewrap"><table><thead><tr><th>Date</th><th>Event</th><th>Cause</th><th class="num">Hours</th></tr></thead><tbody>${rs.length ? rs.map(({r,e}) => `<tr><td>${fmtDate(e.date,{month:"short",day:"numeric",year:"numeric"})}</td><td>${esc(e.title)}</td><td>${esc(e.category)}</td><td class="num">${fmtH(r.hours)}</td></tr>`).join("") : `<tr><td colspan="4">No verified hours yet.</td></tr>`}<tr><td colspan="3">Total</td><td class="num">${fmtH(total)}</td></tr></tbody></table></div>
  </details>`;
}

function vProfile(u){
  return `<div class="head"><div><h1>Profile</h1><p class="muted">Your skills help us suggest shifts. Share a city or town to find opportunities nearby.</p></div></div>
  <form id="profileForm" class="card stack" novalidate style="max-width:720px">
    <div class="grid2">
      <div class="field"><label for="p-name">Full name</label><input id="p-name" name="name" value="${esc(u.name)}"><span class="ferr" id="e-name"></span></div>
      <div class="field"><label for="p-email">Email</label><input id="p-email" value="${esc(u.email)}" disabled><span class="muted small">Contact a coordinator to change your email.</span></div>
      <div class="field"><label for="p-phone">Phone</label><input id="p-phone" name="phone" value="${esc(u.phone)}"><span class="ferr" id="e-phone"></span></div>
      <div class="field"><label for="p-emergency">Emergency contact <span class="muted">(optional)</span></label><input id="p-emergency" name="emergency" maxlength="100" value="${esc(u.emergency || "")}" placeholder="Name and phone, e.g. Ana Chen 555-201-3344"><span class="muted small">Only verified coordinators can see this.</span><span class="ferr" id="e-emergency"></span></div>
      ${cityField("p-location", placeName(userLocation(u)))}
    </div>
    <div class="field"><span class="lbl">Skills</span><div class="checks">${SKILLS.map(s => `<label class="check"><input type="checkbox" name="skills" value="${s}" ${u.skills.includes(s) ? "checked" : ""}> ${s}</label>`).join("")}</div></div>
    <div class="field"><span class="lbl">Availability</span><div class="checks">${AVAIL.map(s => `<label class="check"><input type="checkbox" name="availability" value="${s}" ${u.availability.includes(s) ? "checked" : ""}> ${s}</label>`).join("")}</div></div>
    <div class="row"><button class="btn" type="submit">Save profile</button><button class="btn secondary" type="button" data-act="tour">Replay the tour</button></div>
  </form>
  <section class="card stack" style="max-width:720px">
    <h2>Privacy and your account</h2>
    <p class="muted">${u.waiverAt ? `You accepted the <button class="linkbtn" data-act="waiver">volunteer waiver</button> on ${new Date(u.waiverAt).toLocaleDateString("en-US", {month:"long", day:"numeric", year:"numeric"})}. ` : `Read the <button class="linkbtn" data-act="waiver">volunteer waiver</button>. `}Your phone, saved city or town, and emergency contact are only shown to you and verified coordinators.</p>
    <div class="row">${armBtn("delacct:me", "Delete my account", "Yes, delete it permanently")}</div>
    <p class="muted small">This cancels your upcoming shifts and removes your profile. Hours you've already served stay in the organization's records.</p>
  </section>`;
}
