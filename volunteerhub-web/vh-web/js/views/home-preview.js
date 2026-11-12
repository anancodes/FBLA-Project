/* A scoped, working Home proposal. Other screens keep the existing interface. */
"use strict";

function isHomePreview(u){ return !!u && u.role === "volunteer" && ui.view === "dashboard"; }

function homePreviewShell(u){
  const s = userStats(u.id), unread = unreadCount(u);
  const pending = managedClubs(u).reduce((n,c) => n + state.hourLogs.filter(l => l.clubId === c.id && l.status === "pending" && l.userId !== u.id).length,0);
  const counts = {shifts:s.upcoming.length, hours:pending, news:unread};
  const countLabel = {shifts:"upcoming shifts",hours:"hours awaiting review",news:"unread messages"};
  return `<div class="shell pv-shell">
    <a class="pv-skip" href="#main">Skip to main content</a>
    <div class="frame pv-frame">
      <aside class="pv-sidebar">
        <div class="brand pv-brand">${LOGO}<strong>VolunteerHub</strong></div>
        <nav class="rail" aria-label="Main">${menuFor(u).map(([view,label]) => `<button data-act="nav" data-v="${view}" ${view === "dashboard" ? 'aria-current="page"' : ""} class="${ui.tour && view === "dashboard" ? "tour-hl" : ""}">${icon(NAV_ICON[view])}<span>${label}</span>${counts[view] ? `<span class="count" aria-label="${counts[view]} ${countLabel[view]}">${counts[view]}</span>` : ""}</button>`).join("")}</nav>
        <div class="pv-sidebar-bottom">
          <button class="pv-profile" data-act="nav" data-v="profile" aria-label="${esc(initials(u.name))} ${esc(u.name)} View profile"><span class="avatar" aria-hidden="true">${esc(initials(u.name))}</span> <span><strong>${esc(u.name)}</strong> <small>View profile</small></span></button>
          <button class="pv-utility" id="display-trigger" data-act="homeDisplay" aria-label="Display settings" aria-expanded="${!!ui.homeDisplay}" aria-controls="home-display-panel">${icon("sliders")}<span class="pv-display-long">Display settings</span><span class="pv-display-short" aria-hidden="true">Display</span></button>
          ${homeDisplayPanel()}
          <div class="pv-utility-links"><button data-act="nav" data-v="help">Help</button><button data-act="tour">Take the tour</button></div>
        </div>
      </aside>
      <div class="pv-workspace">
        <header class="pv-toolbar"><span>${state.org.name === "Your Organization" ? "" : esc(state.org.name)}</span><div><button class="pv-mobile-help" data-act="nav" data-v="help">Help</button>${!DB.live ? `<span class="pv-demo">Demo data</span>` : `<span class="pv-connection" id="sync-status">${Cloud.online ? "Connected" : "Offline"}</span>`}<button data-act="logout">${DB.live ? "Sign out" : "Exit demo"}</button></div></header>
        <main id="main" tabindex="-1"><div class="page pv-page">${homePreviewView(u,s)}</div></main>
        <footer class="foot pv-footer">${DB.live ? `<span>Signed in as ${esc(u.email)}</span>` : `<span>Sample data, saved in this browser.</span>${armBtn("reset","Reset demo data","Confirm reset","secondary sm")}`}</footer>
      </div>
    </div>
  </div>`;
}

function homeDisplayPanel(){
  const theme = state.prefs.theme || "auto";
  return `<section class="pv-display" id="home-display-panel" aria-label="Display settings" ${ui.homeDisplay ? "" : "hidden"}>
    <div><span>Text size</span><span class="seg"><button data-act="font" data-v="-2" aria-label="A−, smaller text">A−</button><button data-act="font" data-v="2" aria-label="A+, larger text">A+</button></span></div>
    <div><span>Theme</span><span class="seg">${["auto","light","dark"].map(t => `<button data-act="setTheme" data-v="${t}" aria-pressed="${theme === t}">${THEME_LABEL[t]}</button>`).join("")}</span></div>
    <div><span>High contrast</span><button class="btn secondary sm" data-act="contrast" aria-pressed="${!!state.prefs.hc}">${state.prefs.hc ? "On" : "Off"}</button></div>
  </section>`;
}

function homePreviewDate(date){
  const d = parseDate(date);
  return `<time class="pv-event-date" datetime="${date}" aria-label="${esc(fmtDate(date,{weekday:"long",month:"long",day:"numeric"}))}"><span>${d.toLocaleDateString("en-US",{month:"short"})}</span><strong>${d.getDate()}</strong><span>${d.toLocaleDateString("en-US",{weekday:"short"})}</span></time>`;
}

function homePreviewShift(e,index){
  return `<li class="pv-shift${index === 0 ? " pv-next" : ""}">${homePreviewDate(e.date)}<div class="pv-event-copy"><h3>${esc(e.title)}</h3><p class="pv-event-time">${timeRange(e)}</p><p class="pv-event-place">${esc(e.location)}</p></div><button class="btn secondary" data-act="moreInfo" data-id="${e.id}" aria-label="View shift: ${esc(e.title)}">View shift</button></li>`;
}

function homePreviewRecommendation(e,u){
  return `<li class="pv-recommendation">${homePreviewDate(e.date)}<div class="pv-event-copy"><h3><button class="pv-title-action" data-act="moreInfo" data-id="${e.id}">${esc(e.title)}</button></h3><p class="pv-event-time">${timeRange(e)}</p><p class="pv-event-place">${esc(e.location)}</p></div><button class="btn secondary" data-act="signup" data-id="${e.id}" aria-label="Sign up for ${esc(e.title)}">Sign up</button></li>`;
}

function homePreviewView(u,s){
  const up = s.upcoming.map(r => eventById(r.eventId)).filter(Boolean).sort(byDate);
  const recs = state.events.filter(e => e.date >= TODAY && canSeeEvent(e,u) && isVerified(e) && spotsLeft(e) > 0 && !myReg(u.id,e.id) && e.skills.some(k => u.skills.includes(k))).sort(byDate).slice(0,3);
  return `<header class="pv-greeting"><div><h1>Welcome back, ${esc(u.name.split(" ")[0])}</h1><p><time datetime="${TODAY}">${fmtDate(TODAY,{weekday:"long",month:"long",day:"numeric"})}</time></p></div><button class="btn" data-act="nav" data-v="find">Find opportunities</button></header>
    ${tourCard(u)}
    <div class="pv-home-grid">
      <section class="pv-schedule" aria-labelledby="next-shifts-heading"><div class="pv-section-head"><h2 id="next-shifts-heading">Your next shifts</h2><button class="linkbtn" data-act="nav" data-v="shifts">View schedule</button></div>
        ${up.length ? `<ol class="pv-shifts">${up.slice(0,3).map(homePreviewShift).join("")}</ol><p class="pv-scheduled-total">${up.length} upcoming ${up.length === 1 ? "shift" : "shifts"}</p>` : `<div class="pv-empty"><h3>Your schedule is open</h3><p>Find an opportunity that fits your time and interests.</p><button class="linkbtn" data-act="nav" data-v="find">Find your first shift</button></div>`}
      </section>
      <aside class="pv-hours" aria-labelledby="service-heading"><h2 id="service-heading">Verified service</h2><p class="pv-hours-total"><strong>${fmtH(s.hours)}</strong> <span>hours</span></p><p class="pv-hours-goal">of your ${HOUR_GOAL}-hour goal</p>${progressMeter(s.hours,HOUR_GOAL,"Service hour goal","progressbar",`${fmtH(s.hours)} of ${HOUR_GOAL} hours`)}<p class="pv-hours-percent">${Math.round(progressPercent(s.hours,HOUR_GOAL))}% complete</p><button class="linkbtn" data-act="nav" data-v="hours">View my hours</button></aside>
      <section class="pv-recommended" aria-labelledby="recommendations-heading"><div class="pv-section-head"><h2 id="recommendations-heading">Recommended for you</h2><button class="linkbtn" data-act="nav" data-v="find">Browse opportunities</button></div>
        ${recs.length ? `<ul class="pv-recommendations">${recs.map(e => homePreviewRecommendation(e,u)).join("")}</ul>` : `<div class="pv-empty"><p>${u.skills.length ? "No matching open shifts right now. Browse opportunities to explore other ways to help." : "Add your skills to get recommendations that match your interests."}</p><button class="linkbtn" data-act="nav" data-v="${u.skills.length ? "find" : "profile"}">${u.skills.length ? "Explore opportunities" : "Add my skills"}</button></div>`}
      </section>
    </div>`;
}
