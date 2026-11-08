/*
 * app.js
 * Starts the app. render() redraws the current screen; shell() builds the header and
 * role-based navigation; the event listeners route clicks, typing, and form submits
 * to the right handler. This file loads last because it uses all the others.
 */
"use strict";

// Text size, high contrast, and light/dark theme for this device.
function applyPrefs(){
  const root = document.documentElement, t = state.prefs.theme || "auto";
  root.style.fontSize = state.prefs.font + "px";
  document.body.classList.toggle("hc", !!state.prefs.hc);
  if (t === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
}

function render(){
  applyPrefs();
  const a = document.activeElement, fid = a && a.id && a.closest("#app") ? a.id : null;
  let sel = null; try { sel = a && typeof a.selectionStart === "number" ? [a.selectionStart, a.selectionEnd] : null; } catch(e){}
  const u = currentUser();
  ui.csv = null;
  // Keep anything typed into a form (live updates from other devices redraw the screen)
  const typed = [...document.querySelectorAll("#app form [id]")].filter(el => !el.dataset.filter && "value" in el && el.form && el.form.id !== ui.justSubmitted)
    .map(el => [el.id, el.type === "checkbox" || el.type === "radio" ? el.checked : el.value]);
  $("#app").innerHTML = u ? shell(u) : loginView();
  typed.forEach(([id, v]) => { const el = document.getElementById(id); if (!el) return; if (typeof v === "boolean") el.checked = v; else el.value = v; });
  // Keep an open event pop-up in sync (e.g. it shows "You're signed up" right after signing up).
  const m = $("#modal .modal");
  if (m && ui.modalEvent && eventById(ui.modalEvent) && u){
    m.innerHTML = eventPopup(eventById(ui.modalEvent), u);
  }
  if (fid){ const el = document.getElementById(fid); if (el){ el.focus(); try { if (sel) el.setSelectionRange(sel[0], sel[1]); } catch(e){} } }
}

const NAV = {
  volunteer: [["dashboard","Home"],["find","Find opportunities"],["shifts","My shifts"],["hours","My hours"],["clubs","My clubs"],["news","Announcements"],["profile","Profile"],["help","Help"]],
  coordinator: [["dashboard","Overview"],["events","Events"],["checkin","Check-in"],["volunteers","Volunteers"],["manage","Clubs"],["reports","Reports"],["news","Announcements"],["settings","Settings"],["help","Help"]],
};
const VIEWS = {
  volunteer: {dashboard:vHome, find:vFind, shifts:vShifts, hours:vHours, clubs:vMyClubs, manage:manageClubsView, checkin:cCheckin, news:newsView, profile:vProfile, help:helpView},
  coordinator: {dashboard:cHome, events:cEvents, checkin:cCheckin, volunteers:cVolunteers, reports:cReports, news:newsView, settings:cSettings, organizers:cOrganizers, manage:manageClubsView, help:helpView},
};
const THEME_LABEL = {auto:"Theme: Auto", light:"Theme: Light", dark:"Theme: Dark"};

function shell(u){
  // Site admins get an extra screen for verifying organizers
  let nav = u.admin ? [...NAV[u.role].slice(0, -1), ["organizers","Organizers"], ["help","Help"]] : NAV[u.role];
  // Student club officers also get the club tools
  if (u.role === "volunteer" && managedClubs(u).length) nav = [...nav.slice(0, 5), ["manage","Manage clubs"], ["checkin","Club check-in"], ...nav.slice(5)];
  if (!nav.some(n => n[0] === ui.view)) ui.view = "dashboard";
  const upCount = u.role === "volunteer" ? userStats(u.id).upcoming.length : 0;
  const unread = unreadCount(u);
  const pendingLogs = managedClubs(u).reduce((n, c) => n + state.hourLogs.filter(l => l.clubId === c.id && l.status === "pending" && l.userId !== u.id).length, 0);
  const pendingOrgs = u.admin ? state.users.filter(x => x.role === "coordinator" && !x.verified).length : 0;
  const badge = k => k === "shifts" && upCount ? `<span class="count" aria-label="${upCount} upcoming">${upCount}</span>`
                   : k === "news" && unread ? `<span class="count" aria-label="${unread} new">${unread}</span>`
                   : k === "manage" && pendingLogs ? `<span class="count" aria-label="${pendingLogs} hours to review">${pendingLogs}</span>`
                   : k === "organizers" && pendingOrgs ? `<span class="count" aria-label="${pendingOrgs} waiting">${pendingOrgs}</span>` : "";
  const roleName = u.role === "coordinator" ? (u.admin ? "Coordinator · Site admin" : u.verified ? "Volunteer coordinator" : "Coordinator · not yet verified") : "Volunteer";
  const footer = DB.live
    ? `<span>Live · signed in as ${esc(u.email)}. Changes save to your organization's database and sync to every device.</span><span class="sync" id="sync-status">${Cloud.online ? "● Connected" : "○ Offline: changes will sync when you reconnect"}</span>`
    : `<span>${ui.demo ? "Demo mode: sample data, saved only in this browser. Nothing here affects your live site." : "Demo with sample data. Changes are saved in this browser only."}</span>${armBtn("reset", "Reset demo data", "Click again to reset", "secondary sm")}`;
  return `<div class="shell">
    ${ui.demo ? `<div class="mode-bar">You're exploring the <b>demo</b> with sample data. <button class="linkbtn" data-act="logout">Exit demo</button></div>` : ""}
    <header class="top">
      <div class="brand">${LOGO}<div><strong>VolunteerHub</strong><span>${esc(state.org.name)}</span></div></div>
      <div class="tools">
        <div class="seg" role="group" aria-label="Text size">
          <button data-act="font" data-v="-2" aria-label="Smaller text">A−</button>
          <button data-act="font" data-v="2" aria-label="Larger text">A+</button>
        </div>
        <div class="seg"><button data-act="contrast" aria-pressed="${state.prefs.hc}">High contrast</button><button data-act="theme" aria-label="Change theme. Now ${state.prefs.theme || "auto"}">${THEME_LABEL[state.prefs.theme || "auto"]}</button></div>
        <div class="who"><span class="avatar" aria-hidden="true">${esc(initials(u.name))}</span><span class="who-name">${esc(u.name)}<small>${roleName}</small></span></div>
        <button class="btn secondary sm" data-act="logout">${ui.demo ? "Exit demo" : "Log out"}</button>
      </div>
    </header>
    <div class="frame">
      <nav class="rail" aria-label="Main">
        <span class="rail-label">${u.role === "coordinator" ? "Coordinator" : "Volunteer"}</span>
        ${nav.map(([k, l]) => `<button data-act="nav" data-v="${k}" ${ui.view === k ? 'aria-current="page"' : ""} class="${ui.tour && ui.view === k ? "tour-hl" : ""}"><span>${l}</span>${badge(k)}</button>`).join("")}
      </nav>
      <main id="main" tabindex="-1"><div class="page">${VIEWS[u.role][ui.view](u)}</div></main>
    </div>
    <footer class="foot">${footer}</footer>
    ${tourCard(u)}
  </div>`;
}

document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-act]"); if (!el || el.disabled) return;
  const act = el.dataset.act;
  if (ui.armed && act !== "confirm" && act !== "arm") ui.armed = null;
  if (handlers[act]){ if (act !== "overlay") ev.preventDefault(); handlers[act](el.dataset.v, el.dataset.id, ev); }
});

function setFilter(path, value){
  const parts = path.split("."); let o = ui; while (parts.length > 1) o = o[parts.shift()]; o[parts[0]] = value;
}
document.addEventListener("input", ev => {
  const el = ev.target;
  if (el.dataset.filter && el.type !== "checkbox" && el.tagName === "INPUT" && el.type !== "date"){ setFilter(el.dataset.filter, el.value); render(); }
});
document.addEventListener("change", ev => {
  const el = ev.target;
  if (el.dataset.filter && (el.tagName === "SELECT" || el.type === "checkbox" || el.type === "date")){
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (el.dataset.filter === "ciEvent") v = asId(v);
    setFilter(el.dataset.filter, v);
    render();
  }
  if (el.dataset.hours){
    const r = state.regs.find(x => x.id === asId(el.dataset.hours)), h = Number(el.value);
    if (!(h >= 0.25 && h <= 12)){ toast("Hours must be between 0.25 and 12.", "bad"); el.value = r.hours; return; }
    DB.update("regs", r, {hours:Math.round(h * 4) / 4}); save(); toast(`Hours updated for ${userById(r.userId).name}.`);
  }
});

document.addEventListener("submit", ev => {
  const form = ev.target; ev.preventDefault();
  ui.justSubmitted = form.id;                      // a saved form starts fresh instead of keeping old text
  try { handleSubmit(form); } finally { ui.justSubmitted = null; }
});
function handleSubmit(form){
  if (form.id === "loginForm") doLogin(form);
  if (form.id === "signupForm") doSignup(form);
  if (form.id === "resetForm") doReset(form);
  if (form.id === "profileForm") saveProfile(form);
  if (form.id === "eventForm") saveEventForm(form);
  if (form.id === "annForm") postAnnouncement(form);
  if (form.id === "concernForm") submitConcern(form);
  if (form.id === "orgForm") saveOrgSettings(form);
  if (form.id === "joinForm") joinClub(form);
  if (form.id === "logForm") saveHourLog(form);
  if (form.id === "clubForm") saveClub(form);
  if (form.id === "walkinForm"){
    const uid = asId(new FormData(form).get("user")), e = eventById(ui.ciEvent);
    if (!uid) return toast("Choose a volunteer first.", "bad");
    if (spotsLeft(e) <= 0) return toast("This event is full. Raise the number of volunteers needed in Events first.", "bad");
    const ex = state.regs.find(r => r.userId === uid && r.eventId === e.id);
    if (ex) DB.update("regs", ex, {status:"attended", hours:duration(e)});
    else DB.add("regs", {id:DB.newId("regs"), userId:uid, eventId:e.id, status:"attended", hours:duration(e)});
    save(); render(); toast(`${userById(uid).name} was added and marked present.`);
  }
}

document.addEventListener("keydown", ev => {
  if (ev.key !== "Escape") return;
  if ($("#modal").innerHTML) closeModal();
  else if (ui.tour) endTour();
});

render();
Cloud.boot();     // turns on live mode if Firebase settings are filled in (see firebase-config.js)
