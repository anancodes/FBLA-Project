/* Public website and account navigation. */
"use strict";

const PUBLIC_MODES = ["landing", "login", "signup", "reset", "join"];
const PUBLIC_SECTIONS = ["how-it-works", "schools"];
document.addEventListener("error",ev => {
  const image = ev.target;
  if (!image.matches || !image.matches(".landing-hero-image")) return;
  image.hidden = true;
  const hero = image.closest(".landing-hero");
  hero.classList.add("landing-image-unavailable");
  image.closest("figure").hidden = true;
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
    <header class="public-header"><a class="public-brand" href="#home" data-act="authmode" data-v="landing">${LOGO}VolunteerHub</a>
      <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#schools">Schools & nonprofits</a><a class="btn" href="#login" data-act="authmode" data-v="login" ${ui.authMode === "login" ? 'aria-current="page"' : ""}>Sign in</a></nav>
    </header>`;
}
function accountDisclaimer(){
  return '<small class="account-disclaimer">(Demo activity is fictional.)</small>';
}
function publicFooter(signedIn = false){
  return `<footer class="public-footer"><div class="public-footer-row">
    ${signedIn ? `<span class="public-brand">${LOGO}VolunteerHub</span>` : `<a class="public-brand" href="#home" data-act="authmode" data-v="landing">${LOGO}VolunteerHub</a>`}
    <div class="public-footer-links">${displaySettingsTrigger("linkbtn public-prefs-trigger")}${displaySettingsPanel()}</div>
    </div>${accountDisclaimer()}</footer>`;
}
function landingView(){
  const orgName = state.org.name && state.org.name !== "Your Organization" ? state.org.name : "";
  return `<div class="public-site">${publicHeader()}
    <main id="main" tabindex="-1">
      <section class="landing-hero" aria-labelledby="page-title">
        <div class="landing-intro"><h1 id="page-title">Show up for your <em>community.</em></h1>
          <p>Find volunteer shifts that fit your schedule. Organize events with your school or nonprofit and keep track of every approved hour.</p>
          <div class="landing-actions"><a class="btn" href="#login" data-act="authmode" data-v="login">Sign in ${icon("arrow")}</a><a class="btn secondary" href="#signup" data-act="authmode" data-v="signup">Create an account</a></div>
          <p class="landing-note">Volunteers don't need an account. Open the link or scan the QR code your coordinator shares.</p>
        </div>
        <figure class="landing-photo"><img class="landing-hero-image" src="images/community-garden.webp" width="2232" height="779" fetchpriority="high" alt="Volunteers planting seedlings together in a community garden.">
          <figcaption>Community gardening <span>· Illustrative scene</span></figcaption></figure>
      </section>
      <section id="how-it-works" class="landing-section landing-process" tabindex="-1" aria-labelledby="process-title">
        <h2 id="process-title">From your first shift to approved hours.</h2>
        <div class="landing-process-body"><ol class="landing-steps">
          <li>${icon("search")}<h3>Find a shift</h3><p>Search for open shifts by place or cause.</p></li>
          <li>${icon("calendar")}<h3>Make the commitment</h3><p>Sign up from a coordinator's link or QR code. No account needed.</p></li>
          <li>${icon("clipboard")}<h3>Record the service</h3><p>Coordinators record attendance; clubs track approved hours.</p></li>
        </ol>
        </div>
      </section>
      <section id="schools" class="landing-section landing-audiences" tabindex="-1" aria-labelledby="audiences-title"><h2 id="audiences-title">For the people who make service happen.</h2>
        <div><h3>Nonprofits & organizers</h3><p>Post opportunities, manage sign-ups and waitlists, record attendance, and export service reports.</p>
          <h3>Schools & clubs</h3><p>Set a term goal, approve outside service, and send a Gmail check-in when a member falls behind.</p>
          <a class="linkbtn" href="#signup" data-act="authmode" data-v="signup">Create a coordinator account</a></div>
      </section>
      ${orgName || state.org.about ? `<section class="landing-section landing-org"><h2>${orgName ? esc(orgName) : "Your community"}</h2>${state.org.about ? `<p>${esc(state.org.about)}</p>` : ""}</section>` : ""}
    </main>${publicFooter()}</div>`;
}
