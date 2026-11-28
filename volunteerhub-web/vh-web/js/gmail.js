"use strict";

// The browser only asks for consent and reads connection health. The sending
// credential and the scheduled job live in Firebase, outside the Pages site.
const GmailAlerts = {
  owner:null, phase:"idle", info:null, note:"",

  async request(action){
    const user = Cloud.auth?.currentUser;
    if (!DB.live || !currentUser()?.admin || !user) throw new Error("Sign in as a site admin.");
    const url = "https://us-central1-" + window.FIREBASE_CONFIG.projectId + ".cloudfunctions.net/gmailConnector/" + action;
    const token = await user.getIdToken();
    const response = await fetch(url, {method:"POST", signal:AbortSignal.timeout(15000),
      headers:{Authorization:"Bearer " + token}});
    if (!response.ok) throw new Error(response.status === 403 ? "Site admin access is required." : "The Gmail service is unavailable.");
    return response.json();
  },

  observe(user){
    if (!DB.live || !user?.admin){ this.owner = null; this.phase = "idle"; this.info = null; this.note = ""; return; }
    if (ui.view !== "settings"){ this.owner = null; return; }
    const url = new URL(location.href), result = url.searchParams.get("gmail");
    if (result){
      url.searchParams.delete("gmail"); history.replaceState(history.state, "", url);
      if (result === "cancelled") toast("Google consent was cancelled.");
      if (result === "failed") toast("Google couldn’t finish connecting. Start Connect Gmail again.", "bad");
    }
    if (this.owner !== user.id){
      this.owner = user.id; this.phase = "idle"; this.info = null; this.note = "";
    }
    if (this.phase === "idle") this.act("status");
  },

  async act(action){
    const owner = this.owner;
    if (!owner || !DB.live || this.phase === "busy") return;
    this.phase = "busy"; this.note = "";
    // Defer the initial redraw when called from render() and keep auth changes isolated.
    queueMicrotask(() => { if (this.owner === owner && ui.view === "settings") render(); });
    try {
      const result = await this.request(action);
      if (this.owner !== owner || currentUser()?.id !== owner || !DB.live) return;
      if (action === "connect"){
        const target = new URL(result.url);
        if (target.origin !== "https://accounts.google.com") throw new Error("Could not start Google consent.");
        location.assign(target.href);
        return;
      }
      this.info = result;
      this.phase = "ready";
    } catch (error){
      if (this.owner !== owner) return;
      this.phase = "error";
      this.note = (error.message === "Site admin access is required." ? error.message : "Couldn’t reach the Gmail service. Check your connection and that the Firebase functions are deployed.");
    }
    if (ui.view === "settings") render();
  },

  panel(){
    const demo = !DB.live, busy = !demo && ["idle","busy"].includes(this.phase), failed = !demo && this.phase === "error";
    const connected = !demo && this.info?.connected;
    const status = demo ? "Demo preview" : busy ? "Checking…" : failed ? "Unavailable" : connected ? "Connected" : "Disconnected";
    const last = this.info?.last;
    const stamp = last?.at ? new Date(last.at).toLocaleString(undefined, {dateStyle:"medium",timeStyle:"short"}) : "";
    let action = "";
    if (demo) action = '<button class="btn secondary" data-act="nav" data-v="manage">Preview club alerts</button>';
    else if (failed) action = '<button class="btn secondary" data-act="gmailStatus">Retry connection</button>';
    else if (connected) action = (last?.error ? '<button class="btn" data-act="gmailConnect">Reconnect Gmail</button> ' : "") + '<button class="btn secondary" data-act="gmailDisconnectPrompt">Disconnect Gmail</button>';
    else action = '<button class="btn" data-act="gmailConnect"' + (busy ? " disabled" : "") + '>Connect Gmail</button>';
    return `<section class="mail-panel" aria-labelledby="gmail-heading">
      <div class="mail-heading"><span class="mail-symbol">${icon("mail")}</span><div><h2 id="gmail-heading">Gmail hour alerts</h2><span class="mail-status">${esc(status)}</span></div></div>
      <div class="mail-copy"><p>Every day at 9 a.m. Central, VolunteerHub checks clubs with alerts enabled. When a member falls behind, one email goes to the volunteer with a private copy to their club adviser.</p>
      ${demo ? '<p class="muted small">Sample accounts can preview the message. Email delivery is off in the demo.</p>' : ""}
      ${connected ? `<p><b>Sending account</b> ${esc(this.info.sender)}</p>` : ""}
      ${stamp ? `<p class="small"><b>Last check</b> ${esc(stamp)} · ${last.error ? esc(last.error) : `${last.checked} checked · ${last.sent} sent · ${last.review} need delivery review · ${last.missingRecipient} missing a verified recipient · ${last.failed} failed`}</p>` : ""}
      ${failed ? `<p role="status" class="formerr">${esc(this.note)}</p>` : ""}</div><div class="row">${action}${!demo && !failed && !busy ? '<button class="linkbtn" data-act="gmailStatus">Refresh status</button>' : ""}</div></section>`;
  }
};

function clubAlertPanel(club, rows){
  if (!club.req) return "";
  const states = rows.map(({m,h}) => ({m, h, pace:HourPace.progress(club.req, h.total)}));
  const behind = states.filter(item => item.pace.behind).sort((a,b) => b.pace.gap - a.pace.gap);
  const example = behind[0];
  const limit = club.req.alertGap ?? HourPace.defaultGap(club.req.hours);
  return `<section class="club-alert-panel"><div class="spread"><h3>${icon("mail")} Hour alerts</h3><span class="pill ${club.req.emailAlerts ? "good" : ""}">${club.req.emailAlerts ? "Enabled for club" : "Off for club"}</span></div>
    <p><strong>${behind.length} ${behind.length === 1 ? "member is" : "members are"} behind pace.</strong> The threshold is ${fmtH(limit)} hours below expected progress.</p>
    <p class="small muted">Counts attended club shifts and approved outside hours. The volunteer and club adviser receive one check-in per period behind pace.${!DB.live ? " Demo previews stay in this browser." : " Delivery requires a connected Gmail account in Settings."}</p>
    ${example ? `<div><button class="btn secondary sm" data-act="pacePreview" data-id="${esc(club.id)}" data-v="${esc(example.m.userId)}">Preview alert for ${esc(example.m.name)}</button></div>` : ""}</section>`;
}

function previewHourAlert(clubId, userId){
  const club = clubById(asId(clubId));
  if (!club?.req || !isClubManager(club.id)) return;
  const member = membershipOf(club.id, asId(userId)), adviser = membershipOf(club.id, club.createdBy);
  if (!member) return;
  const earned = clubHours(club.id, member.userId).total, pace = HourPace.progress(club.req, earned);
  if (!pace.behind) return toast("This member is on pace.");
  const link = new URL(location.href); link.hash = ""; link.search = "";
  const message = HourPace.message(club, member.name, earned, pace, link.protocol === "file:" ? "" : link.href);
  openModal(`<div class="spread"><h2>Hour alert preview</h2><button class="btn secondary sm" data-act="close">Close</button></div>
    <p class="muted small">Preview only. Opening this message sends no email.</p>
    <dl class="mail-addresses"><dt>Volunteer</dt><dd>${esc(member.email)}</dd><dt>Adviser · Bcc</dt><dd>${esc(adviser?.email || "No adviser assigned")}</dd><dt>Subject</dt><dd>${esc(message.subject)}</dd></dl>
    <div class="mail-body">${message.body.split("\n\n").map(line => "<p>" + esc(line) + "</p>").join("")}</div>`);
}
