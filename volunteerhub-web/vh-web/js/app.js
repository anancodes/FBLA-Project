/*
 * app.js
 * Starts the app. render() redraws the current screen; shell() builds the header and
 * role-based navigation; the event listeners route clicks, typing, and form submits
 * to the right handler. This file loads last because it uses all the others.
 */
"use strict";

function applyPrefs(){ document.documentElement.style.fontSize = state.prefs.font + "px"; document.body.classList.toggle("hc", !!state.prefs.hc); }

function render(){
  applyPrefs();
  const a = document.activeElement, fid = a && a.id && a.closest("#app") ? a.id : null;
  let sel = null; try { sel = a && typeof a.selectionStart === "number" ? [a.selectionStart, a.selectionEnd] : null; } catch(e){}
  const u = currentUser();
  ui.csv = null;
  $("#app").innerHTML = u ? shell(u) : loginView();
  // Keep an open event pop-up in sync (e.g. it shows "You're signed up" right after signing up).
  const m = $("#modal .modal");
  if (m && ui.modalEvent && eventById(ui.modalEvent) && u){
    m.innerHTML = eventPopup(eventById(ui.modalEvent), u);
  }
  if (fid){ const el = document.getElementById(fid); if (el){ el.focus(); try { if (sel) el.setSelectionRange(sel[0], sel[1]); } catch(e){} } }
}

const NAV = {
  volunteer: [["dashboard","Home"],["find","Find opportunities"],["shifts","My shifts"],["hours","My hours"],["news","Announcements"],["profile","Profile"],["help","Help"]],
  coordinator: [["dashboard","Overview"],["events","Events"],["checkin","Check-in"],["volunteers","Volunteers"],["reports","Reports"],["news","Announcements"],["help","Help"]],
};
const VIEWS = {
  volunteer: {dashboard:vHome, find:vFind, shifts:vShifts, hours:vHours, news:newsView, profile:vProfile, help:helpView},
  coordinator: {dashboard:cHome, events:cEvents, checkin:cCheckin, volunteers:cVolunteers, reports:cReports, news:newsView, help:helpView},
};

function shell(u){
  const nav = NAV[u.role];
  if (!nav.some(n => n[0] === ui.view)) ui.view = "dashboard";
  const upCount = u.role === "volunteer" ? userStats(u.id).upcoming.length : 0;
  const unread = unreadCount(u);
  const badge = k => k === "shifts" && upCount ? `<span class="count" aria-label="${upCount} upcoming">${upCount}</span>`
                   : k === "news" && unread ? `<span class="count" aria-label="${unread} new">${unread}</span>` : "";
  return `<div class="shell">
    <header class="top">
      <div class="brand">${LOGO}<div><strong>VolunteerHub</strong><span>Riverbend Community Pantry</span></div></div>
      <div class="tools">
        <div class="seg" role="group" aria-label="Text size">
          <button data-act="font" data-v="-2" aria-label="Smaller text">A−</button>
          <button data-act="font" data-v="2" aria-label="Larger text">A+</button>
        </div>
        <div class="seg"><button data-act="contrast" aria-pressed="${state.prefs.hc}">High contrast</button></div>
        <div class="who"><span class="avatar" aria-hidden="true">${esc(initials(u.name))}</span><span class="who-name">${esc(u.name)}<small>${u.role === "coordinator" ? "Volunteer coordinator" : "Volunteer"}</small></span></div>
        <button class="btn secondary sm" data-act="logout">Log out</button>
      </div>
    </header>
    <div class="frame">
      <nav class="rail" aria-label="Main">
        <span class="rail-label">${u.role === "coordinator" ? "Coordinator" : "Volunteer"}</span>
        ${nav.map(([k, l]) => `<button data-act="nav" data-v="${k}" ${ui.view === k ? 'aria-current="page"' : ""} class="${ui.tour && ui.view === k ? "tour-hl" : ""}"><span>${l}</span>${badge(k)}</button>`).join("")}
      </nav>
      <main id="main" tabindex="-1"><div class="page">${VIEWS[u.role][ui.view](u)}</div></main>
    </div>
    <footer class="foot"><span>Demo with sample data for a fictional nonprofit. Changes are saved in this browser only.</span>${armBtn("reset", "Reset demo data", "Click again to reset", "secondary sm")}</footer>
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
    if (el.dataset.filter === "ciEvent") v = +v;
    setFilter(el.dataset.filter, v);
    if (el.dataset.filter === "find.area") ui.find.venue = "all";    // a new area resets the location choice
    render();
  }
  if (el.dataset.hours){
    const r = state.regs.find(x => x.id === +el.dataset.hours), h = Number(el.value);
    if (!(h >= 0.25 && h <= 12)){ toast("Hours must be between 0.25 and 12.", "bad"); el.value = r.hours; return; }
    r.hours = Math.round(h * 4) / 4; save(); toast(`Hours updated for ${userById(r.userId).name}.`);
  }
});

document.addEventListener("submit", ev => {
  const form = ev.target; ev.preventDefault();
  if (form.id === "loginForm"){
    const fd = new FormData(form), email = String(fd.get("email")).trim().toLowerCase(), pw = String(fd.get("password"));
    if (!email || !pw){ $("#li-err").textContent = "Enter your email and password."; return; }
    const u = state.users.find(x => x.email === email && x.password === pw);
    if (!u){ $("#li-err").textContent = "That email and password don't match. Try a demo account below."; return; }
    state.session.userId = u.id; ui.view = "dashboard"; save(); render(); maybeStartTour();
  }
  if (form.id === "signupForm"){
    const fd = new FormData(form), d = Object.fromEntries(fd.entries());
    const errs = {name:V.name(d.name), email:V.email(d.email), phone:V.phone(d.phone), password:V.password(d.password), confirm: d.password !== d.confirm ? "Passwords don't match." : ""};
    if (!errs.email && state.users.some(u => u.email === d.email.trim().toLowerCase())) errs.email = "An account with this email already exists. Try logging in.";
    if (!showErrors(form, errs)) return;
    const u = {id:nid(state.users), name:d.name.trim(), email:d.email.trim().toLowerCase(), phone:d.phone.trim(), role:d.role, password:d.password, skills:[], availability:[],
               org:d.role === "coordinator" ? "Independent organizer" : "", verified:false};   // new organizers start unverified
    state.users.push(u); state.session.userId = u.id; ui.view = u.role === "volunteer" ? "profile" : "dashboard"; save(); render();
    toast(u.role === "volunteer" ? "Welcome! Add your skills so we can recommend shifts." : "Welcome! Create your first event to get started.");
    maybeStartTour();
  }
  if (form.id === "profileForm"){
    const fd = new FormData(form), u = currentUser();
    const errs = {name:V.name(fd.get("name")), phone:V.phone(fd.get("phone"))};
    if (!showErrors(form, errs)) return;
    u.name = fd.get("name").trim(); u.phone = fd.get("phone").trim(); u.skills = fd.getAll("skills"); u.availability = fd.getAll("availability");
    save(); render(); toast("Profile saved.");
  }
  if (form.id === "eventForm") saveEventForm(form);
  if (form.id === "annForm") postAnnouncement(form);
  if (form.id === "concernForm") submitConcern(form);
  if (form.id === "walkinForm"){
    const uid = +new FormData(form).get("user"), e = eventById(ui.ciEvent);
    if (!uid) return toast("Choose a volunteer first.", "bad");
    if (spotsLeft(e) <= 0) return toast("This event is full. Raise the number of volunteers needed in Events first.", "bad");
    const ex = state.regs.find(r => r.userId === uid && r.eventId === e.id);
    if (ex){ ex.status = "attended"; ex.hours = duration(e); } else state.regs.push({id:nid(state.regs), userId:uid, eventId:e.id, status:"attended", hours:duration(e)});
    save(); render(); toast(`${userById(uid).name} was added and marked present.`);
  }
});

document.addEventListener("keydown", ev => {
  if (ev.key !== "Escape") return;
  if ($("#modal").innerHTML) closeModal();
  else if (ui.tour) endTour();
});

render();
