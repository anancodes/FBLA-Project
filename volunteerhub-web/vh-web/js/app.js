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
  positionDisplaySettings();
}

function render(){
  applyPrefs();
  const a = document.activeElement, fid = a && a.id && a.closest("#app") ? a.id : null;
  const hadAppFocus = a && a.closest("#app"), focusDisclosure = hadAppFocus && a.closest("details[id]");
  const focusDisclosureId = focusDisclosure && focusDisclosure.id;
  let sel = null; try { sel = a && typeof a.selectionStart === "number" ? [a.selectionStart, a.selectionEnd] : null; } catch(e){}
  const u = currentUser();
  if (u && ui.requestedRoute){
    ui.view = ui.requestedRoute;
    if (!Cloud.loadPhase) ui.requestedRoute = null;
  }
  const previousViewKey = ui.renderKey;
  const displayWasOpen = Boolean(activeDisplaySettings());
  if (ui.renderKey) document.querySelectorAll("#app details[id]").forEach(el => {
    const key = `${ui.renderKey}:${el.id}`;
    if (el.open) ui.disclosures.add(key); else ui.disclosures.delete(key);
  });
  ui.csv = null;
  // Keep anything typed into a form (live updates from other devices redraw the screen)
  const typed = [...document.querySelectorAll("#app form [id]")].filter(el => !el.dataset.filter && "value" in el && el.form && el.form.id !== ui.justSubmitted)
    .map(el => [el.id, el.type === "checkbox" || el.type === "radio" ? el.checked : el.value]);
  $("#app").innerHTML = u ? shell(u) : loginView();
  document.body.classList.add("open-agenda");
  document.body.classList.toggle("public-view",!u);
  if (u && !ui.tour && !Cloud.loadPhase) setPageURL(ui.view,true);
  const pageTitle = $("#main h1"); if (pageTitle){ pageTitle.id = "page-title"; pageTitle.tabIndex = -1; }
  document.title = pageTitle ? `${pageTitle.textContent} | VolunteerHub` : "VolunteerHub";
  const openingWorkspace = DB.live && ui.renderKey?.startsWith("auth:") && ui.authMode !== "landing";
  ui.renderKey = `${u ? u.id : "auth"}:${u ? ui.view : ui.authMode}`;
  const keepDisplayOpen = displayWasOpen && previousViewKey === ui.renderKey && !(DB.live && Cloud.loadPhase === "workspace");
  document.querySelectorAll("#app details[id]").forEach(el => { if (ui.disclosures.has(`${ui.renderKey}:${el.id}`)) el.open = true; });
  ui.expandClub = null;
  typed.forEach(([id, v]) => { const el = document.getElementById(id); if (!el) return; if (typeof v === "boolean") el.checked = v; else el.value = v; });
  // Keep an open event pop-up in sync (e.g. it shows "You're signed up" right after signing up).
  const m = $("#modal .modal");
  if (m && ui.modalEvent && eventById(ui.modalEvent) && u){
    const hadFocus = m.contains(a);
    m.innerHTML = eventPopup(eventById(ui.modalEvent), u);
    const title = m.querySelector("h2"); if (title) title.id = "modal-title";
    if (hadFocus) (replacementControl(a,m) || modalControls()[0] || m).focus();
  }
  if (keepDisplayOpen) openDisplaySettings();
  syncPendingControls();
  const connection = $(".load-status:not([hidden])")?.textContent || "";
  if ($("#connection-status").textContent !== connection) $("#connection-status").textContent = connection;
  if (openingWorkspace && pageTitle && !keepDisplayOpen) pageTitle.focus({preventScroll:true});
  else if (fid){ const el = document.getElementById(fid); if (el){ el.focus(); try { if (sel) el.setSelectionRange(sel[0], sel[1]); } catch(e){} } }
  else if (hadAppFocus){
    const disclosure = focusDisclosureId && document.getElementById(focusDisclosureId);
    const target = replacementControl(a,$("#app")) || (disclosure && disclosure.querySelector("summary"));
    if (target) target.focus({preventScroll:true});
  }
}

// Navigation. Each menu item is a section; some sections have tabs for related screens,
// so the menu stays short (5–7 items) while every screen is still one click away.
const NAV = {
  volunteer: [["dashboard","Home"],["find","Opportunities"],["shifts","My schedule"],["hours","Hours & clubs"],["news","Inbox"]],
  coordinator: [["dashboard","Overview"],["events","Events"],["volunteers","People & clubs"],["reports","Reports"],["news","Inbox"],["settings","Settings"]],
};
const VIEWS = {
  volunteer: {dashboard:volunteerHome, find:vFind, shifts:vShifts, hours:vHours, clubs:vMyClubs, news:newsView, profile:vProfile, help:helpView},
  coordinator: {dashboard:cHome, events:cEvents, checkin:cCheckin, volunteers:cVolunteers, reports:cReports, news:newsView, settings:cSettings, organizers:cOrganizers, manage:manageClubsView, help:helpView},
};
const NAV_ICON = {dashboard:"home", find:"search", shifts:"calendar", hours:"clock", news:"inbox", events:"calendar", volunteers:"users", reports:"chart", settings:"sliders"};
const THEME_LABEL = {auto:"Auto", light:"Light", dark:"Dark"};
function menuFor(u){
  return NAV[u.role].filter(([view]) => view !== "settings" || (DB.live ? u.admin : DB.isVerifiedCoordinator(u)));
}
function tabsFor(u, sec){
  if (sec === "hours") return [["hours","My hours"],["clubs","My clubs"]];
  if (sec === "events") return [["events","All events"],["checkin","Check-in"]];
  if (sec === "volunteers") return [["volunteers","Volunteers"],...((DB.isVerifiedCoordinator(u) || managedClubs(u).length) ? [["manage","Clubs"]] : []),...(u.admin ? [["organizers","Organizers"]] : [])];
  return [];
}
function sectionOf(u, view){
  const sections = menuFor(u).map(n => n[0]);
  if (sections.includes(view)) return view;
  return sections.find(sec => tabsFor(u,sec).some(([v]) => v === view)) || null;
}

function shell(u){
  const personal = u.role === "volunteer" ? ["profile","help"] : ["help"];
  if (!VIEWS[u.role][ui.view] || (!sectionOf(u,ui.view) && !personal.includes(ui.view))) ui.view = "dashboard";
  return websiteShell(u);
}

document.addEventListener("click", ev => {
  const panel = activeDisplaySettings();
  if (panel && !panel.hasAttribute("popover") && !ev.target.closest("#display-trigger, #display-settings-panel")) closeDisplaySettings(false);
  const el = ev.target.closest("[data-act]");
  if (!el || el.disabled) return;
  if (Cloud.loadPhase === "workspace" && DB.live && !["retryLoad","logout"].includes(el.dataset.act)){ ev.preventDefault(); return; }
  if (actionBlocked(el)){ ev.preventDefault(); return; }
  if (el.tagName === "A" && (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey || ev.button !== 0)) return;
  const act = el.dataset.act;
  if (ui.armed && act !== "confirm" && act !== "arm") ui.armed = null;
  if (handlers[act]){ if (act !== "overlay") ev.preventDefault(); handlers[act](el.dataset.v, el.dataset.id, ev); }
});

function setFilter(path, value){
  const keys = path.split("."), field = keys.pop();
  let target = ui;
  for (const key of keys){
    if (!Object.hasOwn(target, key) || typeof target[key] !== "object" || !target[key]) return;
    target = target[key];
  }
  if (Object.hasOwn(target, field)) target[field] = value;
}
document.addEventListener("input", ev => {
  const el = ev.target;
  if (el.hasAttribute("data-city-input")){
    const list = document.getElementById(el.getAttribute("list")); if (list) list.innerHTML = cityOptions(el.value);
  }
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
  if (Cloud.loadPhase === "workspace" && DB.live) return;
  if (actionBlocked(form.querySelector('button[type="submit"]'))) return;
  ui.justSubmitted = form.id;                      // a saved form starts fresh instead of keeping old text
  try { handleSubmit(form); } finally { ui.justSubmitted = null; }
});
function handleSubmit(form){
  if (form.id === "deleteAccountForm") return confirmAccountDeletion(form);
  if (form.id === "loginForm") doLogin(form);
  if (form.id === "signupForm") doSignup(form);
  if (form.id === "resetForm") doReset(form);
  if (form.id === "profileForm") saveProfile(form);
  if (form.id === "findForm") findOpportunities(form);
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
    const fields = {status:"attended", hours:duration(e)};
    const record = {id:DB.registrationId(e.id, uid), userId:uid, eventId:e.id, ...fields};
    const success = () => toast(`${userById(uid).name} was added and marked present.`);
    if (DB.live) return saveLiveRecords(`attendance:${e.id}`, "Adding walk-in…", form.querySelector('[type="submit"]'), "regs",
      [ex ? {id:ex.id, fields} : {id:record.id, record}], success);
    if (ex) DB.update("regs", ex, fields);
    else DB.add("regs", record);
    save(); render(); success();
  }
}

document.addEventListener("keydown", ev => {
  if (ev.key === "Tab") return trapModalTab(ev);
  if (ev.key !== "Escape") return;
  if ($("#modal").innerHTML) return closeModal();
  if (activeDisplaySettings()){
    ev.preventDefault();
    return closeDisplaySettings();
  }
  const disclosure = $("#app details.overflow-menu[open]") || document.activeElement.closest("#app details[open]");
  if (disclosure){ disclosure.open = false; disclosure.querySelector("summary").focus(); return; }
  if (ui.tour) endTour();
});

document.addEventListener("beforetoggle", ev => {
  if (ev.target.id === "display-settings-panel") $("#display-trigger")?.setAttribute("aria-expanded", String(ev.newState === "open"));
}, true);
window.addEventListener("resize", positionDisplaySettings);
window.addEventListener("scroll", positionDisplaySettings, {capture:true, passive:true});

const initialRoute = pageFromURL();
ui.authMode = publicModeFromURL(initialRoute);
ui.requestedRoute = isPublicRoute(initialRoute) ? null : initialRoute;
window.addEventListener("popstate",followPageURL);
window.addEventListener("hashchange",followPageURL);
if (window.FIREBASE_CONFIG?.apiKey) Cloud.boot();
else render();     // turns on live mode if Firebase settings are filled in (see firebase-config.js)
