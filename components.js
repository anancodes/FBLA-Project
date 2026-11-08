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
function fillMeter(e){ const n = activeRegs(e.id).length, pct = Math.min(100, Math.round(n / e.slots * 100)); const cls = pct >= 100 ? "full" : (e.date >= TODAY && pct < 40 ? "low" : ""); return `<div class="meter ${cls}" role="img" aria-label="${n} of ${e.slots} spots filled"><span style="width:${pct}%"></span></div>`; }
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
function openModal(html){ ui.modalEvent = null; $("#modal").innerHTML = `<div class="overlay" data-act="overlay"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; const f = $("#modal input, #modal select, #modal textarea, #modal button"); if (f) f.focus(); }
function closeModal(){ $("#modal").innerHTML = ""; ui.modalEvent = null; }

function copyCSV(text){
  const fallback = () => openModal(`<div class="spread"><h2>Copy report data</h2><button class="btn secondary sm" data-act="close">Close</button></div><p class="muted">Select all of the text below, copy it, and paste it into Excel or Google Sheets.</p><textarea id="csvbox" rows="12" readonly>${esc(text)}</textarea>`);
  try { navigator.clipboard.writeText(text).then(() => toast("Copied as CSV. Paste into Excel or Google Sheets."), fallback); }
  catch(e){ fallback(); }
}

/* ----- Export and print ----- */
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
  return `<button class="cal-chip ${cls}" data-act="calEvent" data-id="${e.id}" title="${esc(`${e.title}, ${timeRange(e)}${label ? ` (${label})` : ""}`)}"><b>${fmtTime(e.start).replace(":00", "").replace(" ", "").toLowerCase()}</b> ${esc(e.title)}</button>`;
}
function listCalToggle(mode, key){
  return `<div class="tabs" role="tablist" aria-label="View as">
    <button role="tab" aria-selected="${mode === "list"}" data-act="viewMode" data-v="${key}:list">List</button>
    <button role="tab" aria-selected="${mode === "calendar"}" data-act="viewMode" data-v="${key}:calendar">Calendar</button></div>`;
}
