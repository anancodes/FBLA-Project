/* Public accounts and the role-specific activity shown after signing in. */
"use strict";

function profileForm(completing, hosted){
  const description = completing ? "Your sign-in is ready. Choose how you’ll use VolunteerHub." : "Coordinators create an account to post events and invite volunteers. Volunteers can skip this and join from a coordinator’s link or QR code.";
  return `<div class="login-card"><div><h1 class="auth-title">${completing ? "Finish your profile" : "Create an account"}</h1><p class="auth-intro">${description}</p></div>
    <form id="${completing ? "completeProfileForm" : "signupForm"}" class="stack" novalidate>
      <fieldset class="field"><legend>Account role</legend><div class="account-roles">
        <label class="account-role"><input id="su-role-volunteer" type="radio" name="role" value="volunteer" required aria-describedby="e-role"><span><strong>Volunteer</strong><small>Find shifts and track hours.</small></span></label>
        <label class="account-role"><input id="su-role-coordinator" type="radio" name="role" value="coordinator" required aria-describedby="e-role"><span><strong>Coordinator</strong><small>Organize shifts and review service.</small></span></label>
      </div><span class="ferr" id="e-role"></span></fieldset>
      <div class="field"><label for="su-name">Full name</label><input id="su-name" name="name" autocomplete="name" maxlength="80" required aria-describedby="e-name"><span class="ferr" id="e-name"></span></div>
      ${completing ? `<p class="small muted">Signed in as ${esc(Cloud.auth.currentUser.email)}</p>` : `
      <div class="field"><label for="su-email">Email</label><input id="su-email" name="email" type="email" maxlength="254" autocomplete="email" required aria-describedby="e-email"><span class="ferr" id="e-email"></span></div>
      <div class="field"><label for="su-pass">Password</label><input id="su-pass" name="password" type="password" autocomplete="new-password" maxlength="128" required aria-describedby="password-help e-password"><span class="muted small" id="password-help">Use ${hosted ? "15" : "8"} to 128 characters. Spaces and symbols are welcome.</span><span class="ferr" id="e-password"></span></div>
      <div class="field"><label for="su-pass2">Confirm password</label><input id="su-pass2" name="confirm" type="password" autocomplete="new-password" maxlength="128" required aria-describedby="e-confirm"><span class="ferr" id="e-confirm"></span></div>`}
      <div class="field"><label for="su-phone">Phone <span class="muted">(optional)</span></label><input id="su-phone" name="phone" type="tel" autocomplete="tel" maxlength="30" aria-describedby="e-phone"><span class="ferr" id="e-phone"></span></div>
      ${cityField("su-location")}
      <div class="field volunteer-waiver"><label class="toggle-inline"><input type="checkbox" name="waiver" id="su-waiver" aria-describedby="e-waiver"> I agree to the volunteer waiver.</label><button type="button" class="linkbtn" data-act="waiver">Read the waiver</button><span class="ferr" id="e-waiver"></span></div>
      <p class="formerr" role="alert"></p><button class="btn" type="submit">${completing ? "Save profile" : "Create account"}</button>
    </form>
    ${completing ? "" : '<p class="auth-account-link">Already have an account? <a href="#login" data-act="authmode" data-v="login">Sign in</a></p>'}</div>`;
}

function accountHeader(){
  return `<a class="pv-skip" href="#main">Skip to content</a><header class="public-header account-header"><span class="public-brand">${LOGO}VolunteerHub</span><button class="btn secondary" data-act="logout">Sign out</button></header>`;
}

function loginView(){
  const hosted = Cloud.enabled || !OFFLINE_WORKBOOK;
  if (Cloud.auth?.currentUser){
    if (Cloud.previewProfile) return accountOverview(Cloud.previewProfile);
    const panel = Cloud.needsProfile ? profileForm(true, true) : `<div class="login-card"><h1>Opening your workspace</h1>${loadAccountStatus()}</div>`;
    return `<div class="public-site public-auth">${accountHeader()}<main id="main" tabindex="-1">${panel}</main>${publicFooter(true)}</div>`;
  }
  if (ui.authMode === "landing") return landingView();
  if (ui.authMode === "join") return guestView();
  let panel;
  if (ui.authMode === "signup") panel = profileForm(false, hosted);
  else if (ui.authMode === "reset" && hosted) panel = `<div class="login-card">
    <div><h1 class="auth-title">Reset your password</h1><p class="auth-intro">We'll email you a link to choose a new password.</p></div>
    <form id="resetForm" class="stack" novalidate>
      <div class="field"><label for="rs-email">Email</label><input id="rs-email" name="email" type="email" maxlength="254" autocomplete="username" required aria-describedby="e-email"><span class="ferr" id="e-email"></span></div>
      <button class="btn" type="submit">Send reset link</button></form>
    <p class="auth-account-link"><a href="#login" data-act="authmode" data-v="login">Back to sign in</a></p></div>`;
  else panel = `<div class="login-card">
    <div><h1 class="auth-title">Sign in</h1><p class="auth-intro">Use the email and password for your VolunteerHub account.</p></div>
    <form id="loginForm" class="stack" novalidate>
      <div class="field"><label for="li-email">Email</label><input id="li-email" name="email" type="email" maxlength="254" autocomplete="username" required></div>
      <div class="field"><label for="li-pass">Password</label><input id="li-pass" name="password" type="password" autocomplete="current-password" maxlength="4096" required></div>
      <p class="formerr" id="li-err" role="alert"></p><button class="btn" type="submit">Sign in</button>
    </form>
    ${hosted ? '<p class="auth-account-link"><a href="#reset" data-act="authmode" data-v="reset">Forgot password?</a></p>' : ""}
    <p class="auth-account-link">Volunteering? Open the link or scan the QR code from your coordinator. No account needed.</p>
    <p class="auth-account-link">Coordinating? <a href="#signup" data-act="authmode" data-v="signup">Create an account</a></p></div>`;
  return `<div class="public-site public-auth">${publicHeader()}<main id="main" tabindex="-1">${loadAccountStatus()}${panel}</main>${publicFooter()}</div>`;
}

// The illustrative schedule has no database references or actions that can change real records.
let activityExamples;
function activityList(items, label, row){
  const rows = items.map(row);
  const rest = rows.slice(3);
  return rows.slice(0,3).join("") + (rest.length ? `<details class="more-activity"><summary>${rest.length} more ${esc(label)}</summary>${rest.join("")}</details>` : "");
}
function exampleActivity(role){
  activityExamples ||= seed();
  const {events, regs, hourLogs, clubs, memberships, announcements} = activityExamples;
  const coordinator = role === "coordinator";
  const shifts = events.filter(event => event.date > TODAY).sort(byDate);
  const records = hourLogs.filter(log => coordinator ? log.status === "pending" : log.userId === 2).sort((a,b) => b.date.localeCompare(a.date));
  return `<section class="example-activity" aria-label="Example community activity">
    <section class="activity-card"><h2>${coordinator ? "Shift coverage" : "Upcoming shifts"}</h2><p class="small muted">Example community schedule</p>
      ${activityList(shifts, "shifts", event => {
        const booked = regs.filter(r => r.eventId === event.id && HOLDS_SPOT.includes(r.status)).length;
        return `<details class="activity-row"><summary><span><strong>${esc(event.title)}</strong><small>${esc(fmtDate(event.date))} · ${esc(timeRange(event))}</small></span><span class="activity-count">${coordinator ? `${booked}/${event.slots} filled` : booked >= event.slots ? "Full" : `${event.slots - booked} open`}</span></summary><p>${esc(event.desc)}</p><p class="small">${esc(event.location)}</p></details>`;
      })}</section>
    <section class="activity-card"><h2>${coordinator ? "Hours awaiting review" : "Service record"}</h2><p class="small muted">${coordinator ? "Example review queue" : "Example volunteer · Maya Chen"}</p>
      ${activityList(records, "records", log => `<details class="activity-row"><summary><span><strong>${esc(coordinator ? log.name : log.place)}</strong><small>${esc(fmtDate(log.date))} · ${esc(coordinator ? log.place : (log.status === "approved" ? "Approved" : "Awaiting review"))}</small></span><span class="activity-count">${fmtH(log.hours)} h</span></summary><p>${esc(log.activity)}</p></details>`)}</section>
    <section class="activity-card"><h2>${coordinator ? "Club requirements" : "Club progress"}</h2><p class="small muted">${coordinator ? "Example term goals" : "Example member · Maya Chen"}</p>
      ${clubs.map(club => {
        const term = club.req;
        const total = HourPace.totals(club, events, regs, hourLogs, TODAY).get(2);
        const earned = (total?.eventHours || 0) + (total?.approved || 0);
        const members = memberships.filter(m => m.clubId === club.id && m.role !== "adviser").length;
        return `<details class="activity-row"><summary><span><strong>${esc(club.name)}</strong><small>${esc(term.label)} · ${esc(fmtDate(term.start))} – ${esc(fmtDate(term.end))}</small></span><span class="activity-count">${coordinator ? `${members} members · ${term.hours} h goal` : `${fmtH(earned)} of ${term.hours} h`}</span></summary><p>${esc(club.about)}</p></details>`;
      }).join("")}</section>
    <section class="activity-card"><h2>Community updates</h2><p class="small muted">Example announcements</p>
      ${announcements.filter(item => item.audience === "all" || coordinator).map(item => `<details class="activity-row"><summary><strong>${esc(item.title)}</strong></summary><p>${esc(item.body)}</p></details>`).join("")}</section>
  </section>`;
}

function accountOverview(profile){
  const coordinator = profile.role === "coordinator";
  const sent = Cloud.verificationSentUid === profile.id;
  return `<div class="public-site account-overview">${accountHeader()}<main id="main" tabindex="-1">
    <header class="account-welcome"><p>${esc(profile.name)}</p><h1>${coordinator ? "Coordinator workspace" : "Volunteer workspace"}</h1></header>
    <section class="account-verification"><h2>Verify your email</h2>
      <p>${sent ? `Open the link sent to <strong>${esc(profile.email)}</strong>, then check your verification here.` : `Confirm <strong>${esc(profile.email)}</strong> to ${coordinator ? "open your organization’s records. An administrator approves new coordinators before they can manage volunteers." : "join shifts and record your own service hours."}`}</p>
      <div class="row"><button class="btn" data-act="resendVerification">${sent ? "Resend email" : "Send verification email"}</button>
      <button class="btn secondary" data-act="checkVerification">Check verification</button></div>
    </section>
    ${exampleActivity(profile.role)}</main>${publicFooter(true)}</div>`;
}
