/*
 * views/auth.js
 * Log in, Create account, and Reset password screens, plus the one-click demo accounts.
 * In live mode, real accounts are handled by Firebase; the demo buttons open a separate
 * copy of sample data that never touches the live database.
 */
"use strict";

function loginView(){
  if (Cloud.verificationUser) return verificationView(Cloud.verificationUser);
  if (ui.authMode === "landing") return landingView();
  const live = Cloud.enabled && !ui.demo;

  const login = `<div class="login-card">
    <div><h1 class="auth-title">Sign in</h1><p class="auth-intro">Use your VolunteerHub account.</p></div>
    ${loadAccountStatus()}
    <form id="loginForm" class="stack" novalidate>
      <div class="field"><label for="li-email">Email</label><input id="li-email" name="email" type="email" maxlength="254" autocomplete="username" placeholder="name@example.org"></div>
      <div class="field"><label for="li-pass">Password</label><input id="li-pass" name="password" type="password" autocomplete="current-password" maxlength="4096"></div>
      <p class="formerr" id="li-err" role="alert"></p>
      <button class="btn" type="submit">Sign in</button>
    </form>
    <p class="auth-account-link">New here? <a href="#signup" data-act="authmode" data-v="signup">Create an account</a></p>
    ${live ? `<p class="auth-account-link"><a href="#reset" data-act="authmode" data-v="reset">Forgot password?</a></p>` : ""}
  </div>`;

  const signup = `<div class="login-card">
    <div><h1 class="auth-title">Create an account</h1><p class="auth-intro">Volunteer or coordinate service with your community.</p></div>
    ${loadAccountStatus()}
    <form id="signupForm" class="stack" novalidate>
      <div class="field"><label for="su-name">Full name</label><input id="su-name" name="name" autocomplete="name" maxlength="80"><span class="ferr" id="e-name"></span></div>
      <div class="field"><label for="su-email">Email</label><input id="su-email" name="email" type="email" maxlength="254" autocomplete="email"><span class="ferr" id="e-email"></span></div>
      <div class="field"><label for="su-phone">Phone <span class="muted">(optional)</span></label><input id="su-phone" name="phone" type="tel" maxlength="30" placeholder="555-123-4567"><span class="ferr" id="e-phone"></span></div>
      ${cityField("su-location")}
      <fieldset class="field"><legend>I want to</legend><div class="checks">
        <label class="check"><input id="su-role-volunteer" type="radio" name="role" value="volunteer" checked> Volunteer</label>
        <label class="check"><input id="su-role-coordinator" type="radio" name="role" value="coordinator"> Coordinate volunteers</label></div>
        <span class="muted small">New coordinator accounts start unverified until a site admin checks them.</span></fieldset>
      <div class="field"><label for="su-pass">Password</label><input id="su-pass" name="password" type="password" autocomplete="new-password" maxlength="128" aria-describedby="password-help"><span class="muted small" id="password-help">${live ? "Use 15 to 128 characters." : "Use 8 to 128 characters."} You can use spaces and symbols.</span><span class="ferr" id="e-password"></span></div>
      <div class="field"><label for="su-pass2">Confirm password</label><input id="su-pass2" name="confirm" type="password" autocomplete="new-password" maxlength="128"><span class="ferr" id="e-confirm"></span></div>
      <div class="field"><label class="toggle-inline"><input type="checkbox" name="waiver" id="su-waiver"> I've read and agree to the <button type="button" class="linkbtn" data-act="waiver">volunteer waiver</button> (volunteers only)</label><span class="ferr" id="e-waiver"></span></div>
      <button class="btn" type="submit">Create account</button>
    </form>
    <p class="auth-account-link">Already have an account? <a href="#login" data-act="authmode" data-v="login">Sign in</a></p>
  </div>`;

  const reset = `<div class="login-card">
    <div><h1 class="auth-title">Reset your password</h1><p class="auth-intro">We'll email you a link to choose a new password.</p></div>
    ${loadAccountStatus()}
    <form id="resetForm" class="stack" novalidate>
      <div class="field"><label for="rs-email">Email</label><input id="rs-email" name="email" type="email" maxlength="254" autocomplete="username"><span class="ferr" id="e-email"></span></div>
      <button class="btn" type="submit">Send reset link</button>
    </form>
    <p class="auth-account-link"><a href="#login" data-act="authmode" data-v="login">Back to sign in</a></p>
  </div>`;

  const panel = ui.authMode === "signup" ? signup : ui.authMode === "reset" && live ? reset : login;
  return `<div class="public-site public-auth${panel === login ? ' public-signin' : ""}">${publicHeader()}<main id="main" tabindex="-1">${panel}
    ${panel === login ? `<section class="auth-demo" aria-labelledby="auth-demo-title"><h2 id="auth-demo-title">Explore the demo</h2><p>Fictional sample data. No account needed.</p>${demoChoices()}</section>` : ""}
    </main>${publicFooter()}</div>`;
}

function verificationView(user){
  return `<div class="public-site public-auth">${publicHeader()}
    <main id="main" tabindex="-1"><div class="login-card">
      <div><h1 class="auth-title">Verify your email</h1><p class="auth-intro">Open the verification link sent to <strong>${esc(user.email)}</strong>, then come back and check your verification.</p></div>
      <div class="row"><button class="btn" data-act="checkVerification">Check verification</button>
      <button class="btn secondary" data-act="resendVerification">Resend email</button></div>
      <button class="linkbtn" data-act="cloudSignOut">Sign out</button>
    </div></main>${publicFooter()}</div>`;
}
