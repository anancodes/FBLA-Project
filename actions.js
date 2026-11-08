/*
 * actions.js
 * What happens when the user does something: signing up, joining or leaving a waitlist,
 * saving an event, posting an announcement, and the `handlers` table that maps each
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
  const d = {title:fd.get("title").trim(), category:fd.get("category"), location:fd.get("location").trim(), date:fd.get("date"), start:fd.get("start"), end:fd.get("end"), slots:fd.get("slots"), skills:fd.getAll("skills"), desc:fd.get("desc").trim()};
  const n = Number(d.slots), signed = old ? activeRegs(old.id).length : 0;
  const errs = {
    title: !d.title ? "Give the event a name." : d.title.length < 3 ? "Use at least 3 characters." : d.title.length > 80 ? "Keep the name under 80 characters." : "",
    location: !d.location ? "Enter where volunteers should go." : "",
    date: !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ? "Choose a date." : (d.date < TODAY && (!old || old.date !== d.date)) ? "The date can't be in the past." : "",
    start: !/^\d{2}:\d{2}$/.test(d.start) ? "Choose a start time." : "",
    end: !/^\d{2}:\d{2}$/.test(d.end) ? "Choose an end time." : (d.start && d.end <= d.start) ? "End time must be after the start time." : "",
    slots: !Number.isInteger(n) || n < 1 ? "Enter a whole number of at least 1." : n > 200 ? "The maximum is 200 volunteers." : n < signed ? `${signed} people are already signed up, so you need at least ${signed} spots.` : "",
  };
  if (!showErrors(form, errs)) { $("#ef-err").textContent = "Fix the highlighted fields to continue."; return; }
  const ev = {...d, slots:n};
  let msg;
  if (old){
    Object.assign(old, ev);
    const moved = fillFromWaitlist(old);                            // more spots? move people off the waitlist
    msg = moved.length ? `Event updated. ${moved.length} moved off the waitlist.` : "Event updated.";
  } else {
    state.events.push({id:nid(state.events), ...ev});
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
    const keep = {prefs:state.prefs, session:state.session, toured:state.toured};
    state = Object.assign(seed(), keep);
    toast("Demo data was reset.");
  }
}

function showEventPopup(id){
  const e = eventById(id), u = currentUser();
  openModal(u.role === "coordinator" ? eventDetail(e) : `<div class="spread"><h2>Event details</h2><button class="btn secondary sm" data-act="close">Close</button></div>${eventCard(e, u)}`);
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
  logout: () => { state.session.userId = null; ui.authMode = "login"; ui.armed = null; ui.tour = null; ui.cal = TODAY.slice(0, 7); ui.find.mode = ui.ev.mode = "list"; save(); render(); },
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
