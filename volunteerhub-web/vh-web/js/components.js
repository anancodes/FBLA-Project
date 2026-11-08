/*
 * components.js
 * Reusable UI building blocks shared by many screens: logo, date chips, stat tiles,
 * status pills, progress meters, bar/column charts, toasts, two-step confirm buttons,
 * the pop-up modal, CSV download/copy, printing, and the month calendar.
 */
"use strict";

const LOGO = `<svg class="logo" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="9" fill="var(--accent)"/><circle cx="13" cy="14" r="4.2" fill="var(--accent-ink)"/><circle cx="23" cy="14" r="4.2" fill="var(--accent-ink)" opacity=".7"/><path d="M7 27c1.2-4.6 4-7 6-7s4.8 2.4 6 7M17 27c1.2-4.6 4-7 6-7s4.8 2.4 6 7" stroke="var(--accent-ink)" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`;
function dateChip(d){ const x = parseDate(d); return `<div class="datechip" aria-hidden="true"><span>${x.toLocaleDateString("en-US",{month:"short"})}</span><strong>${x.getDate()}</strong><span>${x.toLocaleDateString("en-US",{weekday:"short"})}</span></div>`; }
function tile(label, val, sub = "", unit = ""){ return `<div class="card tile"><span class="lab">${label}</span><span class="val">${val}${unit ? `<small>${unit}</small>` : ""}</span>${sub ? `<span class="sub">${sub}</span>` : ""}</div>`; }
function statusPill(st){ const m = {attended:["good","Attended"], "no-show":["bad","No-show"], registered:["accent","Signed up"], waitlist:["mark","Waitlist"], cancelled:["","Cancelled"]}[st]; return `<span class="pill ${m[0]}">${m[1]}</span>`; }
// Determinate bars share one continuous red -> yellow -> green scale. The CSS
// endpoints become more saturated as progress increases and adapt to dark mode.
function progressPercent(value, max){
  return Number.isFinite(value) && Number.isFinite(max) && max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
}
function progressColor(pct){
  const p = progressPercent(pct, 100), low = p <= 50;
  const mix = low ? p * 2 : (p - 50) * 2;
  return `--progress-color:color-mix(in oklch, var(--progress-${low ? "low" : "mid"}) ${100 - mix}%, var(--progress-${low ? "mid" : "full"}) ${mix}%)`;
}
function progressMeter(value, max, label, role, valueText){
  const pct = progressPercent(value, max);
  return `<div class="meter" role="${role}" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-valuetext="${esc(valueText)}" style="${progressColor(pct)}"><span style="width:${pct}%"></span></div>`;
}
function fillMeter(e){
  const n = activeRegs(e.id).length;
  return progressMeter(n, e.slots, `Spots filled for ${e.title}`, "meter", `${n} of ${e.slots} spots filled`);
}
function hourGoalTile(hours){
  const pct = Math.floor(progressPercent(hours, HOUR_GOAL)), complete = hours >= HOUR_GOAL;
  const text = `${fmtH(hours)} of ${HOUR_GOAL} verified hours${complete ? "; goal complete" : ""}`;
  return `<div class="card tile"><span class="lab">Hour goal</span><span class="val">${pct}<small>%</small></span>${progressMeter(hours, HOUR_GOAL, "Service hour goal", "progressbar", text)}<span class="sub">${complete ? "Goal complete · " : ""}${fmtH(hours)} of ${HOUR_GOAL} hours</span></div>`;
}
function hbars(rows, unit = ""){
  if (!rows.length) return `<div class="empty">No data for these filters.</div>`;
  const max = Math.max(...rows.map(r => r.value)) || 1;
  return `<div class="hbars">${rows.map(r => `<div class="hb-row"><span class="hb-label" title="${esc(r.label)}">${esc(r.label)}</span><span class="hb-track"><span class="hb-bar" style="width:${(r.value/max*100).toFixed(1)}%"></span></span><span class="hb-val">${fmtH(r.value)}${unit}</span></div>`).join("")}</div>`;
}
function colChart(rows, unit = ""){
  const max = Math.max(...rows.map(r => r.value), 1);
  const n = rows.length;
  return `<div class="colchart" role="img" aria-label="${esc(rows.map(r => `${r.label}: ${fmtH(r.value)}${unit}`).join(", "))}">
    <div class="cc-plot" style="grid-template-columns:repeat(${n},1fr)">${rows.map(r => `<div class="cc-col"><span class="cc-val">${fmtH(r.value)}</span><span class="cc-bar" style="height:${(r.value / max * 82).toFixed(1)}%"></span></div>`).join("")}</div>
    <div class="cc-labels" style="grid-template-columns:repeat(${n},1fr)">${rows.map(r => `<span>${esc(r.label)}</span>`).join("")}</div></div>`;
}
function hoursByMonth(regs, n = 6){
  const keys = monthsBack(n), map = Object.fromEntries(keys.map(k => [k, 0]));
  regs.filter(r => r.status === "attended").forEach(r => { const k = monthKey(eventById(r.eventId).date); if (k in map) map[k] += r.hours; });
  return keys.map(k => ({label: monthLabel(k), value: map[k]}));
}
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
// Buttons can be recreated by render(), so locate the equivalent control when
// the original DOM node is gone. Match data attributes without building selectors.
function replacementControl(element, root){
  if (!element) return null;
  if (root.contains(element)) return element;
  if (element.id){ const found = document.getElementById(element.id); if (found && root.contains(found)) return found; }
  if (element.dataset.act) return [...root.querySelectorAll("[data-act]")].find(el => ["act", "v", "id"].every(k => el.dataset[k] === element.dataset[k])) || null;
  return null;
}
function modalControls(){
  return [...document.querySelectorAll('#modal button, #modal input, #modal select, #modal textarea, #modal a[href], #modal [tabindex]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
}
function openModal(html){
  if (!$("#modal").firstElementChild) modalOpener = document.activeElement;
  ui.modalEvent = null;
  $("#modal").innerHTML = `<div class="overlay" data-act="overlay"><div class="modal" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`;
  const dialog = $("#modal .modal"), title = dialog.querySelector("h1, h2, h3");
  if (title){ title.id = "modal-title"; dialog.setAttribute("aria-labelledby", title.id); }
  else dialog.setAttribute("aria-label", "VolunteerHub dialog");
  $("#app").inert = true;
  (modalControls()[0] || dialog).focus();
}
function closeModal(restoreFocus = true){
  if (!$("#modal").firstElementChild) return;
  const opener = modalOpener;
  $("#modal").innerHTML = ""; ui.modalEvent = null; modalOpener = null;
  $("#app").inert = false;
  // Save/form handlers may redraw the app after closing; restore after that work.
  if (restoreFocus) queueMicrotask(() => {
    const target = replacementControl(opener, $("#app")) || $("#main");
    if (target) target.focus();
  });
}
function trapModalTab(ev){
  const dialog = $("#modal .modal");
  if (!dialog) return;
  const controls = modalControls(), first = controls[0], last = controls[controls.length - 1];
  if (!first){ ev.preventDefault(); dialog.focus(); return; }
  if (!controls.includes(document.activeElement) || (ev.shiftKey ? document.activeElement === first : document.activeElement === last)){
    ev.preventDefault(); (ev.shiftKey ? last : first).focus();
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
  const icsText = s => String(s).replace(/\\/g, "\\\\").replace(/[,;]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const stamp = (d, t) => d.replace(/-/g, "") + "T" + t.replace(":", "") + "00";
  const v = venueOf(e);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VolunteerHub//EN", "BEGIN:VEVENT",
    `UID:volunteerhub-event-${e.id}`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART:${stamp(e.date, e.start)}`, `DTEND:${stamp(e.date, e.end)}`,
    `SUMMARY:${icsText("Volunteer: " + e.title)}`, `LOCATION:${icsText(v.address ? `${e.location}, ${v.address}` : e.location)}`,
    `DESCRIPTION:${icsText(`${e.desc} Bring: ${e.bring || "nothing special"}.`)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  if (downloadFile(`${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${e.date}.ics`, ics, "text/calendar")) toast("Calendar file downloaded. Open it to add the shift to your calendar.");
  else toast("Your browser blocked the download.", "bad");
}

// Practical details block used in both event pop-ups: where, what to bring, ages, contact.
function eventFacts(e){
  const v = venueOf(e), p = posterOf(e);
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
      ${fact("Address", esc(v.address))}
      ${fact("Area", esc(e.area || v.area))}
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
    ? `<div class="trust ok"><b>✓ Verified organizer</b><p>${esc(p.name)} is a verified coordinator for ${esc(p.org)} (verified ${fmtDate(p.verifiedAt, {month:"short", day:"numeric", year:"numeric"})}). Your hours from this event are recorded at check-in.</p><p class="small muted">Posted ${posted}${updated}</p></div>`
    : `<div class="trust warn"><b>⚠ This organizer isn't verified yet</b><p>${esc(p.name)}${p.org ? ` (${esc(p.org)})` : ""} hasn't been checked by VolunteerHub. Volunteer opportunities never ask you to pay, share bank details, or send ID numbers. Meet in public places, and tell a parent or guardian where you're going.</p><p class="small muted">Posted ${posted}${updated}</p></div>`;
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
function exportBar(printable = true){
  return `<div class="row no-print"><button class="btn secondary" data-act="csvDownload">Download CSV</button><button class="btn secondary" data-act="csv">Copy</button>${printable ? `<button class="btn secondary" data-act="print">Print</button>` : ""}</div>`;
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
  return `<button class="cal-chip ${cls}" data-act="calEvent" data-id="${e.id}" aria-label="${esc(name)}" title="${esc(name)}"><b>${fmtTime(e.start).replace(":00", "").replace(" ", "").toLowerCase()}</b> ${esc(e.title)}</button>`;
}
function listCalToggle(mode, key){
  return `<div class="tabs" role="tablist" aria-label="View as">
    <button role="tab" aria-selected="${mode === "list"}" data-act="viewMode" data-v="${key}:list">List</button>
    <button role="tab" aria-selected="${mode === "calendar"}" data-act="viewMode" data-v="${key}:calendar">Calendar</button></div>`;
}
