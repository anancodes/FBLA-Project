/*
 * actions.js
 * What happens when the user does something: signing up, joining or leaving a waitlist,
 * saving an event, posting an announcement, reporting a concern, and the `handlers` table that maps each
 * button's data-act name to a function.
 */
"use strict";

// Sign the current volunteer up for an event, after checking it's allowed.
function signup(eid){
  const u = currentUser(), e = eventById(eid);
  if (e.date < TODAY) return toast("This event has already happened.", "bad");
  if (spotsLeft(e) <= 0) return toast("This event just filled up. You can join the waitlist instead.", "bad");
  const existing = myReg(u.id, eid);
  if (existing && existing.status !== "waitlist") return toast("You're already signed up for this event.", "bad");
  const clash = findClash(u.id, e);
  if (clash) return toast(`This overlaps with ${clash.title} (${timeRange(clash)}) that day.`, "bad");
  if (existing) existing.status = "registered";
  else state.regs.push({id:nid(state.regs), userId:u.id, eventId:eid, status:"registered", hours:0});
  save(); render(); toast(`You're signed up for ${e.title} on ${fmtDate(e.date)}.`);
}

// Add the current volunteer to the end of a full event's waitlist.
function joinWaitlist(eid){
  const u = currentUser(), e = eventById(eid);
  if (e.date < TODAY) return toast("This event has already happened.", "bad");
  if (spotsLeft(e) > 0) return signup(eid);                       // a spot is open, so just sign up
  if (myReg(u.id, eid)) return toast("You're already on the list for this event.", "bad");
  const clash = findClash(u.id, e);
  if (clash) return toast(`This overlaps with ${clash.title} (${timeRange(clash)}) that day.`, "bad");
  const r = {id:nid(state.regs), userId:u.id, eventId:eid, status:"waitlist", hours:0};
  state.regs.push(r);
  save(); render(); toast(`You're #${waitlistPosition(r)} on the waitlist for ${e.title}.`);
}

function saveEventForm(form){
  const fd = new FormData(form), id = form.dataset.id ? +form.dataset.id : null, old = id ? eventById(id) : null;
  const d = {title:fd.get("title").trim(), category:fd.get("category"), location:fd.get("location").trim(), zip:fd.get("zip").trim(), date:fd.get("date"), start:fd.get("start"), end:fd.get("end"), slots:fd.get("slots"), skills:fd.getAll("skills"), desc:fd.get("desc").trim(),
             bring:fd.get("bring").trim(), wear:fd.get("wear").trim(), minAge:fd.get("minAge").trim()};
  const n = Number(d.slots), signed = old ? activeRegs(old.id).length : 0, age = d.minAge === "" ? null : Number(d.minAge);
  // Saved places already have a location. Only store a ZIP when it's needed or different.
  const known = VENUES.find(v => d.location === v.name || d.location.startsWith(v.name + ","));
  const knownZip = known ? eventZipInfo({location:d.location}).zip : "";
  if (known && (!d.zip || d.zip === knownZip)) d.zip = "";
  const errs = {
    title: !d.title ? "Give the event a name." : d.title.length < 3 ? "Use at least 3 characters." : d.title.length > 80 ? "Keep the name under 80 characters." : "",
    location: !d.location ? "Enter where volunteers should go." : "",
    zip: !d.zip && !known ? "Enter the ZIP code so volunteers nearby can find this shift." : d.zip ? zipError(d.zip) : "",
    minAge: age !== null && (!Number.isInteger(age) || age < 0 || age > 21) ? "Enter a whole number from 0 to 21, or leave it blank." : "",
    date: !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ? "Choose a date." : (d.date < TODAY && (!old || old.date !== d.date)) ? "The date can't be in the past." : "",
    start: !/^\d{2}:\d{2}$/.test(d.start) ? "Choose a start time." : "",
    end: !/^\d{2}:\d{2}$/.test(d.end) ? "Choose an end time." : (d.start && d.end <= d.start) ? "End time must be after the start time." : "",
    slots: !Number.isInteger(n) || n < 1 ? "Enter a whole number of at least 1." : n > 200 ? "The maximum is 200 volunteers." : n < signed ? `${signed} people are already signed up, so you need at least ${signed} spots.` : "",
  };
  if (!showErrors(form, errs)) { $("#ef-err").textContent = "Fix the highlighted fields to continue."; return; }
  const ev = {...d, slots:n, minAge:age, updatedAt:TODAY};
  let msg;
  if (old){
    Object.assign(old, ev);
    const moved = fillFromWaitlist(old);                            // more spots? move people off the waitlist
    msg = moved.length ? `Event updated. ${moved.length} moved off the waitlist.` : "Event updated.";
  } else {
    state.events.push({id:nid(state.events), ...ev, postedBy:currentUser().id, postedAt:TODAY});
    msg = `${ev.title} was created.`;
  }
  save(); closeModal(); render(); toast(msg);
}

function postAnnouncement(form){
  const fd = new FormData(form), title = fd.get("title").trim(), body = fd.get("body").trim();
  const errs = {
    title: title.length < 3 ? "Write a headline of at least 3 characters." : "",
    body: body.length < 10 ? "Write a message of at least 10 characters." : "",
  };
  if (!showErrors(form, errs)) return;
  const a = {id:nid(state.announcements), title, body, audience:fd.get("audience"), authorId:currentUser().id, at:new Date().toISOString()};
  state.announcements.push(a);
  save(); render(); toast(`Posted. It reaches ${reach(a)} ${reach(a) === 1 ? "volunteer" : "volunteers"}.`);
}

// A volunteer flags a listing that looks wrong, unsafe, or like a scam.
function submitConcern(form){
  const fd = new FormData(form), e = eventById(+form.dataset.id), u = currentUser();
  const reason = fd.get("reason"), details = fd.get("details").trim();
  const errs = {
    reason: !reason ? "Choose what's wrong." : "",
    details: reason === "Something else" && details.length < 5 ? "Tell us a little about the problem." : "",
  };
  if (!showErrors(form, errs)) return;
  if (state.concerns.some(c => c.eventId === e.id && c.userId === u.id && c.status === "open")){
    closeModal(); return toast("You already reported this listing. A coordinator is reviewing it.");
  }
  state.concerns.push({id:nid(state.concerns), eventId:e.id, userId:u.id, reason, details, at:new Date().toISOString(), status:"open"});
  save(); closeModal(); render(); toast("Thanks for reporting. A coordinator will review this listing.");
}

// Save the organization's name, home ZIP, and description from Settings.
function saveOrgSettings(form){
  const fd = new FormData(form), name = fd.get("name").trim(), zip = fd.get("zip").trim(), about = fd.get("about").trim();
  const errs = {
    name: name.length < 2 ? "Enter your organization's name (at least 2 characters)." : !/[A-Za-z]/.test(name) ? "The name needs at least one letter." : "",
    zip: zipError(zip),
    about: about.length > 160 ? "Keep the description under 160 characters." : "",
  };
  if (!showErrors(form, errs)) return;
  state.org = {name, zip, about};
  save(); render(); toast(`Saved. ${name} in ${placeName(lookupZip(zip))}.`);
}

// Two-step confirm actions (the button says "Confirm ..." after the first click).
function confirmAction(kind, id){
  if (kind === "cancel" || kind === "leave"){
    const r = state.regs.find(x => x.id === id), e = eventById(r.eventId), wasWaiting = r.status === "waitlist";
    r.status = "cancelled";
    if (wasWaiting) return toast(`You left the waitlist for ${e.title}.`);
    const moved = fillFromWaitlist(e);
    toast(moved.length ? "Your shift was cancelled. The next person on the waitlist got your spot." : "Your shift was cancelled.");
  }
  if (kind === "delete"){
    const e = eventById(id);
    state.events = state.events.filter(x => x.id !== id);
    state.regs = state.regs.filter(r => r.eventId !== id);
    state.announcements = state.announcements.filter(a => a.audience !== String(id));
    toast(`${e.title} was deleted.`);
  }
  if (kind === "ann"){ state.announcements = state.announcements.filter(a => a.id !== id); toast("Announcement deleted."); }
  if (kind === "reset"){
    const keep = {prefs:state.prefs, session:state.session, toured:state.toured, org:state.org};   // keep your organization settings
    state = Object.assign(seed(), keep);
    toast("Demo data was reset.");
  }
}

// The right event pop-up for the person's role.
const eventPopup = (e, u) => u.role === "coordinator" ? eventDetail(e) : volunteerEventPopup(e, u);
function showEventPopup(id){
  openModal(eventPopup(eventById(id), currentUser()));
  ui.modalEvent = id;      // lets render() refresh this pop-up after a sign-up
}

const handlers = {
  // Navigation and account
  nav: (v) => {
    const u = currentUser();
    if (v === "news" && u.role === "volunteer"){            // remember what was new, then mark it all read
      ui.newsSeen = readSet(u.id);
      ui.newNotices = new Set(noticesFor(u.id).filter(n => !n.read).map(n => n.id));
      markAllRead(u); save();
    }
    ui.view = v; ui.armed = null; closeModal(); render();
    const m = $("#main"); if (m) m.focus({preventScroll:true}); window.scrollTo(0, 0);
  },
  authmode: (v) => { ui.authMode = v; render(); },
  demo: (v) => { state.session.userId = +v; ui.view = "dashboard"; save(); render(); toast(`Signed in as ${userById(+v).name}.`); maybeStartTour(); },
  logout: () => { state.session.userId = null; ui.authMode = "login"; ui.armed = null; ui.tour = null; ui.cal = TODAY.slice(0, 7); ui.find.mode = ui.ev.mode = "list"; ui.find.zip = null; save(); render(); },
  font: (v) => { state.prefs.font = Math.max(13, Math.min(21, state.prefs.font + +v)); save(); applyPrefs(); },
  contrast: () => { state.prefs.hc = !state.prefs.hc; save(); render(); },

  // Volunteer sign-ups
  signup: (_, id) => signup(+id),
  waitlist: (_, id) => joinWaitlist(+id),
  dismiss: (_, id) => { const n = state.notices.find(x => x.id === +id); if (n) n.read = true; save(); render(); },

  // Two-step confirm buttons
  arm: (v) => { ui.armed = v; render(); },
  confirm: (v) => { const [kind, id] = v.split(":"); ui.armed = null; confirmAction(kind, +id); save(); render(); },

  // Events and check-in
  newEvent: () => openModal(eventForm(null)),
  editEvent: (_, id) => openModal(eventForm(eventById(+id))),
  evtab: (v) => { ui.ev.tab = v; render(); },
  goCheckin: (_, id) => { ui.ciEvent = +id; handlers.nav("checkin"); },
  mark: (v, id) => { const r = state.regs.find(x => x.id === +id), e = eventById(r.eventId); r.status = v; r.hours = v === "attended" ? duration(e) : 0; save(); render(); },
  allPresent: (_, id) => { const e = eventById(+id); let k = 0; activeRegs(e.id).forEach(r => { if (r.status === "registered"){ r.status = "attended"; r.hours = duration(e); k++; } }); save(); render(); toast(`Marked ${k} ${k === 1 ? "volunteer" : "volunteers"} present.`); },

  // Calendar
  viewMode: (v) => { const [key, mode] = v.split(":"); ui[key].mode = mode; render(); },
  calMonth: (v) => {
    if (+v === 0) ui.cal = TODAY.slice(0, 7);
    else { const [y, m] = ui.cal.split("-").map(Number); ui.cal = iso(new Date(y, m - 1 + +v, 1)).slice(0, 7); }
    render();
  },
  calEvent: (_, id) => showEventPopup(+id),

  // Event details, calendar file, and concerns
  moreInfo: (_, id) => showEventPopup(+id),
  ics: (_, id) => downloadICS(eventById(+id)),
  concern: (_, id) => { openModal(concernForm(eventById(+id))); },
  resolve: (_, id) => { const c = state.concerns.find(x => x.id === +id); c.status = "resolved"; save(); render(); toast("Concern marked resolved."); },

  // Reports, exports, printing
  preset: (v) => { ui.rep.from = addDays(-+v); ui.rep.to = TODAY; render(); },
  csv: () => { if (ui.csv) copyCSV(ui.csv.build()); },
  csvDownload: () => { if (ui.csv) downloadCSV(ui.csv.name, ui.csv.build()); },
  print: () => printView("page"),
  cert: (_, id) => openModal(certificate(userById(+id))),
  printCert: () => printView("modal"),

  // Pop-ups
  close: () => closeModal(),
  overlay: (_, __, ev) => { if (ev.target.classList.contains("overlay")) closeModal(); },

  // Guided tour
  tour: () => startTour(),
  tourStep: (v) => tourStep(+v),
  tourEnd: () => endTour(),
};
