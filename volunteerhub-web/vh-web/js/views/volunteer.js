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
  if (left > 0) return `<button class="btn" data-act="signup" data-id="${esc(e.id)}" aria-label="Sign up for ${esc(e.title)}">Sign up</button>`;
  return `<button class="btn secondary" data-act="waitlist" data-id="${esc(e.id)}">Join waitlist</button>`;
}

// One reading order for public shifts and a volunteer's commitments.
function shiftRow(e, action = "", meta = ""){
  return `<li class="shift-row">
    <div class="shift-copy">
      <h3><button class="linkbtn" type="button" data-act="moreInfo" data-id="${esc(e.id)}">${esc(e.title)}</button></h3>
      <div class="shift-when"><time datetime="${esc(e.date)}">${fmtDate(e.date, {weekday:"short", month:"short", day:"numeric", year:e.date.slice(0,4) === TODAY.slice(0,4) ? undefined : "numeric"})}</time><span>${timeRange(e)}</span></div>
      <p class="shift-place">${esc(e.location)}</p>
      ${e.desc ? `<p class="shift-description">${esc(e.desc)}</p>` : ""}
    </div>
    ${action || meta ? `<div class="shift-actions">${meta}${action}</div>` : ""}
  </li>`;
}

function volunteerEventPopup(e, u){
  const r = myReg(u.id, e.id), upcoming = !eventHasEnded(e) && !["attended","no-show"].includes(r?.status);
  const registered = upcoming && r?.status === "registered";
  const action = registered ? armBtn(`cancel:${r.id}`, "Cancel sign-up", "Confirm cancel") : upcoming ? signupControl(e, u) : "";
  const place = venueOf(e), address = eventHasLocation(e) ? addressOf(e) : "", organizer = posterOf(e);
  const origin = searchOrigin();
  return `<div class="spread"><h2>${esc(e.title)}</h2><button class="btn secondary sm" data-act="close">Close</button></div>
    <div class="shift-when"><time datetime="${esc(e.date)}">${fmtDate(e.date, {weekday:"long", month:"long", day:"numeric", year:"numeric"})}</time><span>${timeRange(e)}</span></div>
    <div><p class="shift-place">${esc(e.location)}</p>${address ? `<p class="muted">${esc(address)}</p>` : ""}
      ${origin && eventHasLocation(e) ? `<p class="muted small">${fmtMiles(milesTo(e, origin))} from ${esc(placeName(origin))}</p>` : ""}</div>
    ${e.desc ? `<p class="shift-description">${esc(e.desc)}</p>` : ""}
    ${isVerified(e) ? "" : trustBox(e)}
    ${e.minAge || e.bring || e.wear ? `<div class="section">${e.minAge ? `<p><b>Minimum age:</b> ${e.minAge}${e.minAge < 18 ? ". Under 18 needs a parent or guardian signature at check-in." : ""}</p>` : ""}${e.bring ? `<p><b>Bring:</b> ${esc(e.bring)}</p>` : ""}${e.wear ? `<p><b>Wear:</b> ${esc(e.wear)}</p>` : ""}</div>` : ""}
    <details class="disclosure event-details"><summary>Organizer and access details</summary>
      <p>${esc(organizer.name)}${organizer.org ? `, ${esc(organizer.org)}` : ""}${isVerified(e) ? " (verified organizer)" : ""}</p>
      ${organizer.email ? `<p>${esc(organizer.email)}</p>` : ""}${organizer.phone ? `<p>${esc(organizer.phone)}</p>` : ""}
      ${place.parking ? `<p><b>Parking:</b> ${esc(place.parking)}</p>` : ""}${place.access ? `<p><b>Accessibility:</b> ${esc(place.access)}</p>` : ""}
      ${e.skills.length ? `<p><b>Helpful skills:</b> ${esc(e.skills.join(", "))}</p>` : ""}
      <button class="linkbtn small" data-act="concern" data-id="${esc(e.id)}">Report a concern</button>
    </details>
    <div class="popup-actions">
      <div class="row">${registered ? "<strong>You're signed up</strong>" : ""}${action}</div>
      ${registered ? `<button class="btn secondary" data-act="ics" data-id="${esc(e.id)}">Add to my calendar</button>` : ""}
    </div>`;
}

// Form to report a listing that looks wrong, unsafe, or like a scam.
function concernForm(e){
  const reasons = ["Asks for money, bank details, or ID numbers", "Doesn't seem like a real organization", "Feels unsafe", "Wrong date, time, or place", "Something else"];
  return `<form id="concernForm" class="stack" novalidate data-id="${esc(e.id)}">
    <div class="spread"><h2>Report a concern</h2><button type="button" class="btn secondary sm" data-act="moreInfo" data-id="${esc(e.id)}">Back</button></div>
    <p class="muted">About <b>${esc(e.title)}</b> on ${fmtDate(e.date)}. Site admins review reports. Organizers without admin access cannot see them.</p>
    <div class="field"><span class="lbl">What's wrong?</span><div class="stack" role="radiogroup">${reasons.map((r, i) => `<label class="check" style="border-radius:10px"><input type="radio" name="reason" value="${esc(r)}" ${i === 0 ? "" : ""}> ${esc(r)}</label>`).join("")}</div><span class="ferr" id="e-reason"></span></div>
    <div class="field"><label for="cf-details">Details <span class="muted">(required for "Something else")</span></label><textarea id="cf-details" name="details" rows="3" maxlength="500"></textarea><span class="ferr" id="e-details"></span></div>
    <p class="small muted">If you're ever in danger, call 911 first.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn" type="submit">Send report</button></div>
  </form>`;
}

function vFind(u){
  const f = ui.find, q = f.q.trim().toLowerCase(), saved = userLocation(u), origin = searchOrigin();
  const canShow = !!saved || !!q || f.cat !== "all";
  let list = state.events.filter(e => canSignUpFor(e, u)).sort(byDate);
  if (f.cat !== "all") list = list.filter(e => e.category === f.cat);
  if (q) list = list.filter(e => [e.title, e.category, e.location, e.desc, eventHasLocation(e) ? addressOf(e) : ""].join(" ").toLowerCase().includes(q));
  if (origin){
    const distances = new Map(list.filter(eventHasLocation).map(e => [e.id, milesTo(e, origin)]));
    if (f.radius !== "any") list = list.filter(e => distances.get(e.id) <= +f.radius);
    list.sort((a,b) => ((distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity)) || byDate(a,b));
  }
  return `<header class="head"><h1>Opportunities</h1></header>
  <form id="findForm" class="search-form" role="search" novalidate>
    <div class="opportunity-search">
      <div class="field"><label for="f-q">Search opportunities</label><input id="f-q" name="q" maxlength="120" value="${esc(f.q)}" placeholder="Event name, place, or cause" aria-describedby="e-q"><span class="ferr" id="e-q"></span></div>
      <div class="field"><label for="f-cat">Cause</label><select id="f-cat" name="cat"><option value="all">All causes</option>${CATS.map(c => `<option ${f.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <button class="btn" type="submit">Search</button>
    </div>
    ${saved ? `<details class="disclosure location-filters" id="nearby-filters"><summary>Location filters<span class="muted">${esc(placeName(origin || saved))}${f.radius === "any" ? ", any distance" : `, within ${f.radius} miles`}</span></summary>
      <div class="grid2">${cityField("f-location", placeName(origin || saved), "Search near")}<div class="field"><label for="f-radius">Distance from city center</label><select id="f-radius" name="radius">${[["5","Within about 5 miles"],["10","Within about 10 miles"],["25","Within about 25 miles"],["50","Within about 50 miles"],["any","Any distance"]].map(([v,l]) => `<option value="${v}" ${f.radius === v ? "selected" : ""}>${l}</option>`).join("")}</select></div></div>
    </details>` : `<p class="muted small">Add a city or town in your <a href="#profile" data-act="nav" data-v="profile">profile</a> to search nearby.</p>`}
  </form>
  ${canShow ? `<section id="search-results" class="section" tabindex="-1" aria-labelledby="search-results-title"><h2 id="search-results-title">${list.length} ${list.length === 1 ? "open shift" : "open shifts"}</h2>
    ${list.length ? `<ul class="shift-list" id="open-shifts">${list.map(e => shiftRow(e,signupControl(e,u))).join("")}</ul>` : `<p class="empty">No open shifts match. Try a different search${origin ? " or a wider distance" : ""}.</p>`}</section>`
    : `<p class="muted">Search for an event, a place, or choose a cause to see available shifts.</p>`}`;
}

function vShifts(u){
  const records = state.regs.filter(r => r.userId === u.id).map(r => ({r,e:eventById(r.eventId)})).filter(x => x.e);
  const up = records.filter(({r,e}) => r.status === "registered" && !eventHasEnded(e)).sort((a,b) => byDate(a.e,b.e));
  const wait = records.filter(({r,e}) => r.status === "waitlist" && !eventHasEnded(e)).sort((a,b) => byDate(a.e,b.e));
  const past = records.filter(({r,e}) => eventHasEnded(e) || r.status === "attended" || r.status === "no-show").sort((a,b) => byDate(b.e,a.e));
  const status = {registered:"Awaiting check-in", attended:"Attended", "no-show":"Missed", waitlist:"Waitlisted", cancelled:"Cancelled"};
  return `<header class="head"><h1>My schedule</h1></header>
  <section class="section" aria-labelledby="upcoming-shifts-title">
    <div class="spread"><h2 id="upcoming-shifts-title">Upcoming shifts</h2>${up.length ? listCalToggle(ui.shifts.mode, "shifts") : ""}</div>
    ${!up.length ? `<p class="empty">No upcoming shifts. <a href="#find" data-act="nav" data-v="find">Find opportunities</a></p>`
      : ui.shifts.mode === "calendar" ? calendarView(up.map(x => x.e), e => calChip(e,"mine","Signed up"))
      : `<ol id="upcoming-shifts" class="shift-list">${up.map(({r,e}) => shiftRow(e,armBtn(`cancel:${r.id}`, "Cancel sign-up", "Confirm cancel", "secondary sm"))).join("")}</ol>`}
  </section>
  ${wait.length ? `<section class="section"><h2>Waitlist</h2><ul class="shift-list">${wait.map(({r,e}) => shiftRow(e,armBtn(`leave:${r.id}`, "Leave waitlist", "Confirm leave", "secondary sm"),`<span class="small muted">#${waitlistPosition(r)} in line</span>`)).join("")}</ul></section>` : ""}
  <section class="section" aria-labelledby="past-shifts-title"><h2 id="past-shifts-title">Past shifts</h2>
    ${past.length ? `<details class="disclosure history-disclosure" id="schedule-history"><summary>View all ${past.length} past ${past.length === 1 ? "shift" : "shifts"}</summary>
      <ol class="shift-list">${past.map(({r,e}) => shiftRow(e,"",`<span class="small muted">${status[r.status] || ""}</span>`)).join("")}</ol></details>`
      : `<p class="muted">No past shifts yet.</p>`}</section>`;
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

function serviceLedger(rows){
  return `<ol class="service-preview service-ledger">${rows.map(({r,e}) => `<li>
    <time datetime="${esc(e.date)}">${fmtDate(e.date, {month:"short",day:"numeric",year:"numeric"})}</time>
    <span>${esc(e.title)}</span><strong class="num">${fmtH(r.hours)} <span class="muted small">hrs</span></strong>
  </li>`).join("")}</ol>`;
}

function vHours(u){
  const attended = state.regs.filter(r => r.userId === u.id && r.status === "attended").map(r => ({r,e:eventById(r.eventId)})).filter(x => x.e);
  const rs = attended.concat(outsideRows(u.id)).sort((a,b) => byDate(b.e,a.e)), total = sum(rs.map(x => x.r.hours));
  const recent = rs.slice(0,5), older = rs.slice(recent.length);
  ui.csv = {name:`volunteer-hours-${u.name.toLowerCase().replace(/\s+/g,"-")}.csv`,build:() => toCSV([["Date","Event","Cause","Location","Hours"],...rs.map(({r,e}) => [e.date,e.title,e.category,e.location,r.hours]),["","","","Total",total]])};
  return `<header class="head"><h1>My hours</h1><button class="btn" data-act="csvDownload">${icon("download")}Download CSV</button></header>
  <section class="hours-overview" aria-labelledby="verified-hours-title">
    <div><h2 id="verified-hours-title">Verified service</h2><p class="hours-total"><strong class="num">${fmtH(total)}</strong> hours</p>
      <p class="muted small">${fmtH(sum(attended.map(x => x.r.hours)))} from events and ${fmtH(approvedOutsideHours(u.id))} from approved outside service</p></div>
    <div class="hours-goal"><p>Progress toward ${HOUR_GOAL} hours</p>
      ${progressMeter(total,HOUR_GOAL,"Service hour goal","progressbar",`${fmtH(total)} of ${HOUR_GOAL} hours`)}
      <p class="muted small">${total >= HOUR_GOAL ? "Goal reached" : `${fmtH(HOUR_GOAL - total)} hours to go`}</p></div>
  </section>
  <section class="section" aria-labelledby="service-history-title"><h2 id="service-history-title">Recent service</h2>
    ${recent.length ? serviceLedger(recent) : `<p class="empty">Hours appear here after a coordinator records attendance or a club approves your service.</p>`}
    ${older.length ? `<details class="disclosure history-disclosure" id="hours-record"><summary>View ${older.length} older ${older.length === 1 ? "record" : "records"}</summary>${serviceLedger(older)}</details>` : ""}
  </section>`;
}

function vProfile(u){
  return `<div class="head"><div><h1>Profile</h1><p class="muted">Your skills help us suggest shifts. Share a city or town to find opportunities nearby.</p></div></div>
  <form id="profileForm" class="card stack" novalidate style="max-width:720px">
    <div class="grid2">
      <div class="field"><label for="p-name">Full name</label><input id="p-name" name="name" maxlength="80" value="${esc(u.name)}"><span class="ferr" id="e-name"></span></div>
      <div class="field"><label for="p-email">Email</label><input id="p-email" value="${esc(u.email)}" disabled><span class="muted small">Contact a coordinator to change your email.</span></div>
      <div class="field"><label for="p-phone">Phone</label><input id="p-phone" name="phone" maxlength="30" value="${esc(u.phone)}"><span class="ferr" id="e-phone"></span></div>
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
