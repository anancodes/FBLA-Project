/*
 * guest.js
 * Guest passes: volunteers join from a coordinator's link or QR code without creating an account.
 *   - A link looks like  index.html?invite=K7Q2M9PX4TRA            (general guest link)
 *                        index.html?join=HOSA-7K2PQM               (join a club as a guest)
 *                        either one plus &event=123                (open that event after joining)
 *   - In live mode a guest is a Firebase anonymous sign-in saved in this browser. The database
 *     only accepts a guest profile when the invite or club code is active (see firestore.rules).
 *   - A guest can add an email and password later so their hours follow them to other devices.
 * Only coordinators need full accounts.
 */
"use strict";

const INVITE_PATTERN = /^[A-Z0-9]{12}$/;
const CLUB_CODE_PATTERN = /^[A-Z0-9]{2,6}-([A-Z0-9]{6}|[A-Z0-9]{12})$/;
const GUEST_FLAG = "volunteerhub-guest";   // this browser holds a guest pass (keep the sign-in after the tab closes)

/* ----- Links ----- */
// Reads ?invite=, ?join= and ?event= once at start-up, then removes them from the address bar.
function readInviteFromURL(){
  let params;
  try { params = new URLSearchParams(location.search); } catch(e){ return null; }
  if (!["invite", "join", "event"].some(key => params.has(key))) return null;
  const invite = normalizeCode(params.get("invite") || ""), join = normalizeCode(params.get("join") || "");
  const event = Number(params.get("event"));
  const code = INVITE_PATTERN.test(invite) ? invite : CLUB_CODE_PATTERN.test(join) ? join : "";
  try { history.replaceState(history.state, "", location.pathname + location.hash); } catch(e){}
  return {code, club:CLUB_CODE_PATTERN.test(code), event:Number.isSafeInteger(event) && event > 0 ? event : null,
    broken:Boolean(invite || join) && !code};
}
function guestLink(code, eventId = null){
  const params = new URLSearchParams();
  params.set(CLUB_CODE_PATTERN.test(code) ? "join" : "invite", code);
  if (eventId) params.set("event", String(eventId));
  return `${location.origin}${location.pathname}?${params}#join`;
}
function makeInviteCode(){
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", random = crypto.getRandomValues(new Uint8Array(12));
  return [...random].map(byte => alphabet[byte % alphabet.length]).join("");
}
const myInvite = u => (state.invites || []).find(i => i.createdBy === u.id && i.active) || null;

/* ----- QR codes (drawn locally with the bundled qrcode-generator library; nothing is sent anywhere) ----- */
function qrMatrix(text){
  const qr = qrcode(0, "M");
  qr.addData(text); qr.make();
  const n = qr.getModuleCount();
  return {n, dark:(r, c) => qr.isDark(r, c)};
}
function qrSVG(text, label){
  const {n, dark} = qrMatrix(text), margin = 4, size = n + margin * 2;
  let path = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark(r, c)) path += `M${c + margin} ${r + margin}h1v1h-1z`;
  return `<svg class="qr-code" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
function downloadQR(text, title){
  const {n, dark} = qrMatrix(text), scale = 12, margin = 4, size = (n + margin * 2) * scale, caption = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size + caption;
  const g = canvas.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#000";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark(r, c)) g.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
  g.font = "600 22px system-ui, sans-serif"; g.textAlign = "center";
  g.fillText(String(title).slice(0, 48), size / 2, size + 22);
  g.font = "16px system-ui, sans-serif"; g.fillStyle = "#333";
  g.fillText("Scan to volunteer with VolunteerHub. No account needed.", size / 2, size + 48);
  canvas.toBlob(blob => {
    if (!blob) return toast("Your browser couldn't create the image. Take a screenshot of the code instead.", "bad");
    const a = document.createElement("a"), href = URL.createObjectURL(blob);
    a.href = href; a.download = `volunteerhub-qr-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest"}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    toast("QR code downloaded.");
  }, "image/png");
}
function shareBlock(link, title){
  return `<div class="share-block">${qrSVG(link, `QR code for ${title}`)}
    <div class="stack">
      <div class="field"><label for="share-link">Guest link</label><input id="share-link" class="share-link" value="${esc(link)}" readonly></div>
      <div class="row"><button class="btn" type="button" data-act="copyLink" data-v="${esc(link)}">Copy link</button>
        <button class="btn secondary" type="button" data-act="downloadQR" data-v="${esc(link)}" data-id="${esc(title)}">Download QR code</button></div>
      <p class="muted small">Print the QR code on a flyer or show it on a screen. People who scan it can sign up without making an account.</p>
    </div></div>`;
}
function openShare(title, intro, link){
  openModal(`<div class="spread"><h2>Share ${esc(title)}</h2><button class="btn secondary sm" data-act="close">Close</button></div>
    <p class="muted">${intro}</p>${shareBlock(link, title)}`);
}

/* ----- Coordinator: guest link page ----- */
function cInvite(u){
  const invite = myInvite(u), canInvite = !DB.live || DB.isVerifiedCoordinator(u);
  const link = invite ? guestLink(invite.code) : "";
  return `<div class="head"><div><h1>Invite volunteers</h1><p class="muted">Volunteers join from your link or QR code. They don't need an account. Only coordinators do.</p></div></div>
    <section class="card stack" aria-labelledby="guest-link-title">
      <h2 id="guest-link-title">Your guest link</h2>
      ${!canInvite ? `<p class="muted">A site admin must verify your organizer account before you can invite guests.</p>`
        : invite ? `${shareBlock(link, state.org.name !== "Your Organization" ? state.org.name : "VolunteerHub")}
          <div class="row">${armBtn(`newinvite:${invite.code}`, "Make a new link", "Old link and QR code stop working", "secondary sm")}</div>
          <p class="muted small">Guests who already joined keep their access when you make a new link.</p>`
        : `<p class="muted">You don't have a guest link yet.</p><div class="row"><button class="btn" data-act="createInvite">Create guest link</button></div>`}
    </section>
    <section class="card stack" aria-labelledby="guest-how-title">
      <h2 id="guest-how-title">How guest passes work</h2>
      <ul class="plain-list">
        <li>Guests enter their name and accept the volunteer waiver. Then they can sign up for shifts, join clubs, and log outside hours.</li>
        <li>The guest pass is saved in the browser they used. They can add an email from their Profile page to keep their hours on any device.</li>
        <li>To share one event, open it under Events and choose <b>Share</b>. To fill a club, use <b>Share join link</b> on the club's page.</li>
        <li>Guests without an email don't receive Gmail hour alerts.</li>
      </ul>
    </section>`;
}
async function createInvite(old){
  const u = currentUser();
  if (DB.live && !DB.isVerifiedCoordinator(u)) return;
  const record = {code:makeInviteCode(), createdBy:u.id, createdAt:TODAY, active:true};
  if (!DB.live){
    state.invites = (state.invites || []).map(i => i.code === old ? {...i, active:false} : i).concat(record);
    save(); render(); return toast(old ? "New guest link created. The old link no longer works." : "Guest link created.");
  }
  return runPending("invite", "Creating guest link…", document.querySelector('[data-act="createInvite"], [data-act="arm"][data-v^="newinvite"]'),
    () => Cloud.createInvite(record, old), () => toast(old ? "New guest link created. The old link no longer works." : "Guest link created."),
    err => toast(Cloud.friendly(err), "bad"));
}
// Event links reuse the club's join code for club events, otherwise the coordinator's guest link.
async function shareEvent(id){
  const e = eventById(id), u = currentUser();
  if (!e) return;
  const title = e.title, intro = `Anyone who opens this link or scans the code can join as a guest and go straight to ${esc(e.title)} on ${fmtDate(e.date)}.`;
  if (e.clubId){
    const code = state.clubCodes[e.clubId];
    if (!code) return toast("This club's join code is still loading. Try again in a moment.", "bad");
    return openShare(title, `${intro} Guests also join ${esc(clubById(e.clubId)?.name || "the club")}.`, guestLink(code, e.id));
  }
  let invite = myInvite(u);
  if (!invite){
    if (DB.live && !DB.isVerifiedCoordinator(u)) return toast("A site admin must verify your organizer account before you can invite guests.", "bad");
    await createInvite();
    invite = myInvite(u);
    if (!invite) return;
  }
  openShare(title, intro, guestLink(invite.code, e.id));
}
function shareClub(id){
  const c = clubById(id), code = state.clubCodes[id];
  if (!c || !code) return;
  openShare(c.name, `Anyone who opens this link or scans the code joins ${esc(c.name)}. People without an account join as guests.`, guestLink(code));
}

/* ----- Visitor: guest welcome screen ----- */
function guestView(){
  const invite = ui.invite, live = Cloud.enabled;
  const orgName = state.org.name && state.org.name !== "Your Organization" ? state.org.name : "";
  const usable = invite && invite.code;
  const what = invite?.club ? "join a club" : invite?.event ? "sign up for a shift" : "volunteer";
  return `<div class="public-site public-auth">${publicHeader()}<main id="main" tabindex="-1"><div class="login-card">
    <div><h1 class="auth-title">${usable ? "Join as a guest" : "This link isn't complete"}</h1>
    <p class="auth-intro">${usable ? `You've been invited to ${what}${orgName ? ` with ${esc(orgName)}` : ""}. You don't need an account.` : "Ask your coordinator for a new link, or scan their QR code again."}</p></div>
    ${live ? loadAccountStatus() : ""}
    ${usable ? `<form id="guestForm" class="stack" novalidate>
      <div class="field"><label for="g-name">Full name</label><input id="g-name" name="name" autocomplete="name" maxlength="80"><span class="ferr" id="e-name"></span></div>
      <div class="field"><label for="g-phone">Phone <span class="muted">(optional)</span></label><input id="g-phone" name="phone" type="tel" maxlength="30" placeholder="555-123-4567" aria-describedby="g-phone-help"><span class="muted small" id="g-phone-help">Coordinators use this if a shift changes.</span><span class="ferr" id="e-phone"></span></div>
      <div class="field"><label class="toggle-inline"><input type="checkbox" name="waiver" id="g-waiver"> I've read and agree to the <button type="button" class="linkbtn" data-act="waiver">volunteer waiver</button></label><span class="ferr" id="e-waiver"></span></div>
      <p class="formerr" id="g-err" role="alert"></p>
      <button class="btn" type="submit">Continue as guest</button>
      <p class="muted small">Your guest pass is saved in this browser. You can add an email later to keep your hours on other devices.</p>
    </form>` : ""}
    <p class="auth-account-link">Have an account? <a href="#login" data-act="authmode" data-v="login">Sign in</a></p>
  </div></main>${publicFooter()}</div>`;
}
function guestProfile(d, invite){
  return {name:d.name.trim(), email:"", phone:d.phone.trim(), role:"volunteer", skills:[], availability:[], zip:"", location:null,
    emergency:"", verified:false, reads:[], toured:Boolean(invite.event), waiverAt:new Date().toISOString(), guest:true, invite:invite.code};
}
function doGuestJoin(form){
  const d = Object.fromEntries(new FormData(form).entries()), invite = ui.invite;
  if (!invite?.code) return;
  const errs = {name:V.name(d.name || ""), phone:V.phone(d.phone || ""), waiver:d.waiver ? "" : "Please read and accept the volunteer waiver to continue."};
  if (!showErrors(form, errs)) return;
  const profile = guestProfile(d, invite), error = () => document.getElementById("g-err");
  if (Cloud.enabled){
    return runPending("auth", "Joining…", form.querySelector('[type="submit"]'), () => Cloud.guestStart(profile),
      null, err => { const el = error(); if (el) el.textContent = Cloud.friendly(err); });
  }
  const valid = invite.club ? Object.values(state.clubCodes).includes(invite.code) : (state.invites || []).some(i => i.code === invite.code && i.active);
  if (!valid){ error().textContent = Cloud.friendly({code:"guest/invite-invalid"}); return; }
  const u = DB.add("users", {id:DB.newId("users"), ...profile});
  state.session.userId = u.id; ui.view = "dashboard"; save(); render();
  toast(`Welcome, ${u.name.split(" ")[0]}! You're in as a guest.`);
  if (!profile.toured) maybeStartTour();
}

/* ----- After signing in: finish what the link asked for ----- */
function consumeInvite(){
  const invite = ui.invite, u = currentUser();
  if (!invite || !u || (DB.live && Cloud.loadPhase)) return;
  if (invite.club && invite.code){
    ui.invite = invite.event ? {event:invite.event} : null;    // open the event once the club's events arrive
    if (u.role === "volunteer") joinWithCode(invite.code);
    return;
  }
  if (!invite.event || ui.tour) return;                         // wait until the welcome tour ends
  ui.invite = null;
  openInvitedEvent(invite.event);
}
function openInvitedEvent(id){
  if (eventById(id)) return showEventPopup(id);
  toast("That event is no longer listed. Here are other open shifts.", "bad");
  handlers.nav(currentUser().role === "volunteer" ? "find" : "events");
}
function joinWithCode(code){
  const u = currentUser(), after = () => setTimeout(consumeInvite, 0);
  const record = clubId => ({id:`${clubId}_${u.id}`, clubId, userId:u.id, role:"member", name:u.name, email:u.email, joinedAt:TODAY, code});
  if (!DB.live){
    const hit = Object.entries(state.clubCodes).find(([, c]) => c === code), clubId = hit ? asId(hit[0]) : null, club = clubById(clubId);
    if (!club) return toast("That club link no longer works. Ask the club for its new link.", "bad");
    if (!membershipOf(clubId, u.id)){ DB.add("memberships", record(clubId)); save(); render(); toast(`Welcome to ${club.name}!`); }
    return after();
  }
  let club;
  runPending("join-club", "Joining club…", null, async () => {
    const id = await Cloud.findClubByCode(code);
    club = clubById(id);
    if (!club) throw new Error("Club unavailable");
    if (membershipOf(id, u.id)) return;
    const m = record(id);
    await DB.commit("memberships", [{id:m.id, record:m}]);
  }, () => { render(); toast(`You're a member of ${club.name}.`); after(); },
  () => toast("That club link no longer works. Ask the club for its new link.", "bad"));
}

/* ----- Guest accounts ----- */
function guestSaveCard(){
  const live = Cloud.enabled;
  return `<section class="card stack guest-save" style="max-width:720px" aria-labelledby="guest-save-title">
    <h2 id="guest-save-title">Keep your hours on any device</h2>
    <p class="muted">You're using a guest pass saved in this browser. If you clear your browser or switch devices, you can't get back in. Add an email and password to keep your shifts and hours. This is optional.</p>
    <form id="guestUpgradeForm" class="stack" novalidate>
      <div class="field"><label for="gu-email">Email</label><input id="gu-email" name="email" type="email" maxlength="254" autocomplete="email"><span class="ferr" id="e-email"></span></div>
      <div class="field"><label for="gu-pass">Password</label><input id="gu-pass" name="password" type="password" autocomplete="new-password" maxlength="128" aria-describedby="gu-pass-help"><span class="muted small" id="gu-pass-help">${live ? "Use 15 to 128 characters." : "Use 8 to 128 characters."}</span><span class="ferr" id="e-password"></span></div>
      <div class="field"><label for="gu-pass2">Confirm password</label><input id="gu-pass2" name="confirm" type="password" autocomplete="new-password" maxlength="128"><span class="ferr" id="e-confirm"></span></div>
      <div class="row"><button class="btn" type="submit">Save my hours</button></div>
    </form>
  </section>`;
}
function doGuestUpgrade(form){
  const d = Object.fromEntries(new FormData(form).entries()), u = currentUser(), live = Cloud.enabled;
  if (!u?.guest) return;
  const email = String(d.email || "").trim().toLowerCase();
  const errs = {email:V.email(email), password:V.password(d.password || "", live), confirm:d.password !== d.confirm ? "Passwords don't match." : ""};
  if (!errs.email && !live && state.users.some(x => x.email === email)) errs.email = "An account with this email already exists.";
  if (!showErrors(form, errs)) return;
  if (live){
    return runPending("guest-upgrade", "Saving your account…", form.querySelector('[type="submit"]'), () => Cloud.upgradeGuest(email, d.password),
      () => toast("Check your email for the verification link. Your hours move to your account once you verify."),
      err => showErrors(form, {email:Cloud.friendly(err)}));
  }
  const h = hashPassword(d.password);
  DB.update("users", u, {email, guest:false, passSalt:h.salt, passHash:h.hash});
  state.memberships.filter(m => m.userId === u.id).forEach(m => { m.email = email; });
  save(); render(); toast("Your hours are saved. Sign in with your email next time.");
}
function guestSignOutPrompt(){
  openModal(`<h2>Sign out of your guest pass?</h2>
    <p>Your guest pass only works in this browser. After you sign out, you can't get back to these shifts and hours unless you save them with an email first.</p>
    <div class="row"><button class="btn" data-act="nav" data-v="profile">Save my hours first</button><button class="btn danger" data-act="logout" data-v="confirm">Sign out anyway</button></div>`);
}
