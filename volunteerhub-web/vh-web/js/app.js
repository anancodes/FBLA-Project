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

// Navigation. Each menu item is a section; some sections have tabs for related screens,
// so the menu stays short (5–7 items) while every screen is still one click away.
const NAV = {
  volunteer: [["dashboard","Home"],["find","Opportunities"],["shifts","My schedule"],["hours","Hours & clubs"],["manage","Club admin"],["news","Inbox"]],
  coordinator: [["dashboard","Overview"],["events","Events"],["volunteers","People"],["manage","Clubs"],["reports","Reports"],["news","Inbox"],["settings","Settings"]],
};
// Tabs inside a section: [view, label]
const TABS = {
  events: [["events","All events"],["checkin","Check-in"]],
  manage: [["manage","Members & approvals"],["checkin","Check-in"]],
  hours: [["hours","My hours"],["clubs","My clubs"]],
  volunteers: [["volunteers","Volunteers"],["organizers","Organizers"]],
};
const VIEWS = {
  volunteer: {dashboard:vHome, find:vFind, shifts:vShifts, hours:vHours, clubs:vMyClubs, manage:manageClubsView, checkin:cCheckin, news:newsView, profile:vProfile, help:helpView},
  coordinator: {dashboard:cHome, events:cEvents, checkin:cCheckin, volunteers:cVolunteers, reports:cReports, news:newsView, settings:cSettings, organizers:cOrganizers, manage:manageClubsView, help:helpView},
};
const NAV_ICON = {dashboard:"home", find:"search", shifts:"calendar", hours:"clock", manage:"layers", news:"inbox",
  events:"calendar", volunteers:"users", reports:"chart", settings:"sliders"};
const THEME_LABEL = {auto:"Auto", light:"Light", dark:"Dark"};

// Which menu item and tabs a screen belongs to (for example, Check-in sits under Events).
function sectionOf(u, view){
  const sections = menuFor(u).map(n => n[0]);
  if (sections.includes(view)) return view;
  for (const [sec, tabs] of Object.entries(TABS)) if (sections.includes(sec) && tabs.some(t => t[0] === view)) return sec;
  return null;
}
function menuFor(u){
  let nav = NAV[u.role];
  if (u.role === "volunteer" && !managedClubs(u).length) nav = nav.filter(n => n[0] !== "manage");   // Club admin is for officers only
  return nav;
}
function tabsFor(u, sec){
  let tabs = TABS[sec] || [];
  if (sec === "volunteers" && !u.admin) tabs = [];                    // only site admins verify organizers
  if (sec === "manage" && u.role === "coordinator") tabs = [];        // coordinators check in from Events
  return tabs.length > 1 ? tabs : [];
}

function shell(u){
  const nav = menuFor(u);
  const personal = ["profile", "help"];                                  // reached from the account menu
  if (!sectionOf(u, ui.view) && !personal.includes(ui.view)) ui.view = "dashboard";
  const sec = sectionOf(u, ui.view), tabs = sec ? tabsFor(u, sec) : [];
  const upCount = u.role === "volunteer" ? userStats(u.id).upcoming.length : 0;
  const unread = unreadCount(u);
  const pendingLogs = managedClubs(u).reduce((n, c) => n + state.hourLogs.filter(l => l.clubId === c.id && l.status === "pending" && l.userId !== u.id).length, 0);
  const pendingOrgs = u.admin ? state.users.filter(x => x.role === "coordinator" && !x.verified).length : 0;
  const counts = {shifts:upCount, news:unread, manage:pendingLogs, volunteers:pendingOrgs};
  const badge = k => counts[k] ? `<span class="count" aria-label="${counts[k]} new">${counts[k]}</span>` : "";
  const roleName = u.role === "coordinator" ? (u.admin ? "Site admin" : u.verified ? "Coordinator" : "Coordinator · not yet verified") : "Volunteer";
  const footer = DB.live
    ? `<span>Signed in as ${esc(u.email)}</span><span class="pill ${Cloud.online ? "good" : "warn"}" id="sync-status">${Cloud.online ? "Connected" : "Offline: changes will sync when you reconnect"}</span>`
    : `<span>${ui.demo ? "Demo with sample data. Nothing here affects your live site." : "Demo with sample data, saved in this browser only."}</span>${armBtn("reset", "Reset demo data", "Click again to reset", "secondary sm")}`;
  return `<div class="shell">
    ${ui.demo ? `<div class="mode-bar">You're exploring the demo with sample data. <button class="linkbtn" data-act="logout">Exit demo</button></div>` : ""}
    <header class="top">
      <div class="brand">${LOGO}<div><strong>VolunteerHub</strong><span>${esc(state.org.name)}</span></div></div>
      <div class="tools">${accountMenu(u, roleName)}</div>
    </header>
    <div class="frame">
      <nav class="rail" aria-label="Main">
        ${nav.map(([k, l]) => `<button data-act="nav" data-v="${k}" ${sec === k ? 'aria-current="page"' : ""} class="${ui.tour && sec === k ? "tour-hl" : ""}">${icon(NAV_ICON[k] || "home")}<span>${l}</span>${badge(k)}</button>`).join("")}
      </nav>
      <main id="main" tabindex="-1"><div class="page">
        ${tabs.length ? `<nav class="subtabs" aria-label="${esc(nav.find(n => n[0] === sec)[1])}">${tabs.map(([v, l]) => `<button data-act="nav" data-v="${v}" ${ui.view === v ? 'aria-current="page"' : ""}>${l}${v === "organizers" && pendingOrgs ? ` <span class="count">${pendingOrgs}</span>` : ""}</button>`).join("")}</nav>` : ""}
        ${VIEWS[u.role][ui.view](u)}
      </div></main>
    </div>
    <footer class="foot">${footer}</footer>
    ${tourCard(u)}
  </div>`;
}

// Avatar button with a drop-down: profile, display settings, help, and log out.
function accountMenu(u, roleName){
  const t = state.prefs.theme || "auto";
  return `<div class="acct">
    <button class="acct-btn" data-act="menu" aria-haspopup="true" aria-expanded="${!!ui.menu}"><span class="avatar" aria-hidden="true">${esc(initials(u.name))}</span><span class="who-name">${esc(u.name)}<small>${roleName}</small></span>${icon("chevron")}</button>
    ${ui.menu ? `<div class="menu" role="menu">
      <div class="menu-head"><b>${esc(u.name)}</b><span>${esc(u.email)}</span></div>
      ${u.role === "volunteer" ? `<button role="menuitem" data-act="nav" data-v="profile">${icon("user")}Profile</button>` : ""}
      <button role="menuitem" data-act="nav" data-v="help">${icon("help")}Help</button>
      <button role="menuitem" data-act="tour">${icon("compass")}Take the tour</button>
      <div class="menu-sep"></div>
      <div class="menu-row"><span>Text size</span><span class="seg"><button data-act="font" data-v="-2" aria-label="Smaller text">A−</button><button data-act="font" data-v="2" aria-label="Larger text">A+</button></span></div>
      <div class="menu-row"><span>Theme</span><span class="seg">${["auto","light","dark"].map(x => `<button data-act="setTheme" data-v="${x}" aria-pressed="${t === x}">${THEME_LABEL[x]}</button>`).join("")}</span></div>
      <div class="menu-row"><span>High contrast</span><span class="seg"><button data-act="contrast" aria-pressed="${state.prefs.hc}">${state.prefs.hc ? "On" : "Off"}</button></span></div>
      <div class="menu-sep"></div>
      <button role="menuitem" data-act="logout">${icon("logout")}${ui.demo ? "Exit demo" : "Log out"}</button>
    </div>` : ""}
  </div>`;
}

document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-act]");
  if (!el && ui.menu && !ev.target.closest(".menu")){ ui.menu = false; render(); return; }   // click outside closes the menu
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  if (ui.armed && act !== "confirm" && act !== "arm") ui.armed = null;
  // Close the account menu after picking something outside the display settings
  if (ui.menu && !["menu", "font", "setTheme", "contrast"].includes(act)) ui.menu = false;
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
  if (ui.menu){ ui.menu = false; render(); }
  else if ($("#modal").innerHTML) closeModal();
  else if (ui.tour) endTour();
});

render();
Cloud.boot();     // turns on live mode if Firebase settings are filled in (see firebase-config.js)
