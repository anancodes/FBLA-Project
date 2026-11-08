/*
 * store.js
 * The app's data layer. Holds `state` (users, events, registrations, announcements,
 * notices, preferences), saves/loads it with the browser's localStorage, keeps
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

const DATA_VERSION = 4;   // bump this when the data shape changes so old saved data is replaced

function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (raw){ const d = JSON.parse(raw); if (d && d.v === DATA_VERSION) return d; }
  } catch(e){}
  return null;
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} }
let state = load() || seed();

// Temporary screen state (filters, open tabs, calendar month). Not saved.
const ui = {
  view:"dashboard", authMode:"login", armed:null, csv:null, tour:null,
  find:{q:"", cat:"all", area:"all", venue:"all", match:false, hideFull:false, verifiedOnly:true, mode:"list"},
  ev:{tab:"upcoming", q:"", mode:"list"}, cal:TODAY.slice(0, 7),
  ciEvent:null, vq:"",
  rep:{from:addDays(-90), to:TODAY, cat:"all", group:"volunteer", vol:"all"},
};

/* ----- Lookups ----- */
const currentUser = () => state.users.find(u => u.id === state.session.userId) || null;
const userById = id => state.users.find(u => u.id === id);
const eventById = id => state.events.find(e => e.id === id);
const coordinatorName = () => (state.users.find(u => u.role === "coordinator") || {name:"Volunteer Coordinator"}).name;

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
// Skips anyone who now has a clashing shift. Returns the promoted registrations.
function fillFromWaitlist(e){
  const promoted = [];
  if (e.date < TODAY) return promoted;
  for (const r of waitlistFor(e.id)){
    if (spotsLeft(e) <= 0) break;
    if (findClash(r.userId, e)) continue;
    r.status = "registered";
    notify(r.userId, `A spot opened up. You're now signed up for ${e.title} on ${fmtDate(e.date)}.`);
    promoted.push(r);
  }
  return promoted;
}

/* ----- Notices (personal updates) and announcements ----- */
function notify(uid, text){
  state.notices.push({id:nid(state.notices), userId:uid, text, at:new Date().toISOString(), read:false});
}
const noticesFor = uid => state.notices.filter(n => n.userId === uid).sort((a, b) => b.at.localeCompare(a.at));

// Announcements go to everyone, or only to people signed up for one event.
function announcementsFor(u){
  return state.announcements
    .filter(a => u.role === "coordinator" || a.audience === "all" || activeRegs(+a.audience).some(r => r.userId === u.id) || waitlistFor(+a.audience).some(r => r.userId === u.id))
    .sort((a, b) => b.at.localeCompare(a.at));
}
const readSet = uid => new Set(state.reads[uid] || []);
function unreadCount(u){
  if (u.role === "coordinator") return 0;
  const seen = readSet(u.id);
  return announcementsFor(u).filter(a => !seen.has(a.id)).length + noticesFor(u.id).filter(n => !n.read).length;
}
function markAllRead(u){
  state.reads[u.id] = announcementsFor(u).map(a => a.id);
  noticesFor(u.id).forEach(n => n.read = true);
}

/* ----- Trust ----- */
// An event is from a verified organizer if the coordinator who posted it is verified.
// Coordinators with no org of their own belong to the organization set in Settings.
const posterOf = e => { const p = userById(e.postedBy) || {name:"Unknown organizer", org:"(unknown)", verified:false}; return {...p, org:p.org || state.org.name}; };
// Street address plus the town from Settings.
const fullAddress = v => v.address ? `${v.address}, ${state.org.city}` : "";
// Short code from the organization's initials, used on certificate numbers.
const orgCode = () => (state.org.name.match(/[A-Za-z]+/g) || ["VH"]).map(w => w[0]).join("").slice(0, 4).toUpperCase();
const isVerified = e => !!posterOf(e).verified;
const openConcerns = () => state.concerns.filter(c => c.status === "open").sort((a, b) => b.at.localeCompare(a.at));

/* ----- Stats ----- */
function userStats(uid){
  const rs = state.regs.filter(r => r.userId === uid);
  const att = rs.filter(r => r.status === "attended");
  return {
    hours: sum(att.map(r => r.hours)), attended: att.length,
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
