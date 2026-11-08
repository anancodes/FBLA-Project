/*
 * views/auth.js
 * Login and Create Account screens, plus the one-click demo accounts.
 */
"use strict";

function loginView(){
  const brand = `<section class="login-brand"><span class="ring" aria-hidden="true"></span>
    <div class="row">${LOGO}<span style="color:#fff;font-family:var(--f-display);font-weight:700;font-size:1.2rem">VolunteerHub</span></div>
    <h1>Every shift filled. Every hour counted.</h1>
    <p class="lead">Riverbend Community Pantry posts its volunteer needs here. Volunteers sign up in a few clicks, and coordinators check people in and report the hours.</p>
    <ul>
      <li><span class="tick">✓</span><span><b>Find a shift that fits.</b> Filter by cause, date, and your skills.</span></li>
      <li><span class="tick">✓</span><span><b>Track your service hours</b> for school, scouts, or your résumé.</span></li>
      <li><span class="tick">✓</span><span><b>Run the program.</b> Coordinators manage events, attendance, and reports.</span></li>
    </ul>
    <p class="fine">Riverbend Community Pantry is a fictional organization used for this demo.</p></section>`;
  const login = `<div class="login-card">
    <div><h2 style="font-size:1.6rem">Log in</h2><p class="muted">Welcome back.</p></div>
    <form id="loginForm" class="stack" novalidate>
      <div class="field"><label for="li-email">Email</label><input id="li-email" name="email" type="email" autocomplete="username" placeholder="name@example.org"></div>
      <div class="field"><label for="li-pass">Password</label><input id="li-pass" name="password" type="password" autocomplete="current-password"></div>
      <p class="formerr" id="li-err"></p>
      <button class="btn" type="submit">Log in</button>
    </form>
    <p class="small">New here? <button class="linkbtn" data-act="authmode" data-v="signup">Create an account</button></p>
    <div class="divider">Or try a demo account</div>
    <button class="demo-btn" data-act="demo" data-v="2"><span class="avatar">MC</span><span><b>Maya Chen · Volunteer</b><span class="sub">Browse and sign up for shifts, track hours</span></span></button>
    <button class="demo-btn" data-act="demo" data-v="1"><span class="avatar">JR</span><span><b>Jordan Reyes · Coordinator</b><span class="sub">Manage events, check-in, and reports</span></span></button>
  </div>`;
  const signup = `<div class="login-card">
    <div><h2 style="font-size:1.6rem">Create an account</h2><p class="muted">It takes less than a minute.</p></div>
    <form id="signupForm" class="stack" novalidate>
      <div class="field"><label for="su-name">Full name</label><input id="su-name" name="name" autocomplete="name"><span class="ferr" id="e-name"></span></div>
      <div class="field"><label for="su-email">Email</label><input id="su-email" name="email" type="email" autocomplete="email"><span class="ferr" id="e-email"></span></div>
      <div class="field"><label for="su-phone">Phone <span class="muted">(optional)</span></label><input id="su-phone" name="phone" type="tel" placeholder="555-123-4567"><span class="ferr" id="e-phone"></span></div>
      <div class="field"><span class="lbl">I want to</span><div class="checks" role="radiogroup">
        <label class="check"><input type="radio" name="role" value="volunteer" checked> Volunteer</label>
        <label class="check"><input type="radio" name="role" value="coordinator"> Coordinate volunteers</label></div></div>
      <div class="field"><label for="su-pass">Password</label><input id="su-pass" name="password" type="password" autocomplete="new-password" placeholder="8+ characters with a letter and a number"><span class="ferr" id="e-password"></span></div>
      <div class="field"><label for="su-pass2">Confirm password</label><input id="su-pass2" name="confirm" type="password" autocomplete="new-password"><span class="ferr" id="e-confirm"></span></div>
      <button class="btn" type="submit">Create account</button>
    </form>
    <p class="small">Already have an account? <button class="linkbtn" data-act="authmode" data-v="login">Log in</button></p>
  </div>`;
  return `<div class="login">${brand}<section class="login-panel">${ui.authMode === "login" ? login : signup}</section></div>`;
}
