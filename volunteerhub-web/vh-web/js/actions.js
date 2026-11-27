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
  if (V.email(email) || pw.length > 4096){ err.textContent = "Enter a valid email and password."; return; }
  if (Cloud.enabled && !ui.demo){                                 // live mode: Firebase checks the password
    err.textContent = "";
    return runPending("auth", "Signing in…", form.querySelector('[type="submit"]'), () => Cloud.login(email, pw),
      null, error => authFormError(form.id, null, error));
  }
  const u = state.users.find(x => x.email === email);
  if (!u || !checkPassword(pw, u)){ err.textContent = "That email and password don't match. Try a demo account below."; return; }
  state.session.userId = u.id; ui.view = "dashboard"; save(); render(); maybeStartTour();
}

function doSignup(form){
  const fd = new FormData(form), d = Object.fromEntries(fd.entries());
  const isVol = d.role === "volunteer";
  const errs = {name:V.name(d.name), email:V.email(d.email), phone:V.phone(d.phone), location:cityError(d.location), password:V.password(d.password, Cloud.enabled && !ui.demo),
    confirm: d.password !== d.confirm ? "Passwords don't match." : "",
    waiver: isVol && !d.waiver ? "Please read and accept the volunteer waiver to continue." : ""};
  if (!errs.email && !Cloud.enabled && state.users.some(u => u.email === d.email.trim().toLowerCase())) errs.email = "An account with this email already exists. Try logging in.";
  if (!showErrors(form, errs)) return;
  const profile = {name:d.name.trim(), email:d.email.trim().toLowerCase(), phone:d.phone.trim(), role:d.role, skills:[], availability:[], zip:"", location:resolveCity(d.location), emergency:"",
    org:isVol ? "" : "Independent organizer", verified:false, reads:[], toured:false, waiverAt:isVol ? new Date().toISOString() : ""};
  if (Cloud.enabled && !ui.demo){
    return runPending("auth", "Creating your account…", form.querySelector('[type="submit"]'), () => Cloud.signup(profile, d.password),
      null, error => authFormError(form.id, "email", error));
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
  return runPending("auth", "Sending reset link…", form.querySelector('[type="submit"]'), () => Cloud.resetPassword(email),
    () => { if (ui.authMode === "reset") navigatePublic("login"); toast("Check your email for a link to reset your password."); },
    error => authFormError(form.id, "email", error));
}

function saveProfile(form){
  const fd = new FormData(form), u = currentUser(), location = fd.get("location").trim(), emergency = fd.get("emergency").trim();
  const errs = {name:V.name(fd.get("name")), phone:V.phone(fd.get("phone")), location:cityError(location),
    emergency:V.text(emergency, "the emergency contact", 0, 100)};
  if (!showErrors(form, errs)) return;
  DB.update("users", u, {name:fd.get("name").trim(), phone:fd.get("phone").trim(), skills:fd.getAll("skills"), availability:fd.getAll("availability"), zip:"", location:resolveCity(location), emergency});
  ui.find.location = location ? placeName(resolveCity(location)) : null;
  save(); render(); toast("Profile saved.");
}

function findOpportunities(form){
  const fd = new FormData(form), u = currentUser(), saved = userLocation(u), q = String(fd.get("q") || "").trim();
  const location = saved ? String(fd.get("location") || placeName(saved)).trim() : "";
  const errs = {q:!saved && !q && fd.get("cat") === "all" ? "Enter an event or place, or choose a cause to search." : V.text(q, "the search", 0, 120), location:saved ? cityError(location) : ""};
  if (!showErrors(form, errs)) return;
  Object.assign(ui.find, {q, location:saved ? placeName(resolveCity(location)) : null, cat:fd.get("cat"), radius:fd.get("radius") || "any"});
  render();
  const results = document.getElementById("search-results"); if (results) results.focus();
}

/* ----- Volunteer sign-ups ----- */

function confirmShiftSignup(eid, waitlist, opener){
  const event = eventById(eid);
  if (eventHasEnded(event)) return toast("This event has already ended.", "bad");
  const fields = ["title","date","start","end","location"];
  const shown = fields.map(field => event[field]);
  openConfirmation({
    title:waitlist ? "Join the waitlist?" : "Sign up for this shift?",
    event, key:`shift:${eid}`, opener,
    detail:waitlist ? "You’ll be signed up automatically if a spot opens and the shift fits your schedule." : "This adds the shift to My schedule.",
    label:waitlist ? "Join waitlist" : "Confirm sign-up",
  }, trigger => {
    const latest = eventById(eid);
    if (latest && fields.some((field, i) => latest[field] !== shown[i])) return confirmationError(trigger, "This shift’s details changed. Go back to review them.");
    return waitlist ? joinWaitlist(eid, trigger) : signup(eid, trigger);
  });
}

// Sign the current volunteer up for an event, after checking it's allowed.
function signup(eid, trigger){
  const u = currentUser(), e = eventById(eid);
  if (eventHasEnded(e)) return confirmationError(trigger, "This event has already ended.");
  if (u?.role !== "volunteer" || !canSeeEvent(e,u)) return confirmationError(trigger, "This shift is no longer available to you.");
  if (spotsLeft(e) <= 0) return confirmationError(trigger, "This shift filled up. Go back to review available shifts.");
  const existing = myReg(u.id, eid) || (DB.live && state.regs.find(r => r.id === DB.registrationId(eid, u.id)));
  if (existing && !["waitlist","cancelled"].includes(existing.status)) return confirmationError(trigger, "You're already signed up for this event.");
  const clash = findClash(u.id, e);
  if (clash) return confirmationError(trigger, `This overlaps with ${clash.title} (${timeRange(clash)}) that day.`);
  const success = () => {
    const registration = myReg(u.id, eid);
    if (registration?.status === "waitlist") toast(`You joined the waitlist for ${e.title}.`);
    else toast(`You're signed up for ${e.title} on ${fmtDate(e.date)}.`);
  };
  const record = {id:DB.registrationId(eid, u.id), userId:u.id, eventId:eid, status:"registered", hours:0};
  if (DB.live) return saveLiveRecords(`shift:${eid}`, "Saving your sign-up…", trigger, "regs",
    [existing ? {id:existing.id, fields:{status:"registered"}} : {id:record.id, record}], success);
  if (existing) DB.update("regs", existing, {status:"registered"});
  else DB.add("regs", record);
  save(); render(); success();
}

// Add the current volunteer to the end of a full event's waitlist.
function joinWaitlist(eid, trigger){
  const u = currentUser(), e = eventById(eid);
  if (eventHasEnded(e)) return confirmationError(trigger, "This event has already ended.");
  if (u?.role !== "volunteer" || !canSeeEvent(e,u)) return confirmationError(trigger, "This shift is no longer available to you.");
  if (myReg(u.id, eid)) return confirmationError(trigger, "You're already on the list for this event.");
  if (spotsLeft(e) > 0) return signup(eid, trigger);                       // a spot is open, so just sign up
  const clash = findClash(u.id, e);
  if (clash) return confirmationError(trigger, `This overlaps with ${clash.title} (${timeRange(clash)}) that day.`);
  const r = {id:DB.registrationId(eid, u.id), userId:u.id, eventId:eid, status:"waitlist", hours:0};
  const previous = DB.live && state.regs.find(x => x.id === r.id);
  if (DB.live) return saveLiveRecords(`shift:${eid}`, "Joining waitlist…", trigger, "regs", [previous ? {id:r.id, fields:{status:"waitlist"}} : {id:r.id, record:r}],
    () => toast(`You joined the waitlist for ${e.title}.`));
  DB.add("regs", r);
  save(); render(); toast(`You're #${waitlistPosition(r)} on the waitlist for ${e.title}.`);
}

function confirmShiftCancellation(id, opener){
  const reg = state.regs.find(r => r.id === id), event = reg && eventById(reg.eventId);
  if (reg?.userId !== currentUser()?.id || eventHasEnded(event) || !["registered","waitlist"].includes(reg.status)) return;
  const wasWaiting = reg.status === "waitlist", confirmedStatus = reg.status;
  openConfirmation({
    title:wasWaiting ? "Leave this waitlist?" : "Cancel your sign-up?",
    event, key:`shift:${event.id}`, compact:true, opener,
    detail:wasWaiting ? "You’ll lose your place in line." : "Your spot will open up for another volunteer.",
    label:wasWaiting ? "Leave waitlist" : "Cancel sign-up",
  }, trigger => {
    const latest = state.regs.find(r => r.id === id), shift = eventById(event.id);
    if (latest?.userId !== currentUser()?.id || latest?.status !== confirmedStatus || eventHasEnded(shift)){
      return confirmationError(trigger, "Your shift status changed. Go back to review it.");
    }
    const done = () => {
      const moved = wasWaiting ? [] : fillFromWaitlist(shift);
      if (ui.modalEvent === shift.id) closeModal();
      toast(wasWaiting ? `You left the waitlist for ${shift.title}.`
        : moved.length ? "Your shift was cancelled. The next person on the waitlist got your spot." : "Your shift was cancelled.");
    };
    const fields = {status:"cancelled"};
    if (DB.live) return saveLiveRecords(`shift:${shift.id}`, wasWaiting ? "Leaving waitlist…" : "Cancelling shift…", trigger,
      "regs", [{id, fields}], done);
    DB.update("regs", latest, fields);
    done(); save(); render();
  });
}

// Confirm the primary save before showing success. Errors leave the original control
// and any form inputs available so the user can correct the problem or try again.
function saveLiveRecords(key, label, trigger, coll, changes, success, failure){
  return runPending(key, label, trigger, () => DB.commit(coll, changes),
    () => { success(); render(); },
    failure || (error => confirmationError(trigger, `Couldn't complete that change. ${Cloud.friendly(error)}`)));
}

/* ----- Events ----- */

function canManageEvent(e){
  const user = currentUser();
  return !!user && ((user.role === "coordinator" && (!DB.live || DB.isVerifiedCoordinator(user))) || (!!e.clubId && isClubManager(e.clubId,user)));
}

function saveEventForm(form, confirmButton){
  const fd = new FormData(form), id = form.dataset.id ? asId(form.dataset.id) : null, old = id ? eventById(id) : null;
  if (id && !old) return confirmationError(confirmButton, "This event is no longer available.");
  const d = {title:fd.get("title").trim(), category:fd.get("category"), location:fd.get("location").trim(), zip:fd.get("zip").trim(), date:fd.get("date"), start:fd.get("start"), end:fd.get("end"), slots:fd.get("slots"), skills:fd.getAll("skills"), desc:fd.get("desc").trim(),
             bring:fd.get("bring").trim(), wear:fd.get("wear").trim(), minAge:fd.get("minAge").trim()};
  const repeat = Number(fd.get("repeat") || 0), clubId = fd.get("club") ? asId(fd.get("club")) : null;
  const n = Number(d.slots), signed = old ? activeRegs(old.id).length : 0, age = d.minAge === "" ? null : Number(d.minAge);
  // A custom address can supply its own ZIP. Saved venues already have a known position.
  const known = venueOf({location:d.location}).east !== undefined;
  const addressZip = d.location.match(/\b[0-9]{5}(?=(?:-[0-9]{4})?(?:[ ,]+USA)?$)/i)?.[0];
  if (!d.zip && !known && lookupZip(addressZip)) d.zip = addressZip;
  if (known && d.zip === eventZipInfo({location:d.location}).zip) d.zip = "";
  const errs = {
    title: V.text(d.title, "the event name", 3, 80),
    location: V.text(d.location, "the location", 1, 160),
    desc: !d.desc && old?.desc !== "" ? "Enter a description of what volunteers will do." : V.text(d.desc, "the description", 0, 2000, true),
    bring: V.text(d.bring, "what to bring", 0, 120),
    wear: V.text(d.wear, "what to wear", 0, 120),
    zip: d.zip ? zipError(d.zip) : "",
    minAge: age !== null && (!Number.isInteger(age) || age < 0 || age > 21) ? "Enter a whole number from 0 to 21, or leave it blank." : "",
    date: !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ? "Choose a date." : (d.date < TODAY && (!old || old.date !== d.date)) ? "The date can't be in the past." : "",
    start: !/^\d{2}:\d{2}$/.test(d.start) ? "Choose a start time." : "",
    end: !/^\d{2}:\d{2}$/.test(d.end) ? "Choose an end time." : (d.start && d.end <= d.start) ? "End time must be after the start time." : "",
    slots: !Number.isInteger(n) || n < 1 ? "Enter a whole number of at least 1." : n > 200 ? "The maximum is 200 volunteers." : n < signed ? `${signed} people are already signed up, so you need at least ${signed} spots.` : "",
    repeat: !Number.isInteger(repeat) || repeat < 0 || repeat > 12 ? "Choose from 0 to 12 weeks." : "",
  };
  if (["bring","wear","zip","minAge","repeat"].some(key => errs[key])) form.querySelector("details").open = true;
  if (!showErrors(form, errs)){
    $("#ef-err").textContent = "Fix the highlighted fields to continue.";
    if (confirmButton) return confirmationError(confirmButton, "Go back to review the highlighted fields.");
    return;
  }
  if (clubId && !isClubManager(clubId)) return confirmationError(confirmButton, "You can only post events for clubs you manage.");
  const user = currentUser();
  if ((!clubId && !canManageEvent({clubId:null})) || (old && !canManageEvent(old))) return confirmationError(confirmButton, "You no longer have permission to save this event.");
  const ev = {...d, slots:n, minAge:age, clubId, updatedAt:TODAY};
  const changed = old && [old.date !== ev.date && "date", (old.start !== ev.start || old.end !== ev.end) && "time",
    (old.location !== ev.location || (old.zip || "") !== ev.zip) && "location"].filter(Boolean);
  const key = `event:${id || "new"}`;
  const opener = form.querySelector('[type="submit"]');
  if (!confirmButton && (!old || changed.length || ev.clubId !== (old.clubId || null) || ev.slots !== old.slots)){
    const audience = clubId ? `${clubById(clubId).short} members` : "all volunteers";
    const capacity = `Open to ${audience}, with a maximum of ${n} ${n === 1 ? "volunteer" : "volunteers"}.`;
    const effect = old ? (changed.length ? "Volunteers signed up or on the waitlist will receive an update." : capacity)
      : repeat ? `Creates ${repeat + 1} weekly events starting on this date. ${capacity}` : capacity;
    return openConfirmation({title:old ? "Save event changes?" : "Create this event?", event:ev, detail:effect,
      label:old ? "Confirm changes" : "Confirm create event", key, opener}, trigger => saveEventForm(form,trigger));
  }
  const finishUpdate = () => {
    const event = eventById(id);
    if (changed.length){
      [...activeRegs(id), ...waitlistFor(id)].filter(r => r.status !== "attended" && r.status !== "no-show")
        .forEach(r => notify(r.userId, `${event.title} changed ${changed.join(" and ")}: now ${fmtDate(event.date)}, ${timeRange(event)}, at ${event.location}.`, null, event.clubId));
    }
    const moved = fillFromWaitlist(event);
    return DB.live ? "Event updated."
      : `Event updated.${changed.length ? " Volunteers were told about the change." : ""}${moved.length ? ` ${moved.length} moved off the waitlist.` : ""}`;
  };
  const newMessage = repeat ? `${ev.title} was created for ${repeat + 1} weeks in a row.` : `${ev.title} was created.`;
  const seriesId = DB.live && !old ? DB.newId("events") : null;
  const makeEvent = k => ({id:(seriesId || DB.newId("events")) + k, ...ev,
    date:k ? iso(new Date(parseDate(ev.date).getTime() + k * 7 * 86400000)) : ev.date, postedBy:user.id, postedAt:TODAY});
  if (DB.live){
    const changes = old ? [{id, fields:ev}] : Array.from({length:repeat + 1}, (_, k) => {
      const record = makeEvent(k);
      return {id:record.id, record};
    });
    return saveLiveRecords(key, old ? "Saving event changes…" : "Creating event…", confirmButton || opener,
      "events", changes, () => {
        if (form.isConnected) closeModal();
        toast(old ? finishUpdate() : newMessage);
      }, err => {
        const message = `Couldn't save the event. ${Cloud.friendly(err)}`;
        if (confirmButton) confirmationError(confirmButton,message);
        else if (form.isConnected) form.querySelector("#ef-err").textContent = message;
        else toast(message, "bad");
      });
  }
  if (old) DB.update("events", old, ev);
  else for (let k = 0; k <= repeat; k++) DB.add("events", makeEvent(k));
  const message = old ? finishUpdate() : newMessage;
  save(); closeModal(); render(); toast(message);
}

function confirmEventDeletion(id, opener){
  const event = eventById(id);
  if (!event || !canManageEvent(event)) return;
  const upcoming = event.date >= TODAY;
  openConfirmation({
    title:"Delete this event?", event, key:`event:${id}`, compact:true, opener,
    detail:upcoming ? "This removes the event and its sign-ups. Volunteers signed up or waiting for a spot will receive an update."
      : "This removes the event and its attendance records.",
    label:"Delete event",
  }, trigger => {
    const latest = eventById(id);
    if (!latest || !canManageEvent(latest)) return confirmationError(trigger, "This event is no longer available to delete.");
    if (latest.date >= TODAY) activeRegs(id).concat(waitlistFor(id)).forEach(r => notify(r.userId, `${latest.title} on ${fmtDate(latest.date)} was cancelled by the organizer.`, null, latest.clubId));
    state.regs.filter(r => r.eventId === id).forEach(r => DB.remove("regs",r.id));
    state.announcements.filter(a => a.audience === String(id)).forEach(a => DB.remove("announcements",a.id));
    DB.remove("events",id);
    if (ui.modalEvent === id) closeModal();
    save(); render(); toast(`${latest.title} was deleted.`);
  });
}

function confirmWalkIn(form){
  const uid = asId(new FormData(form).get("user")), event = eventById(ui.ciEvent);
  if (!uid) return toast("Choose a volunteer first.", "bad");
  if (!event || !canManageEvent(event) || event.date > TODAY) return toast("Check-in is unavailable for this event.", "bad");
  if (spotsLeft(event) <= 0) return toast("This event is full. Raise the number of volunteers needed in Events first.", "bad");
  const name = userById(uid).name, hours = duration(event), key = `attendance:${event.id}`;
  openConfirmation({
    title:"Add this walk-in?", event, key, opener:form.querySelector('[type="submit"]'),
    detail:`${name} will be marked present and credited with ${fmtH(hours)} service hours.`,
    label:"Confirm walk-in",
  }, trigger => {
    const latest = eventById(event.id);
    if (!latest || !canManageEvent(latest) || latest.date > TODAY) return confirmationError(trigger, "Check-in is unavailable for this event.");
    if (spotsLeft(latest) <= 0) return confirmationError(trigger, "This event is full. Raise the maximum in Events first.");
    if (latest.clubId && !membershipOf(latest.clubId,uid)) return confirmationError(trigger, "This volunteer is no longer a member of the club.");
    if (duration(latest) !== hours) return confirmationError(trigger, "This event’s duration changed. Go back to review the roster.");
    const existing = state.regs.find(r => r.userId === uid && r.eventId === latest.id);
    if (existing && HOLDS_SPOT.includes(existing.status)) return confirmationError(trigger, "This volunteer is already on the roster.");
    const fields = {status:"attended", hours};
    const record = {id:DB.registrationId(latest.id,uid), userId:uid, eventId:latest.id, ...fields};
    const done = () => toast(`${name} was added and marked present.`);
    if (DB.live) return saveLiveRecords(key, "Adding walk-in…", trigger, "regs",
      [existing ? {id:existing.id, fields} : {id:record.id, record}], done);
    if (existing) DB.update("regs",existing,fields);
    else DB.add("regs",record);
    save(); render(); done();
  });
}

function postAnnouncement(form){
  const fd = new FormData(form), title = fd.get("title").trim(), body = fd.get("body").trim();
  const errs = {
    title:V.text(title, "the headline", 3, 100),
    body:V.text(body, "the message", 10, 3000, true),
  };
  if (!showErrors(form, errs)) return;
  const audience = fd.get("audience"), event = eventById(asId(audience));
  if (!event && audience !== "all") return toast("Choose who should receive this announcement.", "bad");
  const recipientIds = event ? [...new Set([...activeRegs(event.id), ...waitlistFor(event.id)].map(r => r.userId))] : [];
  if (recipientIds.length > 500) return toast("This group exceeds the 500-person limit for a targeted announcement.", "bad");
  const a = DB.add("announcements", {id:DB.newId("announcements"), title, body, audience, recipientIds, authorId:currentUser().id, at:new Date().toISOString()});
  save(); closeModal(); render(); toast(`Posted. It reaches ${reach(a)} ${reach(a) === 1 ? "volunteer" : "volunteers"}.`);
}

// A volunteer flags a listing that looks wrong, unsafe, or like a scam.
function submitConcern(form){
  const fd = new FormData(form), e = eventById(asId(form.dataset.id)), u = currentUser();
  const reason = fd.get("reason"), details = fd.get("details").trim();
  const errs = {
    reason: !reason ? "Choose what's wrong." : "",
    details: V.text(details, "the details", reason === "Something else" ? 5 : 0, 500, true),
  };
  if (!showErrors(form, errs)) return;
  if (state.concerns.some(c => c.eventId === e.id && c.userId === u.id && c.status === "open")){
    closeModal(); return toast("You already reported this listing. A coordinator is reviewing it.");
  }
  DB.add("concerns", {id:DB.newId("concerns"), eventId:e.id, userId:u.id, reason, details, at:new Date().toISOString(), status:"open"});
  save(); closeModal(); render(); toast("Thanks for reporting. A site admin will review this listing.");
}

// Save the organization's name, home ZIP, description, and waiver from Settings.
function saveOrgSettings(form){
  const fd = new FormData(form), name = fd.get("name").trim(), zip = fd.get("zip").trim(), about = fd.get("about").trim(), waiver = fd.get("waiver").trim();
  const errs = {
    name:V.text(name, "the organization name", 2, 60),
    zip: zipError(zip),
    about:V.text(about, "the description", 0, 160, true),
    waiver:V.text(waiver, "the waiver", 40, 3000, true),
  };
  if (!showErrors(form, errs)) return;
  DB.setOrg({name, zip, about, waiver});
  save(); render(); toast(`Saved. ${name} in ${placeName(lookupZip(zip))}.`);
}

// Live mode: give a brand-new organization a few sample events to start from.
function addSampleEvents(){
  const me = currentUser().id, sample = seed().events.filter(e => e.date > TODAY && e.postedBy === 1).slice(0, 6);
  sample.forEach((e, k) => DB.add("events", {...e, id:DB.newId("events") + k, clubId:null, postedBy:me, postedAt:TODAY, updatedAt:TODAY}));
  save(); render(); toast(`Added ${sample.length} sample events. Edit or delete them anytime.`);
}

/* ----- Two-step confirm actions (the button says "Confirm ..." after the first click) ----- */

function confirmAction(kind, id, trigger){
  if (kind === "ann"){ DB.remove("announcements", id); toast("Announcement deleted."); }
  if (kind === "verify" || kind === "unverify"){
    const u = userById(id);
    const fields = kind === "verify" ? {verified:true, verifiedAt:TODAY} : {verified:false, verifiedAt:""};
    const done = () => toast(fields.verified ? `${u.name} is now a verified organizer.` : `${u.name} is no longer verified.`);
    if (DB.live) return Cloud.setOrganizerVerification(u, fields).then(done).catch(error => toast(Cloud.friendly(error), "bad"));
    DB.update("users", u, fields);
    done();
  }
  if (kind === "delacct") return deleteMyAccount();
  if (kind === "leaveclub" || kind === "removemember"){
    const m = state.memberships.find(x => x.id === id), c = clubById(m.clubId);
    DB.remove("memberships", m.id);
    toast(kind === "leaveclub" ? `You left ${c.name}.` : `${m.name} was removed from ${c.name}.`);
  }
  if (kind === "dellog"){ DB.remove("hourLogs", id); toast("Hours withdrawn."); }
  if (kind === "newcode"){
    const c = clubById(id);
    Promise.resolve(setClubCode(c, makeCode(c.short))).then(() => toast("New join code created.")).catch(error => toast(Cloud.friendly(error), "bad"));
  }
  if (kind === "reset"){
    const keep = {prefs:state.prefs, session:state.session, org:state.org};   // keep your organization settings
    state = Object.assign(seed(), keep);
    toast("Demo data was reset.");
  }
}

// Privacy: a person can delete their own account. Upcoming sign-ups are cancelled first
// so their spots open up for others.
function deleteMyAccount(){
  if (DB.live) return openModal(`<form id="deleteAccountForm" class="stack" novalidate>
    <h2>Confirm account deletion</h2>
    <p class="muted">Enter your password to delete your sign-in and profile. Service and attendance records may be retained by your organization.</p>
    <div class="field"><label for="delete-account-password">Password</label><input id="delete-account-password" name="password" type="password" autocomplete="current-password" maxlength="4096"></div>
    <p class="formerr" role="alert"></p>
    <div class="row"><button class="btn danger" type="submit">Delete my account</button><button class="btn secondary" type="button" data-act="close">Cancel</button></div></form>`);
  const u = currentUser();
  state.regs.filter(r => r.userId === u.id && (r.status === "registered" || r.status === "waitlist") && eventById(r.eventId).date >= TODAY)
    .forEach(r => DB.update("regs", r, {status:"cancelled"}));

  DB.remove("users", u.id);
  state.session.userId = null; ui.view = "dashboard"; save(); render(); toast("Your account was deleted.");
}

function confirmAccountDeletion(form){
  const password = new FormData(form).get("password"), error = form.querySelector(".formerr");
  if (!password || password.length > 4096){ error.textContent = "Enter your password."; return; }
  const user = currentUser();
  const shifts = state.regs.filter(r => r.userId === user.id && ["registered","waitlist"].includes(r.status) && eventById(r.eventId)?.date >= TODAY);
  return runPending("delete-account", "Deleting account…", form.querySelector('[type="submit"]'),
    () => Cloud.deleteAccount(password, shifts), null, err => { error.textContent = Cloud.friendly(err); });
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
  composeAnnouncement: () => {
    const user = currentUser();
    if (user?.role === "coordinator" && (!DB.live || DB.isVerifiedCoordinator(user))) openModal(announcementForm(), {dismissOnBackdrop:false});
  },
  // Navigation and account
  nav: (v) => {
    if (DB.live && Cloud.loadPhase === "workspace") return;
    const u = currentUser();
    if (u.role === "volunteer" && v === "manage") v = "clubs";
    if (v === "news" && u.role === "volunteer" && !Cloud.loadPhase){            // remember what was new, then mark it all read
      ui.newsSeen = readSet(u.id);
      ui.newNotices = new Set(noticesFor(u.id).filter(n => !n.read).map(n => n.id));
      markAllRead(u); save();
    }
    ui.view = v; ui.requestedRoute = null; ui.armed = null; closeModal(false);
    if (ui.tour){ const i = tourSteps(u).findIndex(step => step.view === v); if (i >= 0) ui.tour.i = i; }
    if (!ui.fromHistory && !ui.tour) setPageURL(v);
    render();
    if (ui.tour) return focusTourStep();
    const m = $("#page-title") || $("#main"); if (m) m.focus({preventScroll:true}); window.scrollTo(0, 0);
  },
  authmode: (v) => navigatePublic(v),
  checkVerification: (_, __, ev) => runPending("verify-email", "Checking verification…", ev.target.closest("button"),
    () => Cloud.checkVerification(), null, err => toast(Cloud.friendly(err), "bad")),
  resendVerification: (_, __, ev) => runPending("verify-email", "Sending verification email…", ev.target.closest("button"),
    () => Cloud.sendVerification(), () => toast("Check your email for the verification link."), err => toast(Cloud.friendly(err), "bad")),
  retryLoad: () => Cloud.retryLoad(),
  cloudSignOut: () => Cloud.logout().catch(error => toast(Cloud.friendly(error), "bad")),
  demo: (v) => {
    if (Cloud.enabled && !ui.demo) Cloud.enterDemo();       // explore sample data without touching live data
    Object.assign(ui.find, {q:"", location:null}); ui.disclosures.clear();
    state.session.userId = asId(v); ui.view = "dashboard"; save(); render();
    toast(`Signed in as ${userById(asId(v)).name}.`); maybeStartTour();
  },
  logout: () => {
    clearPageURL(); setPageURL("login",true);
    ui.authMode = "login"; ui.armed = null; ui.tour = null; ui.cal = TODAY.slice(0, 7); ui.shifts.mode = ui.ev.mode = "list"; ui.find.location = null; ui.find.q = ""; ui.disclosures.clear(); ui.view = "dashboard";
    if (DB.live) return Cloud.logout();
    state.session.userId = null; save();
    if (ui.demo) return Cloud.exitDemo();
    render();
  },
  font: (v) => { state.prefs.font = Math.max(13, Math.min(21, state.prefs.font + +v)); save(); applyPrefs(); },
  contrast: () => { state.prefs.hc = !state.prefs.hc; save(); render(); },
  setTheme: (v) => { state.prefs.theme = v; save(); render(); },
  theme: () => { const order = ["auto", "light", "dark"]; state.prefs.theme = order[(order.indexOf(state.prefs.theme || "auto") + 1) % 3]; save(); render(); },
  waiver: () => openModal(`<div class="spread"><h2>Volunteer waiver</h2><button class="btn secondary sm" data-act="close">Close</button></div><div class="waiver-text">${esc(state.org.waiver || DEFAULT_WAIVER).replace(/\n/g, "<br>")}</div>`),

  // Volunteer sign-ups
  signup: (_, id, ev) => confirmShiftSignup(asId(id), false, ev.target.closest("button")),
  waitlist: (_, id, ev) => confirmShiftSignup(asId(id), true, ev.target.closest("button")),
  cancelShift: (_, id, ev) => confirmShiftCancellation(asId(id), ev.target.closest("button")),
  dismiss: (_, id) => { const n = state.notices.find(x => x.id === asId(id)); if (n) DB.update("notices", n, {read:true}); save(); render(); },

  // Two-step confirm buttons
  arm: (v) => { ui.armed = v; render(); },
  confirm: (v, _, ev) => { const i = v.indexOf(":"), kind = v.slice(0, i), id = asId(v.slice(i + 1)); ui.armed = null; confirmAction(kind, id, ev.target.closest("button")); save(); render(); },

  // Events and check-in
  newEvent: () => openModal(eventForm(null), {dismissOnBackdrop:false}),
  editEvent: (_, id) => openModal(eventForm(eventById(asId(id))), {dismissOnBackdrop:false}),
  dupEvent: (_, id) => {                                          // same event, one week later
    const e = eventById(asId(id)), next = e.date < TODAY ? addDays(7) : iso(new Date(parseDate(e.date).getTime() + 7 * 86400000));
    openModal(eventForm({...e, id:null, date:next}), {dismissOnBackdrop:false});
  },
  deleteEvent: (_, id, ev) => confirmEventDeletion(asId(id), ev.target.closest("button")),
  evtab: (v) => { ui.ev.tab = v; render(); },
  goCheckin: (_, id) => { ui.ciEvent = asId(id); handlers.nav("checkin"); },
  mark: (v, id, ev) => {
    const r = state.regs.find(x => x.id === asId(id)), e = eventById(r.eventId);
    const fields = {status:v, hours:v === "attended" ? duration(e) : 0};
    if (DB.live) return saveLiveRecords(`attendance:${e.id}`, "Saving attendance…", ev.target.closest("button"), "regs",
      [{id:r.id, fields}], () => toast(`Attendance saved for ${userById(r.userId).name}.`));
    DB.update("regs", r, fields); save(); render();
  },
  allPresent: (_, id, ev) => {
    const event = eventById(asId(id));
    if (!event || !canManageEvent(event) || event.date > TODAY) return;
    const ids = activeRegs(event.id).filter(r => r.status === "registered").map(r => r.id);
    if (!ids.length) return;
    const hours = duration(event), key = `attendance:${event.id}`;
    const people = `${ids.length} ${ids.length === 1 ? "volunteer" : "volunteers"}`;
    openConfirmation({
      title:"Mark the remaining volunteers present?", event, key, opener:ev.target.closest("button"),
      detail:`${people} will be marked present and each credited with ${fmtH(hours)} service hours.`,
      label:"Confirm attendance",
    }, trigger => {
      const latest = eventById(event.id);
      if (!latest || !canManageEvent(latest) || latest.date > TODAY) return confirmationError(trigger, "Check-in is unavailable for this event.");
      const regs = activeRegs(latest.id).filter(r => r.status === "registered");
      if (hours !== duration(latest) || regs.length !== ids.length || regs.some(r => !ids.includes(r.id))){
        return confirmationError(trigger, "The roster changed. Go back to review who still needs check-in.");
      }
      const fields = {status:"attended", hours};
      const done = () => toast(`Marked ${people} present.`);
      if (DB.live) return saveLiveRecords(key, "Saving attendance…", trigger, "regs", regs.map(r => ({id:r.id, fields})), done);
      regs.forEach(r => DB.update("regs", r, fields));
      save(); render(); done();
    });
  },
  copyEmails: (_, id) => {
    const list = activeRegs(asId(id)).map(r => userById(r.userId).email).filter(Boolean);
    if (!list.length) return toast("No email addresses to copy yet.", "bad");
    copyText(list.join(", "), `${list.length} email ${list.length === 1 ? "address" : "addresses"}. Paste them into your email's To or Bcc line`);
  },

  // Calendar
  viewMode: (v) => {
    const [key, mode] = v.split(":");
    if (key !== "ev" && key !== "shifts") return;
    ui[key].mode = mode;
    if (key === "shifts" && mode === "calendar"){
      const next = userStats(currentUser().id).upcoming.map(r => eventById(r.eventId)).sort(byDate)[0];
      ui.cal = (next?.date || TODAY).slice(0,7);
    }
    render();
  },
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
  newClubEvent: (_, id) => openModal(eventForm({id:null,title:"",category:"Other",date:addDays(7),start:"15:30",end:"17:30",location:"",zip:"",slots:10,skills:[],desc:"",clubId:asId(id)}), {dismissOnBackdrop:false}),
  copyCode: (v) => copyText(v, `the join code ${v}`),
  approveLog: (_, id) => reviewLog(asId(id), "approved"),
  rejectLog: (_, id) => {
    const note = (document.getElementById(`note-${id}`) || {}).value || "";
    if (V.text(note.trim(), "the reason", 5, 240, true)){ toast("Enter a reason between 5 and 240 characters.", "bad"); const el = document.getElementById(`note-${id}`); if (el) el.focus(); return; }
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
  csvDownload: () => { if (ui.csv) downloadCSV(ui.csv.name, ui.csv.build()); },
  clubCsvDownload: (_, id) => downloadClubCSV(asId(id)),
  print: () => printView("page"),
  cert: (_, id) => openModal(certificate(userById(asId(id)))),
  printCert: () => printView("modal"),

  // Pop-ups
  toggleDisplaySettings: () => {
    if (activeDisplaySettings()) closeDisplaySettings();
    else openDisplaySettings();
  },
  closeDisplaySettings: () => closeDisplaySettings(),
  close: () => closeModal(),
  dismissConfirmation,
  acceptConfirmation: (_, __, ev) => acceptConfirmation(ev.target.closest("button")),
  overlay: (_, __, ev) => { if (ev.target.classList.contains("overlay")) closeModal(); },

  // Guided tour
  tour: () => startTour(),
  tourStep: (v) => tourStep(+v),
  tourEnd: () => endTour(),
};
