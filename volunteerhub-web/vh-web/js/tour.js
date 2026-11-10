/*
 * tour.js
 * First-login guided tour. Each step opens one screen and shows a small card that
 * explains it. The tour starts automatically the first time each person logs in,
 * and can be replayed from Help (and from Profile for volunteers).
 */
"use strict";

const TOURS = {
  volunteer: [
    {view:"dashboard", title:"Welcome to VolunteerHub", text:"Home shows what needs your attention, like shift reminders and updates, plus your hours and next shifts."},
    {view:"find", title:"Opportunities", text:"Enter your ZIP code to see shifts near you, nearest first. Filter by cause or skills, or switch to the calendar. Click any title for full details."},
    {view:"shifts", title:"My schedule", text:"Your upcoming shifts, waitlists, and history. If you can't make it, cancel here so the next person in line gets your spot."},
    {view:"hours", title:"Hours & clubs", text:"Every verified hour, with a printable certificate. The My clubs tab tracks each club's requirement and lets you log outside service for approval."},
    {view:"news", title:"Inbox", text:"Announcements from coordinators and your clubs. The number in the menu shows what's new."},
    {view:"dashboard", title:"Your account menu", text:"Click your name in the top right for your profile, text size, light or dark theme, high contrast, help, and to replay this tour."},
  ],
  coordinator: [
    {view:"dashboard", title:"Welcome to VolunteerHub", text:"The Overview lists everything that needs your attention in one place, followed by your program's key numbers."},
    {view:"events", title:"Events", text:"Create, copy, and edit shifts, and see sign-ups and waitlists. Switch to the calendar to see the month."},
    {view:"checkin", title:"Check-in", text:"On event day, mark each volunteer present or a no-show. Hours are credited automatically, and you can add walk-ins."},
    {view:"volunteers", title:"People", text:"Your volunteer directory with hours and reliability. Site admins verify new organizers in the Organizers tab."},
    {view:"manage", title:"Clubs", text:"Create clubs like HOSA or NHS, share their join codes, set hour requirements, approve logged hours, and choose officers."},
    {view:"reports", title:"Reports", text:"Hours and attendance by volunteer, event, month, or cause. Filter, then download, copy, or print."},
    {view:"news", title:"Inbox", text:"Post announcements to everyone, or only to the people signed up for one event."},
    {view:"settings", title:"Settings", text:"Your organization's name, home ZIP code, and volunteer waiver. They show up across the whole site."},
  ],
};

function startTour(){
  ui.tour = {i:0};
  ui.view = TOURS[currentUser().role][0].view;
  render();
  const next = document.getElementById("tour-next"); if (next) next.focus();
}
function tourStep(delta){
  const steps = TOURS[currentUser().role];
  const i = ui.tour.i + delta;
  if (i >= steps.length) return endTour();
  ui.tour.i = Math.max(0, i);
  ui.view = steps[ui.tour.i].view;
  render();
  window.scrollTo(0, 0);
}
function endTour(){
  const u = currentUser();
  if (!u.toured) DB.update("users", u, {toured:true});
  ui.tour = null;
  save(); render();
}
// Starts the tour if this person hasn't seen it yet.
function maybeStartTour(){
  const u = currentUser();
  if (u && !u.toured) startTour();
}

function tourCard(u){
  if (!ui.tour) return "";
  const steps = TOURS[u.role], i = ui.tour.i, st = steps[i], last = i === steps.length - 1;
  return `<div class="tour" role="dialog" aria-labelledby="tour-title" aria-describedby="tour-text">
    <span class="eyebrow">Tour · step ${i + 1} of ${steps.length}</span>
    <h3 id="tour-title">${st.title}</h3>
    <p id="tour-text">${st.text}</p>
    <div class="tour-dots" aria-hidden="true">${steps.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>
    <div class="row"><button class="linkbtn small" data-act="tourEnd">Skip tour</button><span style="flex:1"></span>
      ${i ? `<button class="btn secondary sm" id="tour-back" data-act="tourStep" data-v="-1">Back</button>` : ""}
      <button class="btn sm" id="tour-next" data-act="tourStep" data-v="1">${last ? "Finish" : "Next"}</button></div>
  </div>`;
}
