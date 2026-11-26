/* Open agenda: shared website navigation, display preferences and volunteer Home. */
"use strict";

function pageFromURL(){
  try { const page = decodeURIComponent(location.hash.slice(1)); return page && page !== "main" ? page : null; }
  catch(e){ return null; }
}
function setPageURL(view, replace = false){
  if (location.hash !== `#${view}`) history[replace ? "replaceState" : "pushState"]({view},"",`#${view}`);
}
function clearPageURL(){ history.replaceState(null,"",location.pathname + location.search); ui.requestedRoute = null; }
function followPageURL(){
  if (!currentUser()) return followPublicURL();
  const view = pageFromURL(); if (!view) return;
  if (ui.view === view) return;
  ui.fromHistory = true;
  try { handlers.nav(view); } finally { ui.fromHistory = false; }
}

function websiteShell(u){
  const section = sectionOf(u,ui.view), tabs = section ? tabsFor(u,section) : [];
  const loading = !!(DB.live && Cloud.loadPhase);
  const syncFailed = Cloud.loadStatus === "retry";
  const labels = [...menuFor(u), ...tabs, ["profile","Profile"], ["help","Help"]];
  const pending = managedClubs(u).reduce((n,c) => n + state.hourLogs.filter(l => l.clubId === c.id && l.status === "pending" && l.userId !== u.id).length,0);
  const pendingOrgs = u.admin ? state.users.filter(x => x.role === "coordinator" && !x.verified).length : 0;
  const counts = {shifts:u.role === "volunteer" ? userStats(u.id).upcoming.length : 0,hours:pending,news:unreadCount(u),volunteers:pending+pendingOrgs};
  const countLabel = {shifts:"upcoming shifts",hours:"hours awaiting review",news:"unread messages",volunteers:"items awaiting review"};
  const role = u.admin ? "Site admin" : u.role === "coordinator" ? (u.verified ? "Coordinator" : "Coordinator · not yet verified") : "Volunteer";
  const home = u.role === "volunteer" && ui.view === "dashboard";
  return `<div class="shell pv-shell">
    <a class="pv-skip" href="#main">Skip to main content</a>
    <div class="frame pv-frame">
      <aside class="pv-sidebar" ${loading ? "inert" : ""}>
        <div class="pv-brand"><a href="#dashboard" data-act="nav" data-v="dashboard">VolunteerHub</a>${state.org.name !== "Your Organization" ? `<span>${esc(state.org.name)}</span>` : ""}${!DB.live ? `<span>Demo data</span>` : ""}</div>
        <nav class="rail" aria-label="Main">${menuFor(u).map(([view,label]) => `<a href="#${view}" data-act="nav" data-v="${view}" ${section === view ? 'aria-current="page"' : ""} class="${ui.tour && section === view ? "tour-hl" : ""}">${icon(NAV_ICON[view])}<span>${label}</span>${!loading && counts[view] ? `<span class="count" aria-label="${counts[view]} ${countLabel[view]}">${counts[view]}</span>` : ""}</a>`).join("")}</nav>
        <div class="pv-tools">
          <a class="pv-utility" href="#help" data-act="nav" data-v="help">${icon("help")}<span>Help</span></a>
          ${displaySettingsTrigger("pv-utility", icon("sliders"))}
          ${displaySettingsPanel()}
        </div>
        <div class="pv-sidebar-bottom">
          <div class="pv-account"><div><strong>${esc(u.name)}</strong><small>${role}</small></div>${u.role === "volunteer" ? `<a class="pv-profile" href="#profile" data-act="nav" data-v="profile">Profile</a>` : ""}</div>
        </div>
      </aside>
      <div class="pv-workspace">
        <main id="main" tabindex="-1"><div class="page pv-page">${!loading && !home ? tourCard(u) : ""}${tabs.length ? `<nav class="subtabs" ${loading ? "inert" : ""} aria-label="${esc(menuFor(u).find(n => n[0] === section)[1])}">${tabs.map(([view,label]) => `<a href="#${view}" data-act="nav" data-v="${view}" ${ui.view === view ? 'aria-current="page"' : ""}>${label}${view === "organizers" && !loading && pendingOrgs ? ` <span class="count">${pendingOrgs}</span>` : ""}</a>`).join("")}</nav>` : ""}${loading ? workspaceLoading(u, labels.find(([view]) => view === ui.view)?.[1]) : VIEWS[u.role][ui.view](u)}</div></main>
        <footer class="foot pv-footer"><div class="pv-footer-data">${DB.live ? `<span>Signed in as ${esc(u.email)}</span><span class="pill ${Cloud.online && !syncFailed && !loading ? "good" : "warn"}" id="sync-status">${syncFailed ? "Couldn’t sync records" : loading ? "Syncing your records" : Cloud.online ? "Connected" : "Offline: changes will sync when you reconnect"}</span>` : `<span>Sample data, saved in this browser.</span>${armBtn("reset","Reset demo data","Confirm reset","secondary sm")}`}</div><div class="pv-utility-links">${!loading ? '<button data-act="tour">Take the tour</button>' : ""}<button data-act="logout">${DB.live ? "Sign out" : "Exit demo"}</button></div></footer>
      </div>
    </div>
  </div>`;
}

function displaySettingsTrigger(className, glyph = ""){
  return `<button class="${className}" type="button" id="display-trigger" popovertarget="display-settings-panel" aria-expanded="false" data-act="toggleDisplaySettings">${glyph}<span>Display settings</span></button>`;
}

function displaySettingsPanel(){
  const theme = state.prefs.theme || "auto";
  const visibility = typeof HTMLElement.prototype.showPopover === "function" ? "popover" : "hidden";
  return `<section class="pv-display" id="display-settings-panel" ${visibility} aria-labelledby="display-settings-title">
    <header class="pv-display-head">
      <h2 id="display-settings-title">Display settings</h2>
      <button class="linkbtn" type="button" data-act="closeDisplaySettings">Close</button>
    </header>
    <div class="pv-display-row"><span>Text size</span><span class="seg" role="group" aria-label="Text size"><button data-act="font" data-v="-2" aria-label="A−, smaller text">A−</button><button data-act="font" data-v="2" aria-label="A+, larger text">A+</button></span></div>
    <div class="pv-display-row"><span>Theme</span><span class="seg" role="group" aria-label="Theme">${["auto","light","dark"].map(t => `<button data-act="setTheme" data-v="${t}" aria-pressed="${theme === t}">${THEME_LABEL[t]}</button>`).join("")}</span></div>
    <button class="pv-display-row pv-display-contrast" type="button" data-act="contrast" aria-pressed="${!!state.prefs.hc}"><span>High contrast</span><span class="pv-display-state" aria-hidden="true">${state.prefs.hc ? "On" : "Off"}</span></button>
  </section>`;
}

function activeDisplaySettings(){
  return $("#display-trigger[aria-expanded='true']") ? $("#display-settings-panel") : null;
}

function openDisplaySettings(){
  const panel = $("#display-settings-panel"), trigger = $("#display-trigger");
  if (panel.hasAttribute("popover")) panel.showPopover({source:trigger});
  else { panel.hidden = false; trigger.setAttribute("aria-expanded", "true"); }
  positionDisplaySettings();
}

function positionDisplaySettings(){
  const panel = activeDisplaySettings();
  if (!panel) return;
  const anchor = $("#display-trigger").getBoundingClientRect();
  const {clientWidth, clientHeight} = document.documentElement;
  if (anchor.bottom < 0 || anchor.top > clientHeight) return closeDisplaySettings(false);
  const {offsetWidth, offsetHeight} = panel;
  const edge = 12, gap = 8;
  const fitsBeside = anchor.right + gap + offsetWidth <= clientWidth - edge;
  const above = anchor.bottom + gap + offsetHeight > clientHeight - edge;
  const left = fitsBeside ? anchor.right + gap : anchor.right - offsetWidth;
  const top = fitsBeside ? anchor.top : above ? anchor.top - offsetHeight - gap : anchor.bottom + gap;
  panel.style.left = Math.max(edge, Math.min(left, clientWidth - offsetWidth - edge)) + "px";
  panel.style.top = Math.max(edge, Math.min(top, clientHeight - offsetHeight - edge)) + "px";
}

function closeDisplaySettings(restoreFocus = true){
  const panel = $("#display-settings-panel"), trigger = $("#display-trigger");
  if (panel.hasAttribute("popover")) panel.hidePopover();
  else { panel.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
  if (restoreFocus) trigger.focus();
}

function agendaDate(date){
  const d = parseDate(date);
  return `<time class="pv-event-date" datetime="${date}" aria-label="${esc(fmtDate(date,{weekday:"long",month:"long",day:"numeric"}))}"><span>${d.toLocaleDateString("en-US",{month:"short"})}</span><strong>${d.getDate()}</strong><span>${d.toLocaleDateString("en-US",{weekday:"short"})}</span></time>`;
}
function agendaShift(e){
  return `<li class="pv-shift">${agendaDate(e.date)}<div class="pv-event-copy"><h3>${esc(e.title)}</h3><p class="pv-event-time">${timeRange(e)}</p><p class="pv-event-place">${esc(e.location)}</p></div><button class="btn secondary" data-act="moreInfo" data-id="${esc(e.id)}" aria-label="View shift: ${esc(e.title)}">View shift</button></li>`;
}
function agendaRecommendation(e){
  return `<li class="pv-recommendation">${agendaDate(e.date)}<div class="pv-event-copy"><h3><button class="pv-title-action" data-act="moreInfo" data-id="${esc(e.id)}">${esc(e.title)}</button></h3><p class="pv-event-place">${esc(e.location)}</p></div><p class="pv-event-time">${timeRange(e)}</p><button class="btn secondary" data-act="signup" data-id="${esc(e.id)}" aria-label="Sign up for ${esc(e.title)}">Sign up</button></li>`;
}
function volunteerHome(u){
  const s = userStats(u.id), up = s.upcoming.map(r => eventById(r.eventId)).filter(Boolean).sort(byDate);
  const recs = state.events.filter(e => e.date >= TODAY && canSeeEvent(e,u) && isVerified(e) && spotsLeft(e) > 0 && !myReg(u.id,e.id) && e.skills.some(k => u.skills.includes(k))).sort(byDate).slice(0,3);
  return `<header class="pv-greeting"><h1>Welcome back, ${esc(u.name.split(" ")[0])}</h1><a class="btn" href="#find" data-act="nav" data-v="find">Find opportunities</a></header>
    ${tourCard(u)}
    <div class="pv-home-grid">
      <section class="pv-schedule" aria-labelledby="next-shifts-heading"><div class="pv-section-head"><h2 id="next-shifts-heading">Your next shifts</h2><a class="linkbtn" href="#shifts" data-act="nav" data-v="shifts">View schedule</a></div>
        ${up.length ? `<ol class="pv-shifts">${up.slice(0,3).map(agendaShift).join("")}</ol><p class="pv-scheduled-total">${up.length} upcoming ${up.length === 1 ? "shift" : "shifts"}</p>` : `<div class="pv-empty"><h3>Your schedule is open</h3><p>Find an opportunity that fits your time and interests.</p><a class="linkbtn" href="#find" data-act="nav" data-v="find">Find your first shift</a></div>`}
      </section>
      <aside class="pv-hours" aria-labelledby="service-heading"><h2 id="service-heading">Verified service</h2><p class="pv-hours-total"><strong>${fmtH(s.hours)}</strong> <span>hours</span></p><p class="pv-hours-goal">of your ${HOUR_GOAL}-hour goal</p>${progressMeter(s.hours,HOUR_GOAL,"Service hour goal","progressbar",`${fmtH(s.hours)} of ${HOUR_GOAL} hours`)}<p class="pv-hours-percent">${Math.round(progressPercent(s.hours,HOUR_GOAL))}% complete</p><a class="linkbtn" href="#hours" data-act="nav" data-v="hours">View my hours</a></aside>
      <section class="pv-recommended" aria-labelledby="recommendations-heading"><div class="pv-section-head"><h2 id="recommendations-heading">Recommended for you</h2><a class="linkbtn" href="#find" data-act="nav" data-v="find">Browse opportunities</a></div>
        ${recs.length ? `<ul class="pv-recommendations">${recs.map(agendaRecommendation).join("")}</ul>` : `<div class="pv-empty"><p>${u.skills.length ? "No matching open shifts right now. Browse opportunities to explore other ways to help." : "Add your skills to get recommendations that match your interests."}</p><a class="linkbtn" href="#${u.skills.length ? "find" : "profile"}" data-act="nav" data-v="${u.skills.length ? "find" : "profile"}">${u.skills.length ? "Explore opportunities" : "Add my skills"}</a></div>`}
      </section>
    </div>`;
}
