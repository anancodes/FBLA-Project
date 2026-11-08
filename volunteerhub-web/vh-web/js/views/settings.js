/*
 * views/settings.js
 * Organization settings for coordinators. The name, town, and short description
 * entered here appear across the whole site: header, login page, event details,
 * addresses, certificates, and printed reports. This is what lets any nonprofit
 * use VolunteerHub as its own.
 */
"use strict";

function cSettings(){
  const o = state.org;
  return `<div class="head"><div><h1>Settings</h1><p class="muted">Your organization's details. Changes show up everywhere on the site right away.</p></div></div>
  <form id="orgForm" class="card stack" novalidate style="max-width:720px">
    <h2>Organization</h2>
    <div class="field"><label for="org-name">Organization name</label><input id="org-name" name="name" maxlength="60" value="${esc(o.name)}" placeholder="e.g. Lakeside Food Bank"><span class="ferr" id="e-name"></span></div>
    <div class="field"><label for="org-city">City or town</label><input id="org-city" name="city" maxlength="40" value="${esc(o.city)}" placeholder="e.g. Springfield"><span class="muted small">Added to the end of every event address.</span><span class="ferr" id="e-city"></span></div>
    <div class="field"><label for="org-about">Short description <span class="muted">(optional)</span></label><textarea id="org-about" name="about" rows="2" maxlength="160" placeholder="One sentence about your mission, shown on the login page.">${esc(o.about)}</textarea><span class="ferr" id="e-about"></span></div>
    <div class="row"><button class="btn" type="submit">Save settings</button></div>
  </form>
  <section class="card stack" style="max-width:720px">
    <h2>Where this appears</h2>
    <ul class="muted" style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px">
      <li>The header on every screen, and the login page</li>
      <li>"Posted by" and contact details on each event</li>
      <li>Event addresses and calendar files</li>
      <li>Volunteer service certificates and their certificate numbers (currently <b>${esc(orgCode())}</b>)</li>
      <li>Printed reports</li>
    </ul>
  </section>`;
}
