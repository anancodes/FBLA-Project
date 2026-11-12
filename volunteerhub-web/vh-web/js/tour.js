/*
 * tour.js
 * First-login guided tour. Each step opens one screen and shows a small card that
 * explains it. The tour starts automatically the first time each person logs in,
 * and can be replayed from Help (and from Profile for volunteers).
 */
"use strict";

const TOURS = {
  volunteer: [
    {view:"dashboard", title:"Welcome to VolunteerHub", text:"Home keeps your next shifts and recommendations together, with a quick view of verified service hours."},
    {view:"find", title:"Opportunities", text:"Search for an event, place, or cause. Add an optional city or town on your profile to unlock nearby results. Click a title for full details."},
    {view:"shifts", title:"My schedule", text:"Your upcoming shifts, waitlists, and history. If you can't make it, cancel here so the next person in line gets your spot."},
    {view:"hours", title:"Hours & clubs", text:"See your last three attended events, expand your full service record, or use the More hour actions menu to download CSV. My clubs includes your requirements, outside-service logs, and officer tools when applicable."},
    {view:"news", title:"Inbox", text:"Announcements from coordinators and your clubs. The number in the menu shows what's new."},
    {view:"dashboard", title:"Your profile and display", text:"Open your profile from your name or initials. Display settings has text size, light or dark theme, and high contrast. Help lets you replay this tour."},
  ],
  coordinator: [
    {view:"dashboard", title:"Welcome to VolunteerHub", text:"The Overview lists everything that needs your attention in one place, followed by your program's key numbers."},
    {view:"events", title:"Events", text:"Create, copy, and edit shifts, and see sign-ups and waitlists. Switch to the calendar to see the month."},
    {view:"checkin", title:"Check-in", text:"On event day, mark each volunteer present or a no-show. Hours are credited automatically, and you can add walk-ins."},
    {view:"volunteers", title:"People & clubs", text:"Find volunteers and manage club members and hour approvals in one section. Site admins also get an Organizers tab to review new coordinators."},
    {view:"manage", title:"Clubs", text:"Create clubs like HOSA or NHS, share their join codes, set hour requirements, approve logged hours, and choose officers."},
    {view:"reports", title:"Reports", text:"Hours and attendance by volunteer, event, month, or cause. Filter, then download, copy, or print."},
    {view:"news", title:"Inbox", text:"Post announcements to everyone, or only to the people signed up for one event."},
    {view:"settings", title:"Settings", text:"Your organization's name, home ZIP code, and volunteer waiver. They show up across the whole site."},
  ],
};

function tourSteps(u){ return TOURS[u.role].filter(step => step.view !== "settings" || DB.isVerifiedCoordinator(u)); }
function focusTourStep(){ const title = document.getElementById("tour-title"); if (title) title.focus(); const nav = document.querySelector(".rail .tour-hl"); if (nav) nav.scrollIntoView({block:"nearest",inline:"nearest"}); }
function showTourStep(){ ui.view = tourSteps(currentUser())[ui.tour.i].view; render(); focusTourStep(); }
function startTour(){
  const u = currentUser(); if (!u) return;
  closeModal(false); ui.menu = false;
  ui.tour = {i:0,returnView:ui.view,returnFocusId:document.activeElement.id};
  showTourStep();
}
function tourStep(delta){
  if (!ui.tour) return;
  const i = ui.tour.i + delta;
  if (i >= tourSteps(currentUser()).length) return endTour();
  ui.tour.i = Math.max(0,i); showTourStep();
}
function endTour(){
  if (!ui.tour) return;
  const {returnView,returnFocusId} = ui.tour, u = currentUser();
  if (u && !u.toured) DB.update("users",u,{toured:true});
  ui.tour = null; ui.view = returnView; save(); render();
  const target = document.getElementById(returnFocusId) || $("#page-title") || $("#main"); if (target) target.focus();
}
function maybeStartTour(){ const u = currentUser(); if (u && !u.toured) startTour(); }
function tourCard(u){
  if (!ui.tour) return "";
  const steps = tourSteps(u), i = ui.tour.i, st = steps[i], last = i === steps.length-1;
  return `<section class="tour" aria-labelledby="tour-title"><h2 id="tour-title" tabindex="-1" aria-describedby="tour-text">${st.title}<span class="tour-step">Step ${i+1} of ${steps.length}</span></h2><p id="tour-text">${st.text}</p><div class="row"><button class="linkbtn small" data-act="tourEnd">Skip tour</button><span class="tour-spacer"></span>${i ? `<button class="btn secondary sm" id="tour-back" data-act="tourStep" data-v="-1">Back</button>` : ""}<button class="btn sm" id="tour-next" data-act="tourStep" data-v="1">${last ? "Finish" : "Next"}</button></div></section>`;
}
