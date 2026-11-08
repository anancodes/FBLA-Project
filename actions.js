/*
 * actions.js
 * What happens when the user does something: signing up for a shift, saving an event,
 * and the `handlers` table that maps each button's data-act name to a function.
 */
"use strict";

function signup(eid){
  const u = currentUser(), e = eventById(eid);
  if (e.date < TODAY) return toast("This event has already happened.", "bad");
  if (spotsLeft(e) <= 0) return toast("Sorry, this event just filled up.", "bad");
  const existing = state.regs.find(r => r.userId === u.id && r.eventId === eid);
  if (existing && existing.status !== "cancelled") return toast("You're already signed up for this event.", "bad");
  const clash = state.regs.filter(r => r.userId === u.id && r.status === "registered").map(r => eventById(r.eventId)).find(o => o.id !== e.id && o.date === e.date && o.start < e.end && e.start < o.end);
  if (clash) return toast(`This overlaps with ${clash.title} (${timeRange(clash)}) that day.`, "bad");
  if (existing){ existing.status = "registered"; existing.hours = 0; }
  else state.regs.push({id:nid(state.regs), userId:u.id, eventId:eid, status:"registered", hours:0});
  save(); render(); toast(`You're signed up for ${e.title} on ${fmtDate(e.date)}.`);
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
  if (old) Object.assign(old, ev); else state.events.push({id:nid(state.events), ...ev});
  save(); closeModal(); render(); toast(old ? "Event updated." : `${ev.title} was created.`);
}

const handlers = {
  nav: (v) => { ui.view = v; ui.armed = null; render(); const m = $("#main"); if (m) m.focus({preventScroll:true}); window.scrollTo(0, 0); },
  authmode: (v) => { ui.authMode = v; render(); },
  demo: (v) => { state.session.userId = +v; ui.view = "dashboard"; save(); render(); toast(`Signed in as ${userById(+v).name}.`); },
  logout: () => { state.session.userId = null; ui.authMode = "login"; ui.armed = null; save(); render(); },
  font: (v) => { state.prefs.font = Math.max(13, Math.min(21, state.prefs.font + +v)); save(); applyPrefs(); },
  contrast: () => { state.prefs.hc = !state.prefs.hc; save(); render(); },
  signup: (_, id) => signup(+id),
  arm: (v) => { ui.armed = v; render(); },
  confirm: (v) => {
    const [kind, id] = v.split(":"); ui.armed = null;
    if (kind === "cancel"){ const r = state.regs.find(x => x.id === +id); r.status = "cancelled"; toast("Your shift was cancelled."); }
    if (kind === "delete"){ const e = eventById(+id); state.events = state.events.filter(x => x.id !== +id); state.regs = state.regs.filter(r => r.eventId !== +id); toast(`${e.title} was deleted.`); }
    if (kind === "reset"){ const prefs = state.prefs, uid = state.session.userId; state = seed(); state.prefs = prefs; state.session.userId = uid; toast("Demo data was reset."); }
    save(); render();
  },
  newEvent: () => openModal(eventForm(null)),
  editEvent: (_, id) => openModal(eventForm(eventById(+id))),
  close: () => closeModal(),
  overlay: (_, __, ev) => { if (ev.target.classList.contains("overlay")) closeModal(); },
  evtab: (v) => { ui.ev.tab = v; render(); },
  goCheckin: (_, id) => { ui.ciEvent = +id; handlers.nav("checkin"); },
  mark: (v, id) => { const r = state.regs.find(x => x.id === +id), e = eventById(r.eventId); r.status = v; r.hours = v === "attended" ? duration(e) : 0; save(); render(); },
  allPresent: (_, id) => { const e = eventById(+id); let k = 0; activeRegs(e.id).forEach(r => { if (r.status === "registered"){ r.status = "attended"; r.hours = duration(e); k++; } }); save(); render(); toast(`Marked ${k} ${k === 1 ? "volunteer" : "volunteers"} present.`); },
  preset: (v) => { ui.rep.from = addDays(-+v); ui.rep.to = TODAY; render(); },
  csv: () => { if (ui.csv) copyCSV(ui.csv()); },
};
