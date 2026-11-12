/*
 * views/auth.js
 * Log in, Create account, and Reset password screens, plus the one-click demo accounts.
 * In live mode, real accounts are handled by Firebase; the demo buttons open a separate
 * copy of sample data that never touches the live database.
 */
"use strict";

function loginView(){
  const live = Cloud.enabled && !ui.demo;
  const brand = `<section class="login-brand"><span class="ring" aria-hidden="true"></span>
    <div class="row">${LOGO}<span class="brand-word">VolunteerHub</span></div>
    <h1>Every shift filled. Every hour counted.</h1>
    <p class="lead">${esc(state.org.name)} posts its volunteer needs here.${state.org.about ? ` ${esc(state.org.about)}` : ""} Volunteers sign up in a few clicks, and coordinators check people in and report the hours.</p>
    <ul>
      <li><span class="tick">${icon("check")}</span><span><b>Find a shift that fits.</b> Search by place, cause, and your skills.</span></li>
      <li><span class="tick">${icon("check")}</span><span><b>Track club hours</b> for HOSA, NHS, and more, including service you log for approval.</span></li>
      <li><span class="tick">${icon("check")}</span><span><b>Run the program.</b> Coordinators manage events, attendance, and reports.</span></li>
    </ul>
    <p class="fine">${live ? "Your account and sign-ups are saved securely and work on any device." : "This demo uses sample volunteers, events, and places. They are not real."}</p></section>`;

  const demoButtons = `
    <div class="divider">${live ? "Or explore the demo" : "Or try a demo account"}</div>
    <button class="demo-btn" data-act="demo" data-v="2"><span class="avatar">MC</span><span><b>Maya Chen · Volunteer</b><span class="sub">Sample data: browse and sign up for shifts, track hours</span></span></button>
    <button class="demo-btn" data-act="demo" data-v="1"><span class="avatar">JR</span><span><b>Jordan Reyes · Coordinator</b><span class="sub">Sample data: events, check-in, reports, verifying organizers</span></span></button>`;

  const login = `<div class="login-card">
    <div><h2 class="auth-title">Log in</h2><p class="muted">Welcome back.</p></div>
    ${live && !Cloud.ready ? `<p class="muted small">Connecting to your organization's database…</p>` : ""}
    <form id="loginForm" class="stack" novalidate>
      <div class="field"><label for="li-email">Email</label><input id="li-email" name="email" type="email" autocomplete="username" placeholder="name@example.org"></div>
      <div class="field"><label for="li-pass">Password</label><input id="li-pass" name="password" type="password" autocomplete="current-password"></div>
      <p class="formerr" id="li-err" role="alert"></p>
      <button class="btn" type="submit">Log in</button>
    </form>
    <p class="small">New here? <button class="linkbtn" data-act="authmode" data-v="signup">Create an account</button>${live ? ` · <button class="linkbtn" data-act="authmode" data-v="reset">Forgot password?</button>` : ""}</p>
    ${demoButtons}
  </div>`;

  const signup = `<div class="login-card">
    <div><h2 class="auth-title">Create an account</h2><p class="muted">It takes less than a minute.</p></div>
    <form id="signupForm" class="stack" novalidate>
      <div class="field"><label for="su-name">Full name</label><input id="su-name" name="name" autocomplete="name"><span class="ferr" id="e-name"></span></div>
      <div class="field"><label for="su-email">Email</label><input id="su-email" name="email" type="email" autocomplete="email"><span class="ferr" id="e-email"></span></div>
      <div class="field"><label for="su-phone">Phone <span class="muted">(optional)</span></label><input id="su-phone" name="phone" type="tel" placeholder="555-123-4567"><span class="ferr" id="e-phone"></span></div>
      ${cityField("su-location")}
      <div class="field"><span class="lbl">I want to</span><div class="checks" role="radiogroup">
        <label class="check"><input type="radio" name="role" value="volunteer" checked> Volunteer</label>
        <label class="check"><input type="radio" name="role" value="coordinator"> Coordinate volunteers</label></div>
        <span class="muted small">New coordinator accounts start unverified until a site admin checks them.</span></div>
      <div class="field"><label for="su-pass">Password</label><input id="su-pass" name="password" type="password" autocomplete="new-password" placeholder="8+ characters with a letter and a number"><span class="ferr" id="e-password"></span></div>
      <div class="field"><label for="su-pass2">Confirm password</label><input id="su-pass2" name="confirm" type="password" autocomplete="new-password"><span class="ferr" id="e-confirm"></span></div>
      <div class="field"><label class="toggle-inline" style="padding:0"><input type="checkbox" name="waiver" id="su-waiver"> I've read and agree to the <button type="button" class="linkbtn" data-act="waiver">volunteer waiver</button> (volunteers only)</label><span class="ferr" id="e-waiver"></span></div>
      <button class="btn" type="submit">Create account</button>
    </form>
    <p class="small">Already have an account? <button class="linkbtn" data-act="authmode" data-v="login">Log in</button></p>
  </div>`;

  const reset = `<div class="login-card">
    <div><h2 class="auth-title">Reset your password</h2><p class="muted">We'll email you a link to choose a new password.</p></div>
    <form id="resetForm" class="stack" novalidate>
      <div class="field"><label for="rs-email">Email</label><input id="rs-email" name="email" type="email" autocomplete="username"><span class="ferr" id="e-email"></span></div>
      <button class="btn" type="submit">Send reset link</button>
    </form>
    <p class="small"><button class="linkbtn" data-act="authmode" data-v="login">Back to log in</button></p>
  </div>`;

  const panel = ui.authMode === "signup" ? signup : ui.authMode === "reset" && live ? reset : login;
  return `<main class="login">${brand}<section class="login-panel">${panel}</section></main>`;
}
