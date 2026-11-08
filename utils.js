/*
 * utils.js
 * General helper functions: DOM shortcuts, HTML escaping, math, dates/times, and CSV formatting.
 * These have no knowledge of volunteers or events, so any part of the app can use them.
 */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sum = a => a.reduce((x, y) => x + y, 0);
const nid = arr => Math.max(0, ...arr.map(x => x.id)) + 1;
const fmtH = h => String(Math.round(h * 10) / 10);
const initials = n => n.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();

function iso(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
const TODAY = iso(new Date());
function addDays(n){ const d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
function parseDate(s){ const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function fmtDate(s, opts = {weekday:"short", month:"short", day:"numeric"}){ return parseDate(s).toLocaleDateString("en-US", opts); }
function fmtTime(t){ let [h,m] = t.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${String(m).padStart(2,"0")} ${ap}`; }
const timeRange = e => `${fmtTime(e.start)}–${fmtTime(e.end)}`;
function duration(e){ const [a,b] = e.start.split(":").map(Number), [c,d] = e.end.split(":").map(Number); return ((c*60+d) - (a*60+b)) / 60; }
const byDate = (a, b) => (a.date + a.start).localeCompare(b.date + b.start);
function monthKey(s){ return s.slice(0, 7); }
function monthLabel(k){ const [y,m] = k.split("-").map(Number); return new Date(y, m-1, 1).toLocaleDateString("en-US", {month:"short"}); }
function monthsBack(n){ const out = []; const d = new Date(); d.setDate(1); for (let i = n-1; i >= 0; i--){ const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(iso(x).slice(0,7)); } return out; }
function toCSV(rows){ return rows.map(r => r.map(c => { const s = String(c); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }).join(",")).join("\n"); }
