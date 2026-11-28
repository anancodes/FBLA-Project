/*
 * components.js
 * Reusable UI building blocks shared by many screens: logo, date chips, status pills,
 * progress meters, toasts, two-step confirm buttons,
 * the pop-up modal, CSV download/copy, printing, and the month calendar.
 */
"use strict";

// Four leaves identify VolunteerHub on the public site, in the workspace and on certificates.
const LOGO = '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';

// Line icons (24×24, drawn with strokes so they take the text color). icon("clock") returns an inline SVG.
const ICONS = {
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.7c2 .7 3.2 2.5 3.5 5.3"/>',
  layers:'<path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/>',
  megaphone:'<path d="M3 10v4h3l8 5V5l-8 5z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.9-.9 1.6v.4M12 17h.01"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart:'<path d="M4 20h16M7 16v-5M12 16V6M17 16v-3"/>',
  sliders:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  shield:'<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert:'<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  inbox:'<path d="M3 13h5l1.5 2.5h5L16 13h5"/><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  chevron:'<path d="m7 10 5 5 5-5"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  logout:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  hourglass:'<path d="M7 3h10M7 21h10M8 3v3a4 4 0 0 0 8 0V3M8 21v-3a4 4 0 0 1 8 0v3"/>',
};
const icon = (name, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
function dateChip(d){ const x = parseDate(d); return `<div class="datechip" aria-hidden="true"><span>${x.toLocaleDateString("en-US",{month:"short"})}</span><strong>${x.getDate()}</strong><span>${x.toLocaleDateString("en-US",{weekday:"short"})}</span></div>`; }
function statusPill(st){ const m = {attended:["good","Attended"], "no-show":["bad","No-show"], registered:["accent","Signed up"], waitlist:["mark","Waitlist"], cancelled:["","Cancelled"]}[st]; return `<span class="pill ${m[0]}">${m[1]}</span>`; }
function progressPercent(value, max){ return Number.isFinite(value) && Number.isFinite(max) && max > 0 ? Math.max(0,Math.min(100,value / max * 100)) : 0; }
function progressMeter(value, max, label, role = "meter", text = ""){
  const pct = progressPercent(value,max), low = pct <= 50, mix = low ? pct * 2 : (pct - 50) * 2;
  const color = `color-mix(in oklch, var(--progress-${low ? "low" : "mid"}) ${100-mix}%, var(--progress-${low ? "mid" : "full"}) ${mix}%)`;
  return `<div class="meter" role="${role}" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-valuetext="${esc(text || `${fmtH(value)} of ${max}`)}" style="--progress-color:${color}"><span style="width:${pct}%"></span></div>`;
}
function fillMeter(e){ return progressMeter(activeRegs(e.id).length,e.slots,`Spots filled for ${e.title}`); }
function toast(msg, kind = ""){
  const t = document.createElement("div"); t.className = `toast ${kind}`; t.textContent = msg;
  const box = $("#toast"); box.appendChild(t);
  while (box.children.length > 2) box.firstChild.remove();   // show at most 2 messages at once
  setTimeout(() => t.remove(), 3600);
}
function armBtn(key, label, armedLabel, cls = "danger sm"){
  const on = ui.armed === key;
  return `<button class="btn ${cls}${on ? " armed" : ""}" data-act="${on ? "confirm" : "arm"}" data-v="${esc(key)}">${on ? armedLabel : label}</button>`;
}

/* ---------- Modal ---------- */
let modalOpener = null;
function replacementControl(element, root){
  if (!element) return null;
  if (root.contains(element)) return element;
  if (element.id){ const found = document.getElementById(element.id); if (found && root.contains(found)) return found; }
  if (!element.dataset.act) return null;
  return [...root.querySelectorAll("[data-act]")].find(el => {
    if (["arm","confirm"].includes(element.dataset.act)) return ["arm","confirm"].includes(el.dataset.act) && el.dataset.v === element.dataset.v;
    return ["act","v","id"].every(k => el.dataset[k] === element.dataset[k]);
  }) || null;
}
function modalControls(){
  return [...document.querySelectorAll('#modal button, #modal input, #modal select, #modal textarea, #modal a[href], #modal summary, #modal [tabindex]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
}
function openModal(html, {dismissOnBackdrop = true} = {}){
  if (!$("#modal").firstElementChild) modalOpener = document.activeElement;
  ui.modalEvent = null;
  $("#modal").innerHTML = `<div class="overlay" ${dismissOnBackdrop ? 'data-act="overlay"' : ''}><div class="modal" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`;
  const dialog = $("#modal .modal"), title = dialog.querySelector("h2");
  if (title){ title.id = "modal-title"; dialog.setAttribute("aria-labelledby",title.id); }
  else dialog.setAttribute("aria-label","VolunteerHub dialog");
  $("#app").inert = true;
  syncPendingControls();
  (modalControls()[0] || dialog).focus();
}
function closeModal(restore = true){
  if (!$("#modal").firstElementChild) return;
  const opener = modalOpener;
  $("#modal").innerHTML = ""; ui.modalEvent = null; modalOpener = null; $("#app").inert = false;
  if (restore) queueMicrotask(() => { const target = replacementControl(opener,$("#app")) || $("#page-title") || $("#main"); if (target) target.focus(); });
}
function trapModalTab(ev){
  const dialog = $("#modal .modal"); if (!dialog) return;
  const controls = modalControls(), first = controls[0], last = controls[controls.length-1];
  if (!first){ ev.preventDefault(); dialog.focus(); return; }
  if (!controls.includes(document.activeElement) || (ev.shiftKey ? document.activeElement === first : document.activeElement === last)){
    ev.preventDefault(); (ev.shiftKey ? last : first).focus();
  }
}

let confirmation = null;
function openConfirmation({title, event, detail, label, key, compact = false, opener = document.activeElement}, accept){
  const dialog = $("#action-confirmation");
  if (dialog.open) return;
  confirmation = {accept, opener, pageOpener:opener?.closest("#modal") ? modalOpener : opener, userId:state.session.userId, view:ui.view};
  dialog.classList.toggle("confirm-compact", compact);
  dialog.innerHTML = `<h2 id="confirmation-title">${esc(title)}</h2>
    <div id="confirmation-event" class="confirmation-event">
      <strong>${esc(event.title)}</strong>
      <p><time datetime="${esc(event.date)}">${fmtDate(event.date, {weekday:"long", month:"long", day:"numeric", year:"numeric"})}</time><span>${timeRange(event)}</span></p>
      ${compact ? "" : `<p>${esc(event.location)}</p>`}
    </div>
    <p id="confirmation-effect">${esc(detail)}</p>
    <p id="confirmation-status" class="sr-only" role="status"></p>
    <p id="confirmation-error" class="formerr" role="alert"></p>
    <div class="confirmation-actions">
      <button class="btn secondary" type="button" data-act="dismissConfirmation" data-operation="${esc(key)}" autofocus>Go back</button>
      <button class="btn${compact ? " danger" : ""}" type="button" id="confirm-action" data-act="acceptConfirmation" data-operation="${esc(key)}">${esc(label)}</button>
    </div>`;
  dialog.showModal();
}

function closeConfirmation(restore = true){
  if (!confirmation) return;
  const {opener, pageOpener} = confirmation;
  confirmation = null;
  const dialog = $("#action-confirmation");
  dialog.close();
  dialog.replaceChildren();
  if (restore) queueMicrotask(() => {
    const modal = $("#modal .modal");
    const target = modal ? replacementControl(opener,modal) || modalControls()[0] || modal
      : replacementControl(pageOpener,$("#app")) || (pageOpener?.closest("#open-shifts") && $("#search-results")) || $("#page-title");
    target?.focus();
  });
}

function dismissConfirmation(){
  if (!actionBlocked($("#confirm-action"))) closeConfirmation();
}

function confirmationError(trigger, message){
  if (trigger?.id === "confirm-action"){
    if (trigger.isConnected) $("#confirmation-error").textContent = message;
  } else toast(message, "bad");
  return false;
}

async function acceptConfirmation(trigger){
  const intent = confirmation;
  if (!intent) return;
  $("#confirmation-error").textContent = "";
  try {
    const result = await intent.accept(trigger);
    if (result !== false && confirmation === intent) closeConfirmation();
  } catch(error){
    confirmationError(trigger, `Couldn't complete that change. ${Cloud.friendly(error)}`);
  }
}

function copyCSV(text){
  const fallback = () => openModal(`<div class="spread"><h2>Copy report data</h2><button class="btn secondary sm" data-act="close">Close</button></div><p class="muted">Select all of the text below, copy it, and paste it into Excel or Google Sheets.</p><textarea id="csvbox" rows="12" readonly>${esc(text)}</textarea>`);
  try { navigator.clipboard.writeText(text).then(() => toast("Copied as CSV. Paste into Excel or Google Sheets."), fallback); }
  catch(e){ fallback(); }
}

/* ----- Export and print ----- */
// Saves text as a file. Returns false if the browser blocked it.
function downloadFile(name, text, type){
  try {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch(e){ return false; }
}
// Saves an event as a calendar file (.ics) that Google Calendar, Outlook, and Apple Calendar can open.
function downloadICS(e){
  const icsText = s => String(s).replace(/\\/g, "\\\\").replace(/[,;]/g, m => "\\" + m).replace(/\r\n?|\n/g, "\\n");
  const stamp = (d, t) => d.replace(/-/g, "") + "T" + t.replace(":", "") + "00";
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VolunteerHub//EN", "BEGIN:VEVENT",
    `UID:volunteerhub-event-${icsText(e.id)}`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART:${stamp(e.date, e.start)}`, `DTEND:${stamp(e.date, e.end)}`,
    `SUMMARY:${icsText("Volunteer: " + e.title)}`, `LOCATION:${icsText(eventHasLocation(e) ? `${e.location}, ${addressOf(e)}` : e.location)}`,
    `DESCRIPTION:${icsText(`${e.desc} Bring: ${e.bring || "nothing special"}.`)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  if (downloadFile(`${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${e.date}.ics`, ics, "text/calendar")) toast("Calendar file downloaded. Open it to add the shift to your calendar.");
  else toast("Your browser blocked the download.", "bad");
}

// Practical details block used in both event pop-ups: where, what to bring, ages, contact.
function eventFacts(e){
  const v = venueOf(e), p = posterOf(e), origin = searchOrigin(), located = eventHasLocation(e);
  const fact = (label, value) => value ? `<div class="fact"><span class="lbl">${label}</span><span>${value}</span></div>` : "";
  return `<div class="facts">
    <div class="stack">
      <h3>What to know</h3>
      ${fact("What to bring", esc(e.bring))}
      ${fact("What to wear", esc(e.wear))}
      ${fact("Ages", e.minAge ? `${e.minAge} and older${e.minAge < 18 ? ". Under 18 needs a parent or guardian signature at check-in." : "."}` : "All ages")}
      ${fact("Helpful skills", esc(e.skills.join(", ")) || "None needed")}
      ${fact("Length", `${fmtH(duration(e))} hours`)}
    </div>
    <div class="stack">
      <h3>Where</h3>
      ${fact("Place", esc(e.location))}
      ${located ? fact("Address", esc(addressOf(e))) : ""}
      ${origin && located ? fact("Distance", `${fmtMiles(milesTo(e, origin))} from ${esc(placeName(origin))}`) : ""}
      ${fact("Parking", esc(v.parking))}
      ${fact("Accessibility", esc(v.access))}
      ${fact("Contact", `${esc(p.name)}${p.org ? `, ${esc(p.org)}` : ""}<br><span class="muted">${esc(p.phone || "")}${p.phone && p.email ? " · " : ""}${esc(p.email || "")}</span>`)}
    </div></div>`;
}

// "Can I trust this?" box: who posted it, whether they're verified, and safety reminders.
function trustBox(e){
  const p = posterOf(e), posted = fmtDate(e.postedAt, {month:"short", day:"numeric", year:"numeric"});
  const updated = e.updatedAt && e.updatedAt !== e.postedAt ? ` · Updated ${fmtDate(e.updatedAt, {month:"short", day:"numeric"})}` : "";
  return p.verified
    ? `<div class="trust ok"><b>${icon("shield")}Verified organizer</b><p>${esc(p.name)} is a verified coordinator for ${esc(p.org)} (verified ${fmtDate(p.verifiedAt, {month:"short", day:"numeric", year:"numeric"})}). Your hours from this event are recorded at check-in.</p><p class="small muted">Posted ${posted}${updated}</p></div>`
    : `<div class="trust warn"><b>${icon("alert")}This organizer isn't verified yet</b><p>${esc(p.name)}${p.org ? ` (${esc(p.org)})` : ""} hasn't been checked by VolunteerHub. Volunteer opportunities never ask you to pay, share bank details, or send ID numbers. Meet in public places, and tell a parent or guardian where you're going.</p><p class="small muted">Posted ${posted}${updated}</p></div>`;
}

// Saves text as a .csv file. Falls back to copy-and-paste if the browser blocks downloads.
function downloadCSV(name, text){
  try {
    const url = URL.createObjectURL(new Blob([text], {type:"text/csv"}));
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast(`Downloaded ${name}.`);
  } catch(e){ copyCSV(text); }
}
// mode "page" prints the current screen; mode "modal" prints only the open pop-up (certificates).
function printView(mode){
  const cls = "print-" + mode, done = () => document.body.classList.remove(cls);
  document.body.classList.add(cls);
  window.addEventListener("afterprint", done, {once:true});
  try { window.print(); } catch(e){ done(); }
}
// Download / Copy / Print buttons. Screens set ui.csv = {name, build} to supply the data.
function exportBar(copyEmailsFor){
  return `<div class="row no-print"><button class="btn" data-act="csvDownload">${icon("download")}Download CSV</button>
    <details class="disclosure other-exports" id="record-exports"><summary>Other export options</summary>
      <div class="row">${copyEmailsFor ? `<button class="btn secondary sm" data-act="copyEmails" data-id="${esc(copyEmailsFor)}">Copy emails</button>` : ""}
        <button class="btn secondary sm" data-act="csv">Copy data</button><button class="btn secondary sm" data-act="print">Print</button></div>
    </details></div>`;
}

/* ----- Month calendar ----- */
// events: the events to show. chipFor(e): returns the HTML for one event inside a day.
function calendarView(events, chipFor, legend = ""){
  const [y, m] = ui.cal.split("-").map(Number);
  const first = new Date(y, m - 1, 1), lead = first.getDay(), days = new Date(y, m, 0).getDate();
  const perDay = {};
  events.forEach(e => (perDay[e.date] = perDay[e.date] || []).push(e));
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(`<div class="cal-cell blank" aria-hidden="true"></div>`);
  for (let d = 1; d <= days; d++){
    const key = `${ui.cal}-${String(d).padStart(2, "0")}`, evs = (perDay[key] || []).sort(byDate);
    cells.push(`<div class="cal-cell${key === TODAY ? " today" : ""}${key < TODAY ? " past" : ""}"><span class="cal-day">${d}</span>${evs.map(chipFor).join("")}</div>`);
  }
  const label = first.toLocaleDateString("en-US", {month:"long", year:"numeric"});
  return `<section class="card cal stack">
    <div class="spread"><h2>${label}</h2><div class="row">
      <button class="btn secondary sm" data-act="calMonth" data-v="-1" aria-label="Previous month">&lsaquo; Prev</button>
      <button class="btn secondary sm" data-act="calMonth" data-v="0">This month</button>
      <button class="btn secondary sm" data-act="calMonth" data-v="1" aria-label="Next month">Next &rsaquo;</button></div></div>
    <div class="cal-grid">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div class="cal-dow">${d}</div>`).join("")}${cells.join("")}</div>
    ${legend}</section>`;
}
function calChip(e, cls, label = ""){
  const name = `${e.title}, ${fmtDate(e.date)}, ${timeRange(e)}${label ? ` (${label})` : ""}`;
  return `<button class="cal-chip ${cls}" data-act="calEvent" data-id="${esc(e.id)}" aria-label="${esc(name)}" title="${esc(name)}"><b>${fmtTime(e.start).replace(":00", "").replace(" ", "").toLowerCase()}</b> ${esc(e.title)}</button>`;
}
function listCalToggle(mode, key){
  return `<div class="tabs" role="group" aria-label="View as">
    <button type="button" aria-pressed="${mode === "list"}" data-act="viewMode" data-v="${key}:list">List</button>
    <button type="button" aria-pressed="${mode === "calendar"}" data-act="viewMode" data-v="${key}:calendar">Calendar</button></div>`;
}

/* ----- "Needs attention" list ----- */
// One list for everything that needs action, instead of a stack of separate banners.
// items: [{icon, tone, title, detail, action}]; tone colors the icon (accent, good, mark, bad).
function attentionList(items, heading = "Needs attention"){
  if (!items.length) return "";
  return `<section class="card attention"><h2>${heading}</h2>
    ${items.map(it => `<div class="att-row"><span class="att-icon ${it.tone || "accent"}">${icon(it.icon)}</span>
      <div class="att-text"><b>${esc(it.title)}</b>${it.detail ? `<span>${it.detail}</span>` : ""}</div>
      <div class="att-action">${it.action || ""}</div></div>`).join("")}
  </section>`;
}
