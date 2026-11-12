/*
 * views/clubs.js
 * "My clubs" for members: join with a code, see progress toward each club's hour
 * requirement, and log outside service for approval.
 * "Manage clubs" for advisers, officers, and site admins: approve hours, track every
 * member's progress, run club events, manage officers, and share the join code.
 */
"use strict";

function progressBar(h, req){
  const st = progressStatus(h, req);
  return `<div class="stack" style="gap:6px">
    <div class="spread small"><span><b class="num">${fmtH(h.total)}</b>${h.need ? ` of ${h.need} hours` : " hours"}${req && req.label ? ` · ${esc(req.label)}` : ""}</span><span class="pill ${st.cls}">${st.text}</span></div>
    ${h.need ? progressMeter(h.total,h.need,"Club hour requirement","progressbar",`${fmtH(h.total)} of ${h.need} approved hours`) : ""}
    <span class="muted small">${fmtH(h.eventHours)} from club events · ${fmtH(h.approved)} approved outside${h.pending ? ` · ${fmtH(h.pending)} waiting for approval` : ""}</span>
  </div>`;
}
const logStatusPill = l => l.status === "approved" ? `<span class="pill good">Approved</span>` : l.status === "rejected" ? `<span class="pill bad">Not approved</span>` : `<span class="pill mark">Waiting</span>`;

/* ----- Members ----- */
function vMyClubs(u){
  const mine = membershipsOf(u.id).map(m => ({m, c:clubById(m.clubId)})).filter(x => x.c);
  const logs = state.hourLogs.filter(l => l.userId === u.id).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="head"><div><h1>My clubs</h1><p class="muted">Track your hours for each club. Club events count automatically; log service you do elsewhere for an officer to approve.</p></div>
    ${mine.length ? `<button class="btn" data-act="logHours">Log outside hours</button>` : ""}</div>
  <form id="joinForm" class="card filters" novalidate>
    <div class="field grow"><label for="jc-code">Join a club</label><input id="jc-code" name="code" placeholder="Enter your club's code, like HOSA-7K2PQM" autocomplete="off" style="text-transform:uppercase"><span class="ferr" id="e-code"></span></div>
    <button class="btn" type="submit" style="align-self:flex-end">Join</button>
  </form>
  ${mine.length ? `<section class="club-grid">${mine.map(({m, c}) => `<article class="club-entry stack">
      <div class="spread"><h2>${esc(c.name)}</h2><span class="pill ${m.role === "member" ? "" : "accent"}">${m.role === "member" ? "Member" : m.role === "officer" ? "Officer" : "Adviser"}</span></div>
      ${c.about ? `<p class="muted small">${esc(c.about)}</p>` : ""}
      ${progressBar(clubHours(c.id, u.id), c.req)}
      ${isClubManager(c.id,u) ? `<details class="club-tools disclosure" id="club-tools-${c.id}" ${ui.expandClub === c.id ? "open" : ""}><summary>Members & approvals${state.hourLogs.filter(l => l.clubId === c.id && l.status === "pending" && l.userId !== u.id).length ? ` (${state.hourLogs.filter(l => l.clubId === c.id && l.status === "pending" && l.userId !== u.id).length} waiting)` : ""}</summary>${clubManagerContent(c,u)}</details>` : ""}
      ${m.role !== "adviser" ? `<div>${armBtn(`leaveclub:${m.id}`, "Leave club", "Confirm leave", "secondary sm")}</div>` : ""}
    </article>`).join("")}</section>`
  : `<div class="empty">You're not in any clubs yet. Ask a club officer for the join code.</div>`}
  ${mine.length ? `<section><h2 style="margin-bottom:10px">Outside hours I've logged</h2>
  <div class="tablewrap"><table><thead><tr><th>Date</th><th>Club</th><th>Where and what</th><th class="num">Hours</th><th>Status</th><th class="num">Actions</th></tr></thead><tbody>
  ${logs.length ? logs.map(l => `<tr><td>${fmtDate(l.date, {month:"short", day:"numeric", year:"numeric"})}</td><td>${esc((clubById(l.clubId) || {}).short || "")}</td>
    <td>${esc(l.place)}<span class="sub">${esc(l.activity)}</span>${l.note ? `<span class="sub"><b>Officer note:</b> ${esc(l.note)}</span>` : ""}</td><td class="num">${fmtH(l.hours)}</td><td>${logStatusPill(l)}</td>
    <td><div class="actions">${l.status === "pending" ? armBtn(`dellog:${l.id}`, "Delete", "Confirm delete") : ""}</div></td></tr>`).join("") : `<tr><td colspan="6" class="muted">Nothing logged yet. Choose "Log outside hours" after you volunteer somewhere.</td></tr>`}
  </tbody></table></div></section>` : ""}`;
}

function logForm(u){
  const mine = clubsOf(u.id);
  return `<form id="logForm" class="stack" novalidate>
    <div class="spread"><h2>Log outside hours</h2><button type="button" class="btn secondary sm" data-act="close">Close</button></div>
    <p class="muted small">For service you did on your own, outside club events. An officer or your adviser will confirm with your supervisor before approving.</p>
    <div class="grid3">
      <div class="field"><label for="lg-club">Club</label><select id="lg-club" name="club">${mine.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select><span class="ferr" id="e-club"></span></div>
      <div class="field"><label for="lg-date">Date</label><input id="lg-date" name="date" type="date" max="${TODAY}" value="${TODAY}"><span class="ferr" id="e-date"></span></div>
      <div class="field"><label for="lg-hours">Hours</label><input id="lg-hours" name="hours" type="number" step="0.25" min="0.25" max="24" placeholder="e.g. 2.5"><span class="ferr" id="e-hours"></span></div>
    </div>
    <div class="field"><label for="lg-place">Where did you volunteer?</label><input id="lg-place" name="place" maxlength="80" placeholder="e.g. Memorial Hospital, front desk"><span class="ferr" id="e-place"></span></div>
    <div class="field"><label for="lg-activity">What did you do?</label><textarea id="lg-activity" name="activity" rows="3" maxlength="400" placeholder="e.g. Greeted visitors and helped them find patient rooms."></textarea><span class="ferr" id="e-activity"></span></div>
    <div class="grid2">
      <div class="field"><label for="lg-sup">Supervisor's name</label><input id="lg-sup" name="supervisor" maxlength="60"><span class="ferr" id="e-supervisor"></span></div>
      <div class="field"><label for="lg-contact">Supervisor's email or phone</label><input id="lg-contact" name="contact" maxlength="80"><span class="ferr" id="e-contact"></span></div>
    </div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="close">Cancel</button><button class="btn" type="submit">Submit for approval</button></div>
  </form>`;
}

/* ----- Managers ----- */
function clubReportRows(c){
  return clubMembers(c.id).filter(m => m.role !== "adviser").map(m => ({m,h:clubHours(c.id,m.userId)})).sort((a,b) => a.h.pct-b.h.pct || memberName(a.m.userId).localeCompare(memberName(b.m.userId)));
}
function downloadClubCSV(id){
  const c = clubById(id); if (!c || !isClubManager(id)) return;
  const req = c.req;
  const data = toCSV([[`${c.name}: member hours${req ? ` (${req.label}, ${req.hours} required)` : ""}`],[],["Member","Email","Role","Club event hours","Approved outside hours","Total","Required","Status","Pending hours"],...clubReportRows(c).map(({m,h}) => [memberName(m.userId),m.email,m.role,h.eventHours,h.approved,h.total,h.need || "",progressStatus(h,req).text,h.pending])]);
  downloadCSV(`${c.short.toLowerCase()}-member-hours.csv`,data);
}
function clubManagerContent(c,u){
  if (!isClubManager(c.id,u)) return "";
  const req = c.req, rows = clubReportRows(c), code = state.clubCodes[c.id];
  const pending = state.hourLogs.filter(l => l.clubId === c.id && l.status === "pending").sort((a,b) => a.date.localeCompare(b.date));
  const evs = state.events.filter(e => e.clubId === c.id && e.date >= addDays(-30)).sort(byDate);
  return `<div class="club-management stack">
    <div class="spread"><div class="row"><span class="muted small">Join code</span><code class="joincode">${esc(code || "Loading…")}</code>${code ? `<button class="btn secondary sm" data-act="copyCode" data-v="${esc(code)}">Copy code</button>` : ""}${isAdviser(c.id,u) ? armBtn(`newcode:${c.id}`,"New code","Old code stops working","secondary sm") : ""}</div>
      <div class="row">${isAdviser(c.id,u) ? `<button class="btn secondary sm" data-act="editClub" data-id="${c.id}">Edit club</button>` : ""}<button class="btn secondary sm" data-act="newClubEvent" data-id="${c.id}">New club event</button></div></div>
    <p class="muted small">${req ? `${req.hours} hours required for ${esc(req.label)} · ${fmtDate(req.start,{month:"short",day:"numeric"})} to ${fmtDate(req.end,{month:"short",day:"numeric"})}` : "No hour requirement set."}</p>
    <section class="section"><h3>Hours waiting for approval (${pending.length})</h3>
      ${pending.length ? pending.map(l => `<div class="approval"><div class="stack"><strong>${esc(l.name)} · ${fmtH(l.hours)} hrs · ${fmtDate(l.date,{month:"short",day:"numeric"})}</strong><p>${esc(l.place)}: ${esc(l.activity)}</p><p class="muted small">Supervisor: ${esc(l.supervisor)} · ${esc(l.contact)}</p></div>
        <form class="row approve-actions" data-log="${l.id}" novalidate>${l.userId === u.id && !u.admin ? `<span class="muted small">Another officer needs to review your own hours.</span>` : `<input name="note" id="note-${l.id}" placeholder="Reason, if not approving" maxlength="160" aria-label="Reason for ${esc(l.name)}"><button type="button" class="btn secondary sm" data-act="rejectLog" data-id="${l.id}">Don't approve</button><button type="button" class="btn sm" data-act="approveLog" data-id="${l.id}">Approve</button>`}</form></div>`).join("") : `<p class="muted">Nothing waiting for review.</p>`}
    </section>
    <details class="disclosure" id="club-members-${c.id}"><summary>Members (${rows.length})</summary>
      <div class="spread"><p class="muted small">Approved hours within the current club term.</p><button class="btn secondary sm" data-act="clubCsvDownload" data-id="${c.id}">Download CSV</button></div>
      <div class="tablewrap"><table><thead><tr><th>Member</th><th>Role</th><th>Approved hours</th><th>Pending</th><th class="num">Actions</th></tr></thead><tbody>${rows.length ? rows.map(({m,h}) => `<tr><td><b>${esc(memberName(m.userId))}</b><span class="sub">${esc(m.email || "")}</span></td><td>${m.role === "officer" ? "Officer" : "Member"}</td><td><div class="member-progress">${h.need ? progressMeter(h.total,h.need,`Hours for ${memberName(m.userId)}`,"progressbar") : ""}<span class="num">${fmtH(h.total)}${h.need ? `/${h.need}` : ""}</span><span class="muted small">${progressStatus(h,req).text}</span></div></td><td class="num">${h.pending ? fmtH(h.pending) : "—"}</td><td><div class="row">${isAdviser(c.id,u) && m.userId !== u.id ? `<button class="btn secondary sm" data-act="toggleOfficer" data-id="${esc(m.id)}">${m.role === "officer" ? "Make member" : "Make officer"}</button>` : ""}${m.userId !== u.id ? armBtn(`removemember:${m.id}`,"Remove","Confirm remove") : ""}</div></td></tr>`).join("") : `<tr><td colspan="5">No members yet. Share the club's join code.</td></tr>`}</tbody></table></div>
    </details>
    <details class="disclosure" id="club-events-${c.id}"><summary>Club events (${evs.length})</summary>
      ${evs.length ? evs.map(e => eventMini(e,`<button class="btn secondary sm" data-act="editEvent" data-id="${e.id}">Edit</button>`)).join("") : `<p class="muted">No recent or upcoming club events.</p>`}
    </details>
  </div>`;
}
function manageClubsView(u){
  const clubs = managedClubs(u), canCreate = DB.isVerifiedCoordinator(u);
  if (!clubs.some(c => c.id === ui.club)) ui.club = (clubs[0] || {}).id;
  const c = clubById(ui.club);
  return `<div class="head"><div><h1>Clubs</h1><p class="muted">Members, service requirements, and approvals.</p></div>${canCreate ? `<button class="btn" data-act="newClub">New club</button>` : ""}</div>
    ${clubs.length > 1 ? `<div class="club-picker" role="group" aria-label="Choose a club">${clubs.map(x => `<button class="btn secondary sm" aria-pressed="${x.id === ui.club}" data-act="pickClub" data-id="${x.id}">${esc(x.name)}</button>`).join("")}</div>` : ""}
    ${c ? `<section class="section"><h2>${esc(c.name)}</h2>${c.about ? `<p class="muted">${esc(c.about)}</p>` : ""}${clubManagerContent(c,u)}</section>` : `<div class="empty">${canCreate ? "No clubs yet. Create a club, set a term requirement, and share its join code." : "You don't manage any clubs yet."}</div>`}`;
}

function clubForm(c){
  const isNew = !c; c = c || {name:"", short:"", about:"", req:{hours:10, label:"", start:TODAY, end:addDays(120)}};
  const r = c.req || {hours:"", label:"", start:"", end:""};
  return `<form id="clubForm" class="stack" novalidate data-id="${isNew ? "" : c.id}">
    <div class="spread"><h2>${isNew ? "New club" : `Edit ${esc(c.name)}`}</h2><button type="button" class="btn secondary sm" data-act="close">Close</button></div>
    <div class="grid2">
      <div class="field"><label for="cl-name">Club name</label><input id="cl-name" name="name" maxlength="60" value="${esc(c.name)}" placeholder="e.g. National Honor Society"><span class="ferr" id="e-name"></span></div>
      <div class="field"><label for="cl-short">Short name</label><input id="cl-short" name="short" maxlength="6" value="${esc(c.short)}" placeholder="e.g. NHS" style="text-transform:uppercase"><span class="muted small">Used in the join code.</span><span class="ferr" id="e-short"></span></div>
    </div>
    <div class="field"><label for="cl-about">About <span class="muted">(optional)</span></label><input id="cl-about" name="about" maxlength="140" value="${esc(c.about || "")}"></div>
    <h3>Hour requirement</h3>
    <div class="grid3">
      <div class="field"><label for="cl-hours">Hours required</label><input id="cl-hours" name="reqHours" type="number" min="0" max="500" value="${r.hours}"><span class="muted small">0 for no requirement.</span><span class="ferr" id="e-reqHours"></span></div>
      <div class="field"><label for="cl-label">Term name</label><input id="cl-label" name="label" maxlength="30" value="${esc(r.label)}" placeholder="e.g. Fall 2026"><span class="ferr" id="e-label"></span></div>
      <div class="field"><label for="cl-start">Term starts</label><input id="cl-start" name="start" type="date" value="${r.start}"><span class="ferr" id="e-start"></span></div>
      <div class="field"><label for="cl-end">Term ends</label><input id="cl-end" name="end" type="date" value="${r.end}"><span class="ferr" id="e-end"></span></div>
    </div>
    <p class="muted small">Only hours from inside the term count toward the requirement. Start a new term by changing these dates.</p>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="close">Cancel</button><button class="btn" type="submit">${isNew ? "Create club" : "Save changes"}</button></div>
  </form>`;
}
