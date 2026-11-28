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
function memberTotals(club, entry = {eventHours:0, approved:0, pending:0}){
  const total = entry.eventHours + entry.approved, need = club.req?.hours || 0;
  return {...entry, total, need, pct:need ? Math.min(100, Math.round(total / need * 100)) : 0};
}
function clubHours(clubId, uid){
  const club = clubById(clubId);
  const totals = HourPace.totals(club, state.events, state.regs, state.hourLogs);
  return memberTotals(club, totals.get(uid));
}
function progressStatus(h, req){
  const pace = HourPace.progress(req, h.total);
  return {cls:pace.behind ? "warn" : pace.status === "Complete" ? "good" : "accent", text:pace.status};
}
// Approved outside hours count toward a person's overall total too.
const approvedOutsideHours = uid => sum(state.hourLogs.filter(l => l.userId === uid && l.status === "approved").map(l => l.hours));

/* ----- Join codes ----- */
function makeCode(short){
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.getRandomValues(new Uint8Array(12));
  const tail = [...random].map(byte => alphabet[byte % alphabet.length]).join("");
  return `${short}-${tail}`;
}
const normalizeCode = s => String(s).trim().toUpperCase().replace(/\s+/g, "");

/* ----- Actions ----- */
function joinClub(form){
  const code = normalizeCode(new FormData(form).get("code")), u = currentUser();
  if (!/^[A-Z0-9]{2,6}-([A-Z0-9]{6}|[A-Z0-9]{12})$/.test(code)) return showErrors(form, {code:"Enter the code your club gave you, like HOSA-7K2PQM."});
  const newMembership = clubId => ({id:`${clubId}_${u.id}`, clubId, userId:u.id, role:"member", name:u.name, email:u.email, joinedAt:TODAY, code});
  if (DB.live){
    let joined;
    const request = async () => {
      const id = await Cloud.findClubByCode(code);
      joined = clubById(id);
      if (!joined || membershipOf(id, u.id)) throw new Error("Club unavailable or already joined");
      const record = newMembership(id);
      await DB.commit("memberships", [{id:record.id, record}]);
    };
    return runPending("join-club", "Joining club…", form.querySelector('[type="submit"]'), request,
      () => { render(); toast(`Welcome to ${joined.name}!`); },
      () => {
        const current = document.getElementById("joinForm");
        if (current) showErrors(current, {code:"We couldn't join the club. Check your code or look under My clubs."});
      });
  }
  const hit = Object.entries(state.clubCodes).find(([, c]) => c === code), clubId = hit ? asId(hit[0]) : null;
  const club = clubById(clubId);
  if (!club) return showErrors(form, {code:"We couldn't find a club with that code. Check it with your club officers."});
  if (membershipOf(clubId, u.id)) return showErrors(form, {code:`You're already a member of ${club.name}.`});
  DB.add("memberships", newMembership(clubId));
  save(); render(); toast(`Welcome to ${club.name}!`);
}

function saveHourLog(form){
  const fd = new FormData(form), u = currentUser(), d = Object.fromEntries(fd.entries());
  const hours = Number(d.hours), clubId = asId(d.club);
  const errs = {
    club: !clubById(clubId) ? "Choose a club." : "",
    date: !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ? "Choose the date you volunteered." : d.date > TODAY ? "You can't log hours for a future date." : d.date < addDays(-365) ? "Hours must be from the past year." : "",
    hours: !(hours >= 0.25 && hours <= 24) ? "Enter between 0.25 and 24 hours." : Math.round(hours * 4) !== hours * 4 ? "Use quarter hours, like 1.5 or 2.25." : "",
    place:V.text(d.place.trim(), "the location", 2, 160),
    activity:V.text(d.activity.trim(), "the activity", 10, 1000, true),
    supervisor:V.text(d.supervisor.trim(), "the supervisor’s name", 2, 80),
    contact: !V.email(d.contact) || (!V.phone(d.contact.trim()) && d.contact.trim().length > 0) ? "" : "Enter your supervisor's email or 10-digit phone, so officers can confirm.",
  };
  if (!showErrors(form, errs)) return;
  DB.add("hourLogs", {id:DB.newId("hourLogs"), clubId, userId:u.id, name:u.name, date:d.date, hours, place:d.place.trim(), activity:d.activity.trim(),
    supervisor:d.supervisor.trim(), contact:d.contact.trim(), status:"pending", at:new Date().toISOString()});
  save(); closeModal(); render(); toast(`Logged ${fmtH(hours)} hours for ${clubById(clubId).name}. An officer will review them.`);
}

function reviewLog(id, status, note = ""){
  const l = state.hourLogs.find(x => x.id === id), u = currentUser();
  if (!l || !isClubManager(l.clubId, u)) return toast("Only this club's officers and adviser can review hours.", "bad");
  if (l.userId === u.id) return toast("Someone else needs to approve your own hours.", "bad");
  DB.update("hourLogs", l, {status, reviewedBy:u.name, reviewedAt:TODAY, note});
  notify(l.userId, status === "approved" ? `${clubById(l.clubId).name} approved your ${fmtH(l.hours)} hours at ${l.place}.` : `${clubById(l.clubId).name} didn't approve your ${fmtH(l.hours)} hours at ${l.place}${note ? `: ${note}` : "."}`, `log-${l.id}-${status}`, l.clubId);
  save(); render(); toast(status === "approved" ? `Approved ${fmtH(l.hours)} hours for ${l.name}.` : `Hours not approved. ${l.name} was told why.`);
}

function saveClub(form){
  const fd = new FormData(form), d = Object.fromEntries(fd.entries()), id = form.dataset.id ? asId(form.dataset.id) : null, old = id ? clubById(id) : null;
  const hours = d.reqHours === "" ? 0 : Number(d.reqHours);
  if (old && !isAdviser(old.id)) return toast("Only the adviser can change this club.", "bad");
  const customGap = Boolean(d.alertGap?.trim());
  const threshold = customGap ? Number(d.alertGap) : HourPace.defaultGap(hours);
  const errs = {
    alertGap:hours && customGap && !(threshold >= 0.25 && threshold <= hours && Number.isInteger(threshold * 4)) ? "Use quarter hours between 0.25 and the term goal." : "",
    emailAlerts:d.emailAlerts && !hours ? "Set a term goal before enabling email alerts." : "",
    name:V.text(d.name.trim(), "the club name", 2, 80),
    about:V.text(d.about.trim(), "the club description", 0, 1000, true),
    short: !/^[A-Za-z0-9]{2,6}$/.test(d.short.trim()) ? "Use 2–6 letters or numbers, like HOSA." : "",
    reqHours: !(hours === 0 || (hours >= 0.25 && hours <= 500)) ? "Enter 0 to 500 hours." : "",
    label: hours ? V.text(d.label.trim(), "the term name", 2, 30) : "",
    start: hours && !d.start ? "Choose when the term starts." : "",
    end: hours && (!d.end || d.end <= d.start) ? "The term must end after it starts." : "",
  };
  if (!showErrors(form, errs)) return;
  const club = {name:d.name.trim(), short:d.short.trim().toUpperCase(), about:d.about.trim(), req:hours ? {hours, label:d.label.trim(), start:d.start, end:d.end, ...(customGap ? {alertGap:threshold} : {}), emailAlerts:!!d.emailAlerts} : null};
  if (old && DB.live) return runPending("edit-club", "Saving club…", form.querySelector('[type="submit"]'),
    () => DB.commit("clubs", [{id:old.id, fields:club}]),
    () => { if (form.isConnected) closeModal(); render(); toast("Club settings saved."); }, error => toast(Cloud.friendly(error), "bad"));
  if (old){ DB.update("clubs", old, club); toast(`${club.name} was updated.`); }
  else {
    const u = currentUser(), clubId = DB.newId("clubs");
    const record = {id:clubId, ...club, createdBy:u.id};
    const adviser = {id:`${clubId}_${u.id}`, clubId, userId:u.id, role:"adviser", name:u.name, email:u.email, joinedAt:TODAY};
    const code = makeCode(club.short);
    const done = () => { ui.club = clubId; toast(`${club.name} was created. Share the join code with your members.`); };
    if (DB.live) return runPending("create-club", "Creating club…", form.querySelector('[type="submit"]'),
      () => Cloud.createClub(record, adviser, code),
      () => { if (form.isConnected) closeModal(); done(); render(); },
      error => toast(Cloud.friendly(error), "bad"));
    DB.add("clubs", record);
    DB.add("memberships", adviser);
    setClubCode(record, code);
    done();
  }
  save(); closeModal(); render();
}
function setClubCode(c, code){
  if (DB.live) return Cloud.setClubCode(c.id, code);
  state.clubCodes[c.id] = code;
}
