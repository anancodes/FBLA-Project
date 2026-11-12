/*
 * actions.js
 * What happens when someone does something: logging in, signing up for a shift, joining
 * or leaving a waitlist, saving an event, posting an announcement, reporting a concern,
 * and the `handlers` table that maps each button's data-act name to a function.
 * Every change to saved data goes through DB (db.js), so it works in demo and live mode.
 */
"use strict";

/* ----- Accounts ----- */

function doLogin(form){
  const fd = new FormData(form), email = String(fd.get("email")).trim().toLowerCase(), pw = String(fd.get("password"));
  const err = $("#li-err");
  if (!email || !pw){ err.textContent = "Enter your email and password."; return; }
  if (Cloud.enabled && !ui.demo){                                 // live mode: Firebase checks the password
    err.textContent = ""; Cloud.login(email, pw).catch(e => err.textContent = Cloud.friendly(e));
    return;
  }
  const u = state.users.find(x => x.email === email);
  if (!u || !checkPassword(pw, u)){ err.textContent = "That email and password don't match. Try a demo account below."; return; }
  state.session.userId = u.id; ui.view = "dashboard"; save(); render(); maybeStartTour();
}

function doSignup(form){
  const fd = new FormData(form), d = Object.fromEntries(fd.entries());
  const isVol = d.role === "volunteer";
  const errs = {name:V.name(d.name), email:V.email(d.email), phone:V.phone(d.phone), location:cityError(d.location), password:V.password(d.password),
    confirm: d.password !== d.confirm ? "Passwords don't match." : "",
    waiver: isVol && !d.waiver ? "Please read and accept the volunteer waiver to continue." : ""};
  if (!errs.email && !Cloud.enabled && state.users.some(u => u.email === d.email.trim().toLowerCase())) errs.email = "An account with this email already exists. Try logging in.";
  if (!showErrors(form, errs)) return;
  const profile = {name:d.name.trim(), email:d.email.trim().toLowerCase(), phone:d.phone.trim(), role:d.role, skills:[], availability:[], zip:"", location:resolveCity(d.location), emergency:"",
    org:isVol ? "" : "Independent organizer", verified:false, reads:[], toured:false, waiverAt:isVol ? new Date().toISOString() : ""};
  if (Cloud.enabled && !ui.demo){
    Cloud.signup(profile, d.password).catch(e => showErrors(form, {email:Cloud.friendly(e)}));
    return;
  }
  const h = hashPassword(d.password);
  const u = DB.add("users", {id:DB.newId("users"), ...profile, passSalt:h.salt, passHash:h.hash});
  state.session.userId = u.id; ui.view = isVol ? "profile" : "dashboard"; save(); render();
  toast(isVol ? "Welcome! Add your skills so we can recommend shifts." : "Welcome! Create your first event to get started.");
  maybeStartTour();
}

function doReset(form){
  const email = String(new FormData(form).get("email")).trim();
  if (V.email(email)) return showErrors(form, {email:V.email(email)});
  Cloud.resetPassword(email)
    .then(() => { ui.authMode = "login"; render(); toast("Check your email for a link to reset your password."); })
    .catch(e => showErrors(form, {email:Cloud.friendly(e)}));
}

function saveProfile(form){
  const fd = new FormData(form), u = currentUser(), location = fd.get("location").trim(), emergency = fd.get("emergency").trim();
  const errs = {name:V.name(fd.get("name")), phone:V.phone(fd.get("phone")), location:cityError(location),
    emergency: emergency.length > 100 ? "Keep this under 100 characters." : ""};
  if (!showErrors(form, errs)) return;
  DB.update("users", u, {name:fd.get("name").trim(), phone:fd.get("phone").trim(), skills:fd.getAll("skills"), availability:fd.getAll("availability"), zip:"", location:resolveCity(location), emergency});
  ui.find.location = location ? placeName(resolveCity(location)) : null;
  save(); render(); toast("Profile saved.");
}

function findOpportunities(form){
  const fd = new FormData(form), u = currentUser(), saved = userLocation(u), q = String(fd.get("q") || "").trim();
  const location = saved ? String(fd.get("location") || placeName(saved)).trim() : "";
  const errs = {q:!saved && !q && fd.get("cat") === "all" ? "Enter an event or place, or choose a cause to search." : "", location:saved ? cityError(location) : ""};
  if (!showErrors(form, errs)) return;
  Object.assign(ui.find, {q, location:saved ? placeName(resolveCity(location)) : null, cat:fd.get("cat"), radius:fd.get("radius") || "any", verifiedOnly:fd.has("verifiedOnly"), match:fd.has("match"), hideFull:fd.has("hideFull")});
  render();
  const results = document.getElementById("search-results"); if (results) results.focus();
}

/* ----- Volunteer sign-ups ----- */

// Sign the current volunteer up for an event, after checking it's allowed.
function signup(eid){
  const u = currentUser(), e = eventById(eid);
  if (e.date < TODAY) return toast("This event has already happened.", "bad");
  if (spotsLeft(e) <= 0) return toast("This event just filled up. You can join the waitlist instead.", "bad");
  const existing = myReg(u.id, eid);
  if (existing && existing.status !== "waitlist") return toast("You're already signed up for this event.", "bad");
  const clash = findClash(u.id, e);
  if (clash) return toast(`This overlaps with ${clash.title} (${timeRange(clash)}) that day.`, "bad");
  if (existing) DB.update("regs", existing, {status:"registered"});
  else DB.add("regs", {id:DB.newId("regs"), userId:u.id, eventId:eid, status:"registered", hours:0});
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
  const r = DB.add("regs", {id:DB.newId("regs"), userId:u.id, eventId:eid, status:"waitlist", hours:0});
  save(); render(); toast(`You're #${waitlistPosition(r)} on the waitlist for ${e.title}.`);
}

/* ----- Events ----- */

function saveEventForm(form){
  const fd = new FormData(form), id = form.dataset.id ? asId(form.dataset.id) : null, old = id ? eventById(id) : null;
  const d = {title:fd.get("title").trim(), category:fd.get("category"), location:fd.get("location").trim(), zip:fd.get("zip").trim(), date:fd.get("date"), start:fd.get("start"), end:fd.get("end"), slots:fd.get("slots"), skills:fd.getAll("skills"), desc:fd.get("desc").trim(),
             bring:fd.get("bring").trim(), wear:fd.get("wear").trim(), minAge:fd.get("minAge").trim()};
  const repeat = Number(fd.get("repeat") || 0), clubId = fd.get("club") ? asId(fd.get("club")) : null;
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
    repeat: !Number.isInteger(repeat) || repeat < 0 || repeat > 12 ? "Choose from 0 to 12 weeks." : "",
  };
  if (!showErrors(form, errs)) { $("#ef-err").textContent = "Fix the highlighted fields to continue."; return; }
  if (clubId && !isClubManager(clubId)) return toast("You can only post events for clubs you manage.", "bad");
  const ev = {...d, slots:n, minAge:age, clubId, updatedAt:TODAY};
  let msg;
  if (old){
    // Tell everyone signed up if the when or where changed
    const changed = [old.date !== ev.date && "date", (old.start !== ev.start || old.end !== ev.end) && "time", (old.location !== ev.location || (old.zip || "") !== ev.zip) && "location"].filter(Boolean);
    DB.update("events", old, ev);
    if (changed.length){
      [...activeRegs(old.id), ...waitlistFor(old.id)].filter(r => r.status !== "attended" && r.status !== "no-show")
        .forEach(r => notify(r.userId, `${old.title} changed ${changed.join(" and ")}: now ${fmtDate(old.date)}, ${timeRange(old)}, at ${old.location}.`, null, old.clubId));
    }
    const moved = fillFromWaitlist(old);                            // more spots? move people off the waitlist
    msg = `Event updated.${changed.length ? " Volunteers were told about the change." : ""}${moved.length ? ` ${moved.length} moved off the waitlist.` : ""}`;
  } else {
    const me = currentUser().id;
    for (let k = 0; k <= repeat; k++){
      DB.add("events", {id:DB.newId("events") + k, ...ev, date:k ? iso(new Date(parseDate(ev.date).getTime() + k * 7 * 86400000)) : ev.date, postedBy:me, postedAt:TODAY});
    }
    msg = repeat ? `${ev.title} was created for ${repeat + 1} weeks in a row.` : `${ev.title} was created.`;
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
  const a = DB.add("announcements", {id:DB.newId("announcements"), title, body, audience:fd.get("audience"), authorId:currentUser().id, at:new Date().toISOString()});
  save(); render(); toast(`Posted. It reaches ${reach(a)} ${reach(a) === 1 ? "volunteer" : "volunteers"}.`);
}

// A volunteer flags a listing that looks wrong, unsafe, or like a scam.
function submitConcern(form){
  const fd = new FormData(form), e = eventById(asId(form.dataset.id)), u = currentUser();
  const reason = fd.get("reason"), details = fd.get("details").trim();
  const errs = {
    reason: !reason ? "Choose what's wrong." : "",
    details: reason === "Something else" && details.length < 5 ? "Tell us a little about the problem." : "",
  };
  if (!showErrors(form, errs)) return;
  if (state.concerns.some(c => c.eventId === e.id && c.userId === u.id && c.status === "open")){
    closeModal(); return toast("You already reported this listing. A coordinator is reviewing it.");
  }
  DB.add("concerns", {id:DB.newId("concerns"), eventId:e.id, userId:u.id, reason, details, at:new Date().toISOString(), status:"open"});
  save(); closeModal(); render(); toast("Thanks for reporting. A coordinator will review this listing.");
}

// Save the organization's name, home ZIP, description, and waiver from Settings.
function saveOrgSettings(form){
  const fd = new FormData(form), name = fd.get("name").trim(), zip = fd.get("zip").trim(), about = fd.get("about").trim(), waiver = fd.get("waiver").trim();
  const errs = {
    name: name.length < 2 ? "Enter your organization's name (at least 2 characters)." : !/[A-Za-z]/.test(name) ? "The name needs at least one letter." : "",
    zip: zipError(zip),
    about: about.length > 160 ? "Keep the description under 160 characters." : "",
    waiver: waiver.length < 40 ? "The waiver needs at least a couple of sentences." : waiver.length > 3000 ? "Keep the waiver under 3,000 characters." : "",
  };
  if (!showErrors(form, errs)) return;
  DB.setOrg({name, zip, about, waiver});
  save(); render(); toast(`Saved. ${name} in ${placeName(lookupZip(zip))}.`);
}

// Live mode: give a brand-new organization a few sample events to start from.
function addSampleEvents(){
  const me = currentUser().id, sample = seed().events.filter(e => e.date > TODAY && e.postedBy === 1).slice(0, 6);
  sample.forEach((e, k) => DB.add("events", {...e, id:DB.newId("events") + k, postedBy:me, postedAt:TODAY, updatedAt:TODAY}));
  save(); render(); toast(`Added ${sample.length} sample events. Edit or delete them anytime.`);
}

/* ----- Two-step confirm actions (the button says "Confirm ..." after the first click) ----- */

function confirmAction(kind, id){
  if (kind === "cancel" || kind === "leave"){
    const r = state.regs.find(x => x.id === id), e = eventById(r.eventId), wasWaiting = r.status === "waitlist";
    DB.update("regs", r, {status:"cancelled"});
    if (wasWaiting) return toast(`You left the waitlist for ${e.title}.`);
    const moved = fillFromWaitlist(e);
    toast(moved.length ? "Your shift was cancelled. The next person on the waitlist got your spot." : "Your shift was cancelled.");
  }
  if (kind === "delete"){
    const e = eventById(id);
    if (e.date >= TODAY) activeRegs(id).concat(waitlistFor(id)).forEach(r => notify(r.userId, `${e.title} on ${fmtDate(e.date)} was cancelled by the organizer. Sorry for the change.`, null, e.clubId));
    state.regs.filter(r => r.eventId === id).forEach(r => DB.remove("regs", r.id));
    state.announcements.filter(a => a.audience === String(id)).forEach(a => DB.remove("announcements", a.id));
    DB.remove("events", id);
    toast(`${e.title} was deleted. Anyone signed up was told.`);
  }
  if (kind === "ann"){ DB.remove("announcements", id); toast("Announcement deleted."); }
  if (kind === "verify" || kind === "unverify"){
    const u = userById(id);
    DB.update("users", u, kind === "verify" ? {verified:true, verifiedAt:TODAY} : {verified:false, verifiedAt:""});
    toast(kind === "verify" ? `${u.name} is now a verified organizer.` : `${u.name} is no longer verified.`);
  }
  if (kind === "delacct") return deleteMyAccount();
  if (kind === "leaveclub" || kind === "removemember"){
    const m = state.memberships.find(x => x.id === id), c = clubById(m.clubId);
    DB.remove("memberships", m.id);
    toast(kind === "leaveclub" ? `You left ${c.name}.` : `${m.name} was removed from ${c.name}.`);
  }
  if (kind === "dellog"){ DB.remove("hourLogs", id); toast("Logged hours deleted."); }
  if (kind === "newcode"){ const c = clubById(id); setClubCode(c, makeCode(c.short)); toast("New join code made. The old one no longer works."); }
  if (kind === "reset"){
    const keep = {prefs:state.prefs, session:state.session, org:state.org};   // keep your organization settings
    state = Object.assign(seed(), keep);
    toast("Demo data was reset.");
  }
}

// Privacy: a person can delete their own account. Upcoming sign-ups are cancelled first
// so their spots open up for others.
function deleteMyAccount(){
  const u = currentUser();
  state.regs.filter(r => r.userId === u.id && (r.status === "registered" || r.status === "waitlist") && eventById(r.eventId).date >= TODAY)
    .forEach(r => DB.update("regs", r, {status:"cancelled"}));
  if (DB.live) return Cloud.deleteAccount().then(() => toast("Your account was deleted.")).catch(e => toast(Cloud.friendly(e), "bad"));
  DB.remove("users", u.id);
  state.session.userId = null; ui.view = "dashboard"; save(); render(); toast("Your account was deleted.");
}

/* ----- Pop-ups ----- */

// The right event pop-up for the person's role.
const eventPopup = (e, u) => u.role === "coordinator" ? eventDetail(e) : volunteerEventPopup(e, u);
function showEventPopup(id){
  openModal(eventPopup(eventById(id), currentUser()));
  ui.modalEvent = id;      // lets render() refresh this pop-up after a sign-up
}
function copyText(text, what){
  try { navigator.clipboard.writeText(text).then(() => toast(`Copied ${what}.`), () => copyCSV(text)); }
  catch(e){ copyCSV(text); }
}

/* ----- Button handlers ----- */

const handlers = {
  homeDisplay: () => { ui.homeDisplay = !ui.homeDisplay; render(); },
  // Navigation and account
  nav: (v) => {
    const u = currentUser();
    if (u.role === "volunteer" && v === "manage") v = "clubs";
    if (v === "news" && u.role === "volunteer"){            // remember what was new, then mark it all read
      ui.newsSeen = readSet(u.id);
      ui.newNotices = new Set(noticesFor(u.id).filter(n => !n.read).map(n => n.id));
      markAllRead(u); save();
    }
    ui.view = v; ui.armed = null; closeModal(false);
    if (ui.tour){ const i = tourSteps(u).findIndex(step => step.view === v); if (i >= 0) ui.tour.i = i; }
    render();
    if (ui.tour) return focusTourStep();
    const m = $("#page-title") || $("#main"); if (m) m.focus({preventScroll:true}); window.scrollTo(0, 0);
  },
  authmode: (v) => { ui.authMode = v; render(); },
  demo: (v) => {
    if (Cloud.enabled && !ui.demo) Cloud.enterDemo();       // explore sample data without touching live data
    Object.assign(ui.find, {q:"", location:null}); ui.disclosures.clear();
    state.session.userId = asId(v); ui.view = "dashboard"; save(); render();
    toast(`Signed in as ${userById(asId(v)).name}.`); maybeStartTour();
  },
  logout: () => {
    ui.authMode = "login"; ui.armed = null; ui.tour = null; ui.cal = TODAY.slice(0, 7); ui.find.mode = ui.ev.mode = "list"; ui.find.location = null; ui.find.q = ""; ui.disclosures.clear(); ui.view = "dashboard";
    if (DB.live) return Cloud.logout();
    state.session.userId = null; save();
    if (ui.demo) return Cloud.exitDemo();
    render();
  },
  font: (v) => { state.prefs.font = Math.max(13, Math.min(21, state.prefs.font + +v)); save(); applyPrefs(); },
  contrast: () => { state.prefs.hc = !state.prefs.hc; save(); render(); },
  menu: () => { ui.menu = !ui.menu; render(); const target = ui.menu ? $("#account-panel button") : $("#account-trigger"); if (target) target.focus(); },
  setTheme: (v) => { state.prefs.theme = v; save(); render(); },
  theme: () => { const order = ["auto", "light", "dark"]; state.prefs.theme = order[(order.indexOf(state.prefs.theme || "auto") + 1) % 3]; save(); render(); },
  waiver: () => openModal(`<div class="spread"><h2>Volunteer waiver</h2><button class="btn secondary sm" data-act="close">Close</button></div><div class="waiver-text">${esc(state.org.waiver || DEFAULT_WAIVER).replace(/\n/g, "<br>")}</div>`),

  // Volunteer sign-ups
  signup: (_, id) => signup(asId(id)),
  waitlist: (_, id) => joinWaitlist(asId(id)),
  dismiss: (_, id) => { const n = state.notices.find(x => x.id === asId(id)); if (n) DB.update("notices", n, {read:true}); save(); render(); },

  // Two-step confirm buttons
  arm: (v) => { ui.armed = v; render(); },
  confirm: (v) => { const i = v.indexOf(":"), kind = v.slice(0, i), id = asId(v.slice(i + 1)); ui.armed = null; confirmAction(kind, id); save(); render(); },

  // Events and check-in
  newEvent: () => openModal(eventForm(null)),
  editEvent: (_, id) => openModal(eventForm(eventById(asId(id)))),
  dupEvent: (_, id) => {                                          // same event, one week later
    const e = eventById(asId(id)), next = e.date < TODAY ? addDays(7) : iso(new Date(parseDate(e.date).getTime() + 7 * 86400000));
    openModal(eventForm({...e, id:null, date:next}));
  },
  evtab: (v) => { ui.ev.tab = v; render(); },
  goCheckin: (_, id) => { ui.ciEvent = asId(id); handlers.nav("checkin"); },
  mark: (v, id) => { const r = state.regs.find(x => x.id === asId(id)), e = eventById(r.eventId); DB.update("regs", r, {status:v, hours:v === "attended" ? duration(e) : 0}); save(); render(); },
  allPresent: (_, id) => {
    const e = eventById(asId(id)); let k = 0;
    activeRegs(e.id).forEach(r => { if (r.status === "registered"){ DB.update("regs", r, {status:"attended", hours:duration(e)}); k++; } });
    save(); render(); toast(`Marked ${k} ${k === 1 ? "volunteer" : "volunteers"} present.`);
  },
  copyEmails: (_, id) => {
    const list = activeRegs(asId(id)).map(r => userById(r.userId).email).filter(Boolean);
    if (!list.length) return toast("No email addresses to copy yet.", "bad");
    copyText(list.join(", "), `${list.length} email ${list.length === 1 ? "address" : "addresses"}. Paste them into your email's To or Bcc line`);
  },

  // Calendar
  viewMode: (v) => { const [key, mode] = v.split(":"); ui[key].mode = mode; render(); },
  calMonth: (v) => {
    if (+v === 0) ui.cal = TODAY.slice(0, 7);
    else { const [y, m] = ui.cal.split("-").map(Number); ui.cal = iso(new Date(y, m - 1 + +v, 1)).slice(0, 7); }
    render();
  },
  calEvent: (_, id) => showEventPopup(asId(id)),

  // Event details, calendar file, and concerns
  moreInfo: (_, id) => showEventPopup(asId(id)),
  ics: (_, id) => downloadICS(eventById(asId(id))),
  concern: (_, id) => { openModal(concernForm(eventById(asId(id)))); },
  concerns: () => openModal(concernsModal()),
  resolve: (_, id) => {
    const c = state.concerns.find(x => x.id === asId(id)); DB.update("concerns", c, {status:"resolved"}); save(); render();
    if ($("#modal").innerHTML) openModal(concernsModal());           // refresh the review list
    toast("Concern marked resolved.");
  },
  sampleEvents: () => addSampleEvents(),

  // Clubs
  logHours: () => openModal(logForm(currentUser())),
  manageClub: (_, id) => { ui.club = asId(id); ui.expandClub = ui.club; handlers.nav(currentUser().role === "volunteer" ? "clubs" : "manage"); },
  pickClub: (_, id) => { ui.club = asId(id); render(); },
  newClub: () => openModal(clubForm(null)),
  editClub: (_, id) => openModal(clubForm(clubById(asId(id)))),
  newClubEvent: (_, id) => openModal(eventForm({...{title:"", category:CATS[0], date:addDays(7), start:"15:30", end:"17:30", location:"", zip:"", slots:10, skills:[], desc:"", bring:"", wear:"", minAge:""}, id:null, clubId:asId(id)})),
  copyCode: (v) => copyText(v, `the join code ${v}`),
  approveLog: (_, id) => reviewLog(asId(id), "approved"),
  rejectLog: (_, id) => {
    const note = (document.getElementById(`note-${id}`) || {}).value || "";
    if (note.trim().length < 5){ toast("Add a short reason so the member knows what to fix.", "bad"); const el = document.getElementById(`note-${id}`); if (el) el.focus(); return; }
    reviewLog(asId(id), "rejected", note.trim());
  },
  toggleOfficer: (_, id) => {
    const m = state.memberships.find(x => x.id === id);
    if (!isAdviser(m.clubId)) return toast("Only the club's adviser can change officers.", "bad");
    DB.update("memberships", m, {role:m.role === "officer" ? "member" : "officer"}); save(); render();
    toast(`${m.name} is now ${m.role === "officer" ? "an officer" : "a member"}.`);
  },

  // Reports, exports, printing
  preset: (v) => { ui.rep.from = addDays(-+v); ui.rep.to = TODAY; render(); },
  csv: () => { if (ui.csv) copyCSV(ui.csv.build()); },
  csvDownload: () => { if (ui.csv) downloadCSV(ui.csv.name, ui.csv.build()); const menu = $("#hours-actions"); if (menu){ menu.open = false; menu.querySelector("summary").focus(); } },
  clubCsvDownload: (_, id) => downloadClubCSV(asId(id)),
  print: () => printView("page"),
  cert: (_, id) => openModal(certificate(userById(asId(id)))),
  printCert: () => printView("modal"),

  // Pop-ups
  close: () => closeModal(),
  overlay: (_, __, ev) => { if (ev.target.classList.contains("overlay")) closeModal(); },

  // Guided tour
  tour: () => startTour(),
  tourStep: (v) => tourStep(+v),
  tourEnd: () => endTour(),
};
