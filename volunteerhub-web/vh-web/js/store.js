/*
 * store.js
 * The app's data layer. Holds `state` (users, events, registrations, announcements,
 * notices, preferences). In demo mode it saves/loads everything with localStorage; in
 * live mode only this device's preferences are saved here (the rest lives in Firebase,
 * see db.js and cloud.js). Also keeps
 * temporary screen state in `ui`, and provides query helpers such as spotsLeft(),
 * userStats(), and the waitlist logic.
 *
 * Registration statuses:
 *   registered -> signed up for an upcoming shift
 *   waitlist   -> event was full; waiting in line for a spot (order = registration id)
 *   attended   -> checked in by a coordinator; hours are credited
 *   no-show    -> signed up but did not come
 *   cancelled  -> the volunteer cancelled
 */
"use strict";

const DATA_VERSION = 7;   // bump this when the data shape changes so old saved data is replaced

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (raw){ const d = JSON.parse(raw); if (d && d.v === DATA_VERSION) return d; }
  } catch(e){}
  return null;
}
// Preferences (text size, contrast, theme) belong to this device in both modes.
function loadPrefs(){ try { return Object.assign({font:15, hc:false, theme:"auto"}, JSON.parse(localStorage.getItem(KEY + "-prefs") || "{}")); } catch(e){ return {font:15, hc:false, theme:"auto"}; } }
function save(){
  try {
    localStorage.setItem(KEY + "-prefs", JSON.stringify(state.prefs));
    if (!DB.live && !ui.liveShell) localStorage.setItem(KEY, JSON.stringify(state));   // demo data only
  } catch(e){}
}
function demoState(){ const s = load() || seed(); s.prefs = loadPrefs(); return s; }
let state = demoState();

// Temporary screen state (filters, open tabs, calendar month). Not saved.
const ui = {
  view:"dashboard", authMode:"login", armed:null, csv:null, tour:null,
  demo:false,        // true while exploring sample data on a site that also has live mode
  liveShell:false,   // true while showing live-mode data (signed in or on the live login page)
  find:{q:"", cat:"all", zip:null, radius:"25", match:false, hideFull:false, verifiedOnly:true, mode:"list"},   // zip:null = start from the volunteer's saved ZIP
  ev:{tab:"upcoming", q:"", mode:"list"}, cal:TODAY.slice(0, 7),
  ciEvent:null, vq:"",
  rep:{from:addDays(-90), to:TODAY, cat:"all", group:"volunteer", vol:"all"},
};

/* ----- Lookups ----- */
const currentUser = () => state.users.find(u => u.id === state.session.userId) || null;
// Unknown or hidden users (for example, when the database doesn't let you see someone's
// contact details) come back as a plain placeholder so screens never break.
const userById = id => state.users.find(u => u.id === id) || {id, name:memberName(id), email:(state.memberships.find(m => m.userId === id) || {}).email || "", phone:"", role:"volunteer", skills:[], availability:[], hidden:true};
const eventById = id => state.events.find(e => e.id === id);
const coordinatorName = () => (state.users.find(u => u.role === "coordinator" && u.admin) || state.users.find(u => u.role === "coordinator" && u.verified) || {name:"Volunteer Coordinator"}).name;

/* ----- Registrations ----- */
// People holding a real spot (waitlisted and cancelled people don't count).
const HOLDS_SPOT = ["registered", "attended", "no-show"];
const activeRegs = eid => state.regs.filter(r => r.eventId === eid && HOLDS_SPOT.includes(r.status));
const spotsLeft = e => e.slots - activeRegs(e.id).length;
// A user's current registration for an event, including waitlist (ignores cancelled).
const myReg = (uid, eid) => state.regs.find(r => r.userId === uid && r.eventId === eid && r.status !== "cancelled");
// Waitlist in first-come, first-served order.
const waitlistFor = eid => state.regs.filter(r => r.eventId === eid && r.status === "waitlist").sort((a, b) => a.id - b.id);
const waitlistPosition = r => waitlistFor(r.eventId).findIndex(x => x.id === r.id) + 1;

// Does this user already have a shift that overlaps event e on the same day?
function findClash(uid, e){
  return state.regs
    .filter(r => r.userId === uid && r.status === "registered" && r.eventId !== e.id)
    .map(r => eventById(r.eventId))
    .find(o => o.date === e.date && o.start < e.end && e.start < o.end);
}

// When spots open up, move people off the waitlist in order.
// Skips anyone who now has a clashing shift. Stops at anyone this person isn't allowed
// to change, so nobody jumps the line. Returns the promoted registrations.
function fillFromWaitlist(e){
  const promoted = [];
  if (e.date < TODAY) return promoted;
  for (const r of waitlistFor(e.id)){
    if (spotsLeft(e) <= 0) break;
    if (findClash(r.userId, e)) continue;
    if (!DB.canManageReg(r)) break;
    DB.update("regs", r, {status:"registered"});
    // Same id on every device, so if two devices promote at once the person still gets one notice
    notify(r.userId, `A spot opened up. You're now signed up for ${e.title} on ${fmtDate(e.date)}.`, `spot-${r.id}`, e.clubId);
    promoted.push(r);
  }
  return promoted;
}

/* ----- Notices (personal updates) and announcements ----- */
// clubId lets club officers send updates to their own members (the database checks this).
function notify(uid, text, key, clubId){
  if (!DB.canNotify(uid, clubId)) return;
  if (key && state.notices.some(n => n.id === key)) return;
  DB.add("notices", {id:key || DB.newId("notices"), userId:uid, text, at:new Date().toISOString(), read:false, clubId:clubId || null});
}
const noticesFor = uid => state.notices.filter(n => n.userId === uid).sort((a, b) => b.at.localeCompare(a.at));

// Announcements go to everyone, or only to people signed up for one event.
function announcementsFor(u){
  return state.announcements
    .filter(a => u.role === "coordinator" || a.audience === "all" || activeRegs(+a.audience).some(r => r.userId === u.id) || waitlistFor(+a.audience).some(r => r.userId === u.id))
    .sort((a, b) => b.at.localeCompare(a.at));
}
const readSet = uid => new Set(userById(uid).reads || []);
function unreadCount(u){
  if (u.role === "coordinator") return 0;
  const seen = readSet(u.id);
  return announcementsFor(u).filter(a => !seen.has(a.id)).length + noticesFor(u.id).filter(n => !n.read).length;
}
function markAllRead(u){
  const ids = announcementsFor(u).map(a => a.id), seen = readSet(u.id);
  if (ids.some(id => !seen.has(id))) DB.update("users", u, {reads:ids});
  noticesFor(u.id).filter(n => !n.read).forEach(n => DB.update("notices", n, {read:true}));
}

/* ----- Trust ----- */
// An event is from a verified organizer if the coordinator who posted it is verified.
// Coordinators with no org of their own belong to the organization set in Settings.
const posterOf = e => { const p = userById(e.postedBy) || {name:"Unknown organizer", org:"(unknown)", verified:false}; return {...p, org:p.org || state.org.name}; };
/* ----- Locations ----- */
const homeZip = () => lookupZip(state.org.zip) || lookupZip(DEFAULT_HOME_ZIP);
const orgPlace = () => placeName(homeZip());
// Where an event is: the ZIP a coordinator typed for it, or its saved place's position around the home ZIP.
function eventPoint(e){
  if (e.zip && lookupZip(e.zip)) return lookupZip(e.zip);
  const v = venueOf(e);
  return v.east !== undefined ? offsetPoint(homeZip(), v.east, v.north) : homeZip();
}
function eventZipInfo(e){
  if (e.zip && lookupZip(e.zip)) return lookupZip(e.zip);
  const p = eventPoint(e);
  return nearestZip(p.lat, p.lon);
}
function addressOf(e){
  const v = venueOf(e), z = eventZipInfo(e);
  return `${v.address ? v.address + ", " : ""}${z.city}, ${z.st} ${z.zip}`;
}
// The ZIP typed on Find opportunities, if it's a real one.
function searchOrigin(){ const z = String(ui.find.zip || "").trim(); return /^\d{5}$/.test(z) ? lookupZip(z) : null; }
const milesTo = (e, origin) => distanceMiles(origin, eventPoint(e));
// Short code from the organization's initials, used on certificate numbers.
const orgCode = () => (state.org.name.match(/[A-Za-z]+/g) || ["VH"]).map(w => w[0]).join("").slice(0, 4).toUpperCase();
// Club events are trusted: the database only lets a club's own adviser and officers post them.
const isVerified = e => !!posterOf(e).verified || (!!e.clubId && !!clubById(e.clubId));
const openConcerns = () => state.concerns.filter(c => c.status === "open").sort((a, b) => b.at.localeCompare(a.at));

/* ----- Stats ----- */
function userStats(uid){
  const rs = state.regs.filter(r => r.userId === uid);
  const att = rs.filter(r => r.status === "attended");
  return {
    eventHours: sum(att.map(r => r.hours)), outside: approvedOutsideHours(uid),
    hours: sum(att.map(r => r.hours)) + approvedOutsideHours(uid), attended: att.length,
    noShows: rs.filter(r => r.status === "no-show").length,
    upcoming: rs.filter(r => r.status === "registered" && eventById(r.eventId).date >= TODAY),
    waitlisted: rs.filter(r => r.status === "waitlist" && eventById(r.eventId).date >= TODAY),
  };
}

// Hours from now until an event starts (negative if it already started).
function hoursUntil(e){
  const [y, m, d] = e.date.split("-").map(Number), [h, mi] = e.start.split(":").map(Number);
  return (new Date(y, m - 1, d, h, mi) - new Date()) / 3600000;
}
