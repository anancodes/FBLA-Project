/*
 * views/settings.js
 * Organization settings for coordinators: the name, home ZIP code, short description, and
 * volunteer waiver. The name, ZIP, and description
 * entered here appear across the whole site: header, login page, event details,
 * addresses, certificates, and printed reports. This is what lets any nonprofit
 * use VolunteerHub as its own.
 */
"use strict";

function cSettings(u){
  const o = state.org, canEdit = DB.isVerifiedCoordinator(u);
  if (!canEdit) return `<div class="head"><div><h1>Settings</h1></div></div><div class="empty">Organization settings unlock once a site admin verifies your organizer account.</div>`;
  return `<div class="head"><div><h1>Settings</h1><p class="muted">Your organization's details. Changes show up everywhere on the site right away.</p></div></div>
  <form id="orgForm" class="card stack" novalidate style="max-width:720px">
    <h2>Organization</h2>
    <div class="field"><label for="org-name">Organization name</label><input id="org-name" name="name" maxlength="60" value="${esc(o.name)}" placeholder="e.g. Lakeside Food Bank"><span class="ferr" id="e-name"></span></div>
    <div class="field"><label for="org-zip">Home ZIP code</label><input id="org-zip" name="zip" inputmode="numeric" maxlength="5" value="${esc(o.zip)}" placeholder="e.g. 20001"><span class="muted small">Currently <b>${esc(orgPlace())}</b>. The sample places in this demo are spread out within about 10 miles of this ZIP.</span><span class="ferr" id="e-zip"></span></div>
    <div class="field"><label for="org-about">Short description <span class="muted">(optional)</span></label><textarea id="org-about" name="about" rows="2" maxlength="160" placeholder="One sentence about your mission, shown on the login page.">${esc(o.about)}</textarea><span class="ferr" id="e-about"></span></div>
    <div class="field"><label for="org-waiver">Volunteer waiver</label><textarea id="org-waiver" name="waiver" rows="7" maxlength="3000">${esc(o.waiver || DEFAULT_WAIVER)}</textarea><span class="muted small">New volunteers must accept this when they create an account. Have it reviewed by a lawyer before real use.</span><span class="ferr" id="e-waiver"></span></div>
    <div class="row"><button class="btn" type="submit">Save settings</button></div>
  </form>
  ${DB.live ? `<section class="card stack" style="max-width:720px"><h2>Getting started</h2><p class="muted">New organization? Add a few sample events to see how everything works. You can edit or delete them anytime.</p><div class="row"><button class="btn secondary" data-act="sampleEvents">Add 6 sample events</button></div></section>` : ""}
  <section class="card stack" style="max-width:720px">
    <h2>Where this appears</h2>
    <ul class="muted" style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px">
      <li>The header on every screen, and the login page</li>
      <li>"Posted by" and contact details on each event</li>
      <li>Event addresses, distances in ZIP code search, and calendar files</li>
      <li>Volunteer service certificates and their certificate numbers (currently <b>${esc(orgCode())}</b>)</li>
      <li>Printed reports</li>
    </ul>
  </section>`;
}
