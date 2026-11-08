/*
 * clubs.js
 * School clubs (like HOSA or NHS): members join with a code, earn hours at club events
 * and by logging outside service, and work toward an hour requirement each term.
 *
 * Data:
 *   clubs        {id, name, short, about, req:{hours, label, start, end}, createdBy}
 *   memberships  {id:"clubId_userId", clubId, userId, role:"member"|"officer"|"adviser", name, email, joinedAt}
 *   hourLogs     {id, clubId, userId, name, date, hours, place, activity, supervisor, contact,
 *                 status:"pending"|"approved"|"rejected", reviewedBy, reviewedAt, note}
 *   clubCodes    {clubId: "HOSA-7K2P"}  join codes, visible only to the club's managers
 * Managers (the adviser and officers) approve hours, run club events, and see member progress.
 */
"use strict";

const clubById = id => state.clubs.find(c => c.id === id);
const membershipOf = (clubId, uid) => state.memberships.find(m => m.clubId === clubId && m.userId === uid);
const membershipsOf = uid => state.memberships.filter(m => m.userId === uid);
const clubsOf = uid => membershipsOf(uid).map(m => clubById(m.clubId)).filter(Boolean);
const clubMembers = clubId => state.memberships.filter(m => m.clubId === clubId);
const MANAGER_ROLES = ["officer", "adviser"];

// Can this person run the club? Its adviser and officers can; so can site admins.
function isClubManager(clubId, u = currentUser()){
  if (!u) return false;
  if (u.admin) return true;
  const m = membershipOf(clubId, u.id);
  return !!m && MANAGER_ROLES.includes(m.role);
}
const isAdviser = (clubId, u = currentUser()) => !!u && (u.admin || (membershipOf(clubId, u.id) || {}).role === "adviser");
const managedClubs = (u = currentUser()) => u ? state.clubs.filter(c => isClubManager(c.id, u)) : [];

// A person's name for club screens. Club records keep names, so officers can see who
// their members are even though the database hides other students' full profiles.
function memberName(uid){
  const u = state.users.find(x => x.id === uid);
  if (u) return u.name;
  const m = state.memberships.find(x => x.userId === uid);
  return m ? m.name : "Member";
}

// Can this person see a club event? Members of that club can; events without a club are for everyone.
const canSeeEvent = (e, u = currentUser()) => !e.clubId || !u || u.role === "coordinator" || !!membershipOf(e.clubId, u.id);

/* ----- Hours and progress ----- */
const inTerm = (date, req) => !req || !req.start || (date >= req.start && date <= req.end);
// Hours for one member in one club during the club's current term.
function clubHours(clubId, uid){
  const c = clubById(clubId), req = c && c.req;
  const events = state.regs.filter(r => r.userId === uid && r.status === "attended").map(r => ({r, e:eventById(r.eventId)}))
    .filter(x => x.e && x.e.clubId === clubId && inTerm(x.e.date, req));
  const logs = state.hourLogs.filter(l => l.clubId === clubId && l.userId === uid && inTerm(l.date, req));
  const eventHours = sum(events.map(x => x.r.hours)), approved = sum(logs.filter(l => l.status === "approved").map(l => l.hours));
  const pending = sum(logs.filter(l => l.status === "pending").map(l => l.hours));
  const total = eventHours + approved, need = req && req.hours ? req.hours : 0;
  return {eventHours, approved, pending, total, need, pct:need ? Math.min(100, Math.round(total / need * 100)) : 0};
}
// "Done", "On track", or "Behind": compares progress with how much of the term has passed.
function progressStatus(h, req){
  if (!h.need) return {cls:"", text:"No requirement"};
  if (h.total >= h.need) return {cls:"good", text:"Done"};
  if (!req || !req.start) return {cls:"accent", text:`${fmtH(h.need - h.total)} hrs to go`};
  const span = parseDate(req.end) - parseDate(req.start), passed = Math.max(0, Math.min(1, (parseDate(TODAY) - parseDate(req.start)) / span));
  return h.total / h.need + 0.1 >= passed ? {cls:"accent", text:"On track"} : {cls:"warn", text:"Behind"};
}
// Approved outside hours count toward a person's overall total too.
const approvedOutsideHours = uid => sum(state.hourLogs.filter(l => l.userId === uid && l.status === "approved").map(l => l.hours));

/* ----- Join codes ----- */
function makeCode(short){
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";       // no 0/O or 1/I/L, so codes are easy to read aloud
  let tail = ""; for (let i = 0; i < 6; i++) tail += letters[Math.floor(Math.random() * letters.length)];
  return `${(short || "CLUB").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "CLUB"}-${tail}`;
}
const normalizeCode = s => String(s).trim().toUpperCase().replace(/\s+/g, "");

/* ----- Actions ----- */
function joinClub(form){
  const code = normalizeCode(new FormData(form).get("code")), u = currentUser();
  if (!/^[A-Z0-9]{1,6}-[A-Z0-9]{6}$/.test(code)) return showErrors(form, {code:"Enter the code your club gave you, like HOSA-7K2PQM."});
  const finish = clubId => {
    const c = clubById(clubId);
    if (!c) return showErrors(form, {code:"We couldn't find a club with that code. Check it with your club officers."});
    if (membershipOf(clubId, u.id)) return showErrors(form, {code:`You're already a member of ${c.name}.`});
    DB.add("memberships", {id:`${clubId}_${u.id}`, clubId, userId:u.id, role:"member", name:u.name, email:u.email, joinedAt:TODAY, code});
    save(); render(); toast(`Welcome to ${c.name}!`);
  };
  if (DB.live) return Cloud.findClubByCode(code).then(id => finish(id)).catch(() => showErrors(form, {code:"We couldn't find a club with that code. Check it with your club officers."}));
  const hit = Object.entries(state.clubCodes).find(([, c]) => c === code);
  finish(hit ? asId(hit[0]) : null);
}

function saveHourLog(form){
  const fd = new FormData(form), u = currentUser(), d = Object.fromEntries(fd.entries());
  const hours = Number(d.hours), clubId = asId(d.club);
  const errs = {
    club: !clubById(clubId) ? "Choose a club." : "",
    date: !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ? "Choose the date you volunteered." : d.date > TODAY ? "You can't log hours for a future date." : d.date < addDays(-365) ? "Hours must be from the past year." : "",
    hours: !(hours >= 0.25 && hours <= 24) ? "Enter between 0.25 and 24 hours." : Math.round(hours * 4) !== hours * 4 ? "Use quarter hours, like 1.5 or 2.25." : "",
    place: d.place.trim().length < 2 ? "Enter where you volunteered." : "",
    activity: d.activity.trim().length < 10 ? "Describe what you did in at least a few words." : "",
    supervisor: d.supervisor.trim().length < 2 ? "Enter the name of the person who supervised you." : "",
    contact: !V.email(d.contact) || d.contact.replace(/\D/g, "").length === 10 ? "" : "Enter your supervisor's email or 10-digit phone, so officers can confirm.",
  };
  if (!showErrors(form, errs)) return;
  DB.add("hourLogs", {id:DB.newId("hourLogs"), clubId, userId:u.id, name:u.name, date:d.date, hours, place:d.place.trim(), activity:d.activity.trim(),
    supervisor:d.supervisor.trim(), contact:d.contact.trim(), status:"pending", at:new Date().toISOString()});
  save(); closeModal(); render(); toast(`Logged ${fmtH(hours)} hours for ${clubById(clubId).name}. An officer will review them.`);
}

function reviewLog(id, status, note = ""){
  const l = state.hourLogs.find(x => x.id === id), u = currentUser();
  if (!l || !isClubManager(l.clubId, u)) return toast("Only this club's officers and adviser can review hours.", "bad");
  if (l.userId === u.id && !u.admin) return toast("Someone else needs to approve your own hours.", "bad");
  DB.update("hourLogs", l, {status, reviewedBy:u.name, reviewedAt:TODAY, note});
  notify(l.userId, status === "approved" ? `${clubById(l.clubId).name} approved your ${fmtH(l.hours)} hours at ${l.place}.` : `${clubById(l.clubId).name} didn't approve your ${fmtH(l.hours)} hours at ${l.place}${note ? `: ${note}` : "."}`, `log-${l.id}-${status}`, l.clubId);
  save(); render(); toast(status === "approved" ? `Approved ${fmtH(l.hours)} hours for ${l.name}.` : `Hours not approved. ${l.name} was told why.`);
}

function saveClub(form){
  const fd = new FormData(form), d = Object.fromEntries(fd.entries()), id = form.dataset.id ? asId(form.dataset.id) : null, old = id ? clubById(id) : null;
  const hours = d.reqHours === "" ? 0 : Number(d.reqHours);
  const errs = {
    name: d.name.trim().length < 2 ? "Enter the club's name." : "",
    short: !/^[A-Za-z0-9]{2,6}$/.test(d.short.trim()) ? "Use 2–6 letters or numbers, like HOSA." : "",
    reqHours: !(hours >= 0 && hours <= 500) ? "Enter 0 to 500 hours." : "",
    label: hours && d.label.trim().length < 2 ? "Name the term, like Fall 2026." : "",
    start: hours && !d.start ? "Choose when the term starts." : "",
    end: hours && (!d.end || d.end <= d.start) ? "The term must end after it starts." : "",
  };
  if (!showErrors(form, errs)) return;
  const club = {name:d.name.trim(), short:d.short.trim().toUpperCase(), about:d.about.trim(), req:hours ? {hours, label:d.label.trim(), start:d.start, end:d.end} : null};
  if (old){ DB.update("clubs", old, club); toast(`${club.name} was updated.`); }
  else {
    const u = currentUser(), c = DB.add("clubs", {id:DB.newId("clubs"), ...club, createdBy:u.id});
    DB.add("memberships", {id:`${c.id}_${u.id}`, clubId:c.id, userId:u.id, role:"adviser", name:u.name, email:u.email, joinedAt:TODAY});
    setClubCode(c, makeCode(c.short));
    ui.club = c.id; toast(`${c.name} was created. Share the join code with your members.`);
  }
  save(); closeModal(); render();
}
function setClubCode(c, code){
  const old = state.clubCodes[c.id];
  state.clubCodes[c.id] = code;
  if (DB.live) Cloud.setClubCode(c.id, code, old);
}
