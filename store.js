/*
 * store.js
 * The app's data layer. Holds `state` (users, events, registrations, preferences),
 * saves/loads it with the browser's localStorage, keeps temporary screen state in `ui`,
 * and provides query helpers such as spotsLeft() and userStats().
 */
"use strict";

function load(){ try { const raw = localStorage.getItem(KEY); if (raw){ const d = JSON.parse(raw); if (d && d.v === 1) return d; } } catch(e){} return null; }
function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} }
let state = load() || seed();
const ui = {
  view:"dashboard", authMode:"login", armed:null, csv:null,
  find:{q:"", cat:"all", match:false, hideFull:false},
  ev:{tab:"upcoming", q:""}, ciEvent:null, vq:"",
  rep:{from:addDays(-90), to:TODAY, cat:"all", group:"volunteer"},
};

const currentUser = () => state.users.find(u => u.id === state.session.userId) || null;
const userById = id => state.users.find(u => u.id === id);
const eventById = id => state.events.find(e => e.id === id);
const activeRegs = eid => state.regs.filter(r => r.eventId === eid && r.status !== "cancelled");
const spotsLeft = e => e.slots - activeRegs(e.id).length;
function userStats(uid){
  const rs = state.regs.filter(r => r.userId === uid);
  const att = rs.filter(r => r.status === "attended");
  return {
    hours: sum(att.map(r => r.hours)), attended: att.length,
    noShows: rs.filter(r => r.status === "no-show").length,
    upcoming: rs.filter(r => r.status === "registered" && eventById(r.eventId).date >= TODAY),
  };
}
