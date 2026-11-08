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
    ${h.need ? `<div class="meter ${h.pct >= 100 ? "full" : ""}" role="img" aria-label="${h.pct}% of the requirement"><span style="width:${h.pct}%"></span></div>` : ""}
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
  ${mine.length ? `<section class="club-grid">${mine.map(({m, c}) => `<article class="card stack">
      <div class="spread"><div><span class="eyebrow">${esc(c.short)}</span><h2>${esc(c.name)}</h2></div><span class="pill ${m.role === "member" ? "" : "accent"}">${m.role === "member" ? "Member" : m.role === "officer" ? "Officer" : "Adviser"}</span></div>
      ${c.about ? `<p class="muted small">${esc(c.about)}</p>` : ""}
      ${progressBar(clubHours(c.id, u.id), c.req)}
      <div class="row">${m.role !== "member" ? `<button class="btn secondary sm" data-act="manageClub" data-id="${c.id}">Manage club</button>` : ""}${m.role !== "adviser" ? armBtn(`leaveclub:${m.id}`, "Leave club", "Confirm leave", "secondary sm") : ""}</div>
    </article>`).join("")}</section>`
  : `<div class="empty">You're not in any clubs yet. Ask a club officer for the join code.</div>`}
  ${mine.length ? `<section><h2 style="margin-bottom:10px">Outside hours I've logged</h2>
  <div class="tablewrap"><table><thead><tr><th>Date</th><th>Club</th><th>Where and what</th><th class="num">Hours</th><th>Status</th><th class="num"></th></tr></thead><tbody>
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
function manageClubsView(u){
  const clubs = managedClubs(u);
  const canCreate = DB.isVerifiedCoordinator(u);
  if (!clubs.length) return `<div class="head"><div><h1>Clubs</h1><p class="muted">Clubs track members' service hours toward a requirement each term.</p></div>${canCreate ? `<button class="btn" data-act="newClub">New club</button>` : ""}</div>
    <div class="empty">${canCreate ? "No clubs yet. Create one for each club you advise, like HOSA or NHS." : "You're not managing any clubs yet."}</div>`;
  if (!clubs.some(c => c.id === ui.club)) ui.club = clubs[0].id;
  const c = clubById(ui.club), req = c.req, members = clubMembers(c.id);
  const rows = members.filter(m => m.role !== "adviser").map(m => ({m, h:clubHours(c.id, m.userId)})).sort((a, b) => a.h.pct - b.h.pct || memberName(a.m.userId).localeCompare(memberName(b.m.userId)));
  const pending = state.hourLogs.filter(l => l.clubId === c.id && l.status === "pending").sort((a, b) => a.date.localeCompare(b.date));
  const done = rows.filter(x => x.h.need && x.h.total >= x.h.need).length, behind = rows.filter(x => progressStatus(x.h, req).text === "Behind").length;
  const evs = state.events.filter(e => e.clubId === c.id && e.date >= addDays(-30)).sort(byDate);
  const code = state.clubCodes[c.id];
  ui.csv = {name:`${c.short.toLowerCase()}-member-hours.csv`, build:() => toCSV([[`${c.name}: member hours${req ? ` (${req.label}, ${req.hours} required)` : ""}`], [],
    ["Member","Email","Role","Club event hours","Approved outside hours","Total","Required","Status","Pending hours"],
    ...rows.map(({m, h}) => [memberName(m.userId), m.email, m.role, h.eventHours, h.approved, h.total, h.need || "", progressStatus(h, req).text, h.pending])])};
  return `<div class="head"><div><h1>Manage clubs</h1><p class="muted">Approve hours, track who's on pace, and run club events.</p></div>
    <div class="row">${canCreate ? `<button class="btn secondary" data-act="newClub">New club</button>` : ""}<button class="btn" data-act="newClubEvent" data-id="${c.id}">New club event</button></div></div>
  ${clubs.length > 1 ? `<div class="tabs" role="tablist">${clubs.map(x => `<button role="tab" aria-selected="${x.id === c.id}" data-act="pickClub" data-id="${x.id}">${esc(x.short)}</button>`).join("")}</div>` : ""}
  <section class="card stack">
    <div class="spread"><div><span class="eyebrow">${esc(c.short)}</span><h2>${esc(c.name)}</h2></div><div class="row">${isAdviser(c.id, u) ? `<button class="btn secondary sm" data-act="editClub" data-id="${c.id}">Edit club</button>` : ""}</div></div>
    <div class="grid3">
      <div class="stack" style="gap:4px"><span class="lbl small muted">Join code</span><div class="row"><code class="joincode">${esc(code || "Loading…")}</code>${code ? `<button class="btn secondary sm" data-act="copyCode" data-v="${esc(code)}">Copy</button>` : ""}${isAdviser(c.id, u) ? armBtn(`newcode:${c.id}`, "New code", "Old code stops working", "secondary sm") : ""}</div></div>
      <div class="stack" style="gap:4px"><span class="lbl small muted">Requirement</span><span>${req ? `<b>${req.hours} hours</b> for ${esc(req.label)} (${fmtDate(req.start, {month:"short", day:"numeric"})}–${fmtDate(req.end, {month:"short", day:"numeric"})})` : "None set"}</span></div>
      <div class="stack" style="gap:4px"><span class="lbl small muted">Members</span><span><b>${rows.length}</b> · ${done} done${behind ? ` · <span class="pill warn">${behind} behind</span>` : ""}</span></div>
    </div>
  </section>

  <section class="card stack"><h2>Hours waiting for approval (${pending.length})</h2>
    ${pending.length ? pending.map(l => `<div class="approval">
      <div class="stack" style="gap:2px;min-width:0"><b>${esc(l.name)} · ${fmtH(l.hours)} hrs · ${fmtDate(l.date, {month:"short", day:"numeric"})}</b>
        <span>${esc(l.place)}: ${esc(l.activity)}</span>
        <span class="muted small">Supervisor: ${esc(l.supervisor)} · <span class="selectable">${esc(l.contact)}</span></span></div>
      <form class="row approve-actions" data-log="${l.id}" novalidate>${l.userId === u.id && !u.admin ? `<span class="muted small">Another officer must review your own hours.</span>` : `
        <input name="note" id="note-${l.id}" placeholder="Reason, if not approving" maxlength="160" aria-label="Reason for ${esc(l.name)}">
        <button type="button" class="btn secondary sm" data-act="rejectLog" data-id="${l.id}">Don't approve</button>
        <button type="button" class="btn sm" data-act="approveLog" data-id="${l.id}">Approve</button>`}</form>
    </div>`).join("") : `<div class="empty">Nothing waiting. Members' logged hours will appear here.</div>`}
  </section>

  <section><div class="spread" style="margin-bottom:10px"><h2>Members</h2>${exportBar(false)}</div>
  <div class="tablewrap"><table><thead><tr><th>Member</th><th>Role</th><th>Progress</th><th class="num">Events</th><th class="num">Outside</th><th class="num">Waiting</th><th class="num">Actions</th></tr></thead><tbody>
  ${rows.length ? rows.map(({m, h}) => { const st = progressStatus(h, req); return `<tr>
    <td><b>${esc(memberName(m.userId))}</b><span class="sub">${esc(m.email || "")}</span></td>
    <td>${m.role === "officer" ? `<span class="pill accent">Officer</span>` : `<span class="pill">Member</span>`}</td>
    <td><div class="fillcell" style="min-width:170px">${h.need ? `<div class="meter ${h.pct >= 100 ? "full" : ""}"><span style="width:${h.pct}%"></span></div>` : ""}<span class="small num">${fmtH(h.total)}${h.need ? `/${h.need}` : ""}</span><span class="pill ${st.cls}">${st.text}</span></div></td>
    <td class="num">${fmtH(h.eventHours)}</td><td class="num">${fmtH(h.approved)}</td><td class="num">${h.pending ? fmtH(h.pending) : "—"}</td>
    <td><div class="actions">${isAdviser(c.id, u) && m.userId !== u.id ? `<button class="btn secondary sm" data-act="toggleOfficer" data-id="${esc(m.id)}">${m.role === "officer" ? "Make member" : "Make officer"}</button>` : ""}${m.userId !== u.id ? armBtn(`removemember:${m.id}`, "Remove", "Confirm remove") : ""}</div></td></tr>`; }).join("")
    : `<tr><td colspan="7" class="muted">No members yet. Share the join code: ${esc(code || "")}</td></tr>`}
  </tbody></table></div></section>

  <section class="card"><div class="spread"><h2>Club events</h2><span class="muted small">Only ${esc(c.short)} members can see these.</span></div>
    ${evs.length ? evs.map(e => eventMini(e, `<div class="row" style="justify-content:flex-end"><span class="small num muted">${activeRegs(e.id).length}/${e.slots}</span><button class="btn secondary sm" data-act="goCheckin" data-id="${e.id}">Roster</button><button class="btn secondary sm" data-act="editEvent" data-id="${e.id}">Edit</button></div>`)).join("")
      : `<div class="empty" style="margin-top:12px">No club events in the last month or coming up. Choose "New club event" to add one.</div>`}
  </section>`;
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
