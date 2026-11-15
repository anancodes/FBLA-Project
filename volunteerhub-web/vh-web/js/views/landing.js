/* Public website, account navigation and sample-data entry points. */
"use strict";

const PUBLIC_MODES = ["landing", "login", "signup", "reset"];
const PUBLIC_SECTIONS = ["how-it-works", "schools", "demo"];
document.addEventListener("error",ev => {
  const image = ev.target;
  if (!image.matches || !image.matches(".landing-hero-image")) return;
  image.hidden = true;
  const hero = image.closest(".landing-hero");
  hero.classList.add("landing-image-unavailable");
  const caption = hero.nextElementSibling;
  if (caption && caption.classList.contains("landing-photo-note")) caption.hidden = true;
},true);
function isPublicRoute(route){ return !route || route === "home" || PUBLIC_MODES.includes(route) || PUBLIC_SECTIONS.includes(route); }
function publicModeFromURL(route = pageFromURL()){
  if (!route || route === "home" || PUBLIC_SECTIONS.includes(route)) return "landing";
  return PUBLIC_MODES.includes(route) ? route : "login";
}
function focusPublicPage(){
  const heading = document.getElementById("page-title");
  if (heading) heading.focus({preventScroll:true});
  window.scrollTo(0,0);
}
function navigatePublic(mode){
  if (!PUBLIC_MODES.includes(mode)) return;
  closeModal(false); ui.authMode = mode;
  setPageURL(mode === "landing" ? "home" : mode);
  render(); focusPublicPage();
}
function followPublicURL(){
  if (location.hash === "#main" || location.hash === "#page-title") return;
  const route = pageFromURL(), mode = publicModeFromURL(route);
  ui.requestedRoute = isPublicRoute(route) ? null : route;
  if (ui.authMode !== mode){ ui.authMode = mode; render(); focusPublicPage(); }
  if (PUBLIC_SECTIONS.includes(route)){
    const section = document.getElementById(route);
    if (section){ section.focus({preventScroll:true}); section.scrollIntoView({block:"start"}); }
  }
}
function publicHeader(){
  return `<a class="pv-skip" href="#main">Skip to content</a>
    <header class="public-header"><a class="public-brand" href="#home" data-act="authmode" data-v="landing">VolunteerHub</a>
      <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#schools">Schools & nonprofits</a><a class="btn" href="#login" data-act="authmode" data-v="login" ${ui.authMode === "login" ? 'aria-current="page"' : ""}>Sign in</a></nav>
    </header>`;
}
function demoChoices(){
  return `<div class="public-demo-choices">
    <div><h3>Volunteer</h3><p>Find shifts, manage a schedule, and follow service hours.</p><button class="btn secondary" data-act="demo" data-v="2">Try volunteer demo</button></div>
    <div><h3>Coordinator</h3><p>Create events, record attendance, and manage volunteers.</p><button class="btn secondary" data-act="demo" data-v="1">Try coordinator demo</button></div>
  </div>`;
}
function publicFooter(){
  const theme = state.prefs.theme || "auto";
  return `<footer class="public-footer"><a class="public-brand" href="#home" data-act="authmode" data-v="landing">VolunteerHub</a>
    <div class="public-footer-links"><a href="#demo">Explore the demo</a>
    <details id="public-display-settings" class="public-prefs"><summary>Display settings</summary><div class="public-prefs-controls">
      <div><span>Text size</span><span class="seg"><button data-act="font" data-v="-2" aria-label="Smaller text">A−</button><button data-act="font" data-v="2" aria-label="Larger text">A+</button></span></div>
      <div><span>Theme</span><span class="seg">${["auto","light","dark"].map(t => `<button data-act="setTheme" data-v="${t}" aria-pressed="${theme === t}">${THEME_LABEL[t]}</button>`).join("")}</span></div>
      <div><span>High contrast</span><button class="btn secondary sm" data-act="contrast" aria-pressed="${!!state.prefs.hc}">${state.prefs.hc ? "On" : "Off"}</button></div>
    </div></details></div></footer>`;
}
function landingView(){
  const orgName = state.org.name && state.org.name !== "Your Organization" ? state.org.name : "";
  return `<div class="public-site">${publicHeader()}
    <main id="main" tabindex="-1">
      <section class="landing-hero" aria-labelledby="page-title">
        <img class="landing-hero-image" src="images/community-garden.webp" width="2232" height="779" fetchpriority="high" alt="Illustrative scene of volunteers planting together in a community garden.">
        <div class="landing-intro"><h1 id="page-title">Show up for your community.</h1><p>Find volunteer shifts, coordinate events, and track approved hours for your school or organization.</p>
          <div class="landing-actions"><a class="btn" href="#login" data-act="authmode" data-v="login">Sign in</a><a class="btn secondary" href="#demo">Try the demo</a></div>
        </div>
      </section>
      <p class="landing-photo-note">Illustrative community service image</p>
      <section id="how-it-works" class="landing-section landing-process" tabindex="-1" aria-labelledby="process-title">
        <h2 id="process-title">From your first shift to approved hours.</h2>
        <div class="landing-process-body"><ol class="landing-steps">
          <li><h3>Find a shift</h3><p>Browse opportunities by place, cause and skills.</p></li>
          <li><h3>Make the commitment</h3><p>Sign up, check the details, and keep your schedule together.</p></li>
          <li><h3>Record the service</h3><p>Coordinators record attendance; clubs track approved hours.</p></li>
        </ol>
        <figure class="sample-record"><figcaption><h3>Saturday Food Sort</h3><p>Sample service record</p></figcaption><dl>
          <div><dt>Place</dt><dd>Main Pantry Warehouse</dd></div><div><dt>Shift</dt><dd>9:00 AM–12:00 PM</dd></div><div><dt>Attendance</dt><dd>Recorded by coordinator</dd></div><div><dt>Service</dt><dd>3 approved hours</dd></div>
        </dl></figure></div>
      </section>
      <section id="schools" class="landing-section landing-audiences" tabindex="-1" aria-labelledby="audiences-title"><h2 id="audiences-title">For the people who make service happen.</h2>
        <div><h3>Nonprofits & organizers</h3><p>Post opportunities, manage sign-ups and waitlists, record attendance, and export service reports.</p>
          <h3>Schools & clubs</h3><p>Set a term requirement, count club-event hours, and review outside service before it counts toward a member’s progress.</p>
          <a class="linkbtn" href="#signup" data-act="authmode" data-v="signup">Create an account</a></div>
      </section>
      ${orgName || state.org.about ? `<section class="landing-section landing-org"><h2>${orgName ? esc(orgName) : "Your community"}</h2>${state.org.about ? `<p>${esc(state.org.about)}</p>` : ""}</section>` : ""}
      <section id="demo" class="landing-section landing-demo" tabindex="-1" aria-labelledby="demo-title"><div class="landing-demo-heading"><h2 id="demo-title">Take a look around.</h2><p>Explore either role with sample data. No account needed.</p></div>${demoChoices()}</section>
    </main>${publicFooter()}</div>`;
}
