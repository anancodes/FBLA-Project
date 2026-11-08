/*
 * tour.js
 * First-login guided tour. Each step opens one screen and shows a card above it that
 * explains it. The tour starts automatically the first time each person logs in,
 * and can be replayed from Help (and from Profile for volunteers).
 */
"use strict";

const TOURS = {
  volunteer: [
    {view:"dashboard", title:"Welcome to VolunteerHub", text:"Explore each screen below this guide. Home shows shift reminders, sign-up updates, and your hour goal. Progress bars move from red through yellow to green as they fill. This demo saves changes in this browser only."},
    {view:"find", title:"Find opportunities", text:"Browse upcoming shifts as a list or a calendar. Filter by cause, area of town, location, or your skills. Choose More info to see the address, what to bring, and who posted it. Look for the Verified organizer badge. If a shift is full, join the waitlist."},
    {view:"shifts", title:"My shifts", text:"See what you've signed up for and where you are on any waitlist. If you can't make it, cancel here so the next person in line gets your spot."},
    {view:"hours", title:"My hours", text:"Every hour a coordinator verifies is counted here. Print a service certificate for school or clubs, or download your hours as a spreadsheet."},
    {view:"news", title:"Announcements", text:"Messages from coordinators land here, like parking changes or new drives. The number on the menu shows how many are new."},
    {view:"profile", title:"Your profile", text:"Add your skills to get matching shifts on your home page. You can also list your availability for coordinators to see in the volunteer directory."},
    {view:"help", title:"Help is always here", text:"Find answers to common questions and accessibility settings. You can replay this tour anytime from Help or your Profile."},
  ],
  coordinator: [
    {view:"dashboard", title:"Welcome to VolunteerHub", text:"Explore each screen below this guide. The overview shows active volunteers, hours served, events that need people, and unfinished check-ins. This demo saves changes in this browser only."},
    {view:"events", title:"Events", text:"Create and edit shifts, and see sign-ups and waitlists at a glance. Staffing bars move from red when few spots are filled, through yellow at halfway, to green when full. Volunteers can join the waitlist when an event is full. Switch to Calendar to see the whole month."},
    {view:"checkin", title:"Check-in", text:"On event day, mark each volunteer present or a no-show. Hours are credited automatically. You can add walk-ins and print or download the roster."},
    {view:"volunteers", title:"Volunteers", text:"Your volunteer directory, with skills, hours, and reliability. Open any volunteer's service certificate from here."},
    {view:"reports", title:"Reports", text:"Total hours and attendance by volunteer, event, month, or cause. Filter by dates, cause, or one volunteer, then download, copy, or print."},
    {view:"news", title:"Announcements", text:"Post news to all volunteers, or only to the people signed up for one event."},
    {view:"help", title:"Help is always here", text:"Answers to common questions and accessibility settings. You can replay this tour from Help anytime."},
  ],
};

function focusTourStep(){
  const title = document.getElementById("tour-title");
  if (title) title.focus();
  const nav = document.querySelector(".rail .tour-hl");
  if (nav) nav.scrollIntoView({block:"nearest", inline:"nearest"});
}
function showTourStep(){
  ui.view = TOURS[currentUser().role][ui.tour.i].view;
  render();
  focusTourStep();
}
function startTour(){
  const u = currentUser();
  if (!u || !TOURS[u.role]) return;
  closeModal(false);
  ui.armed = null;
  ui.tour = {i:0, returnView:ui.view, returnFocusId:document.activeElement.id};
  showTourStep();
}
function tourStep(delta){
  if (!ui.tour) return;
  const steps = TOURS[currentUser().role];
  const i = ui.tour.i + delta;
  if (i >= steps.length) return endTour();
  ui.tour.i = Math.max(0, i);
  showTourStep();
}
function endTour(){
  if (!ui.tour) return;
  const {returnView, returnFocusId} = ui.tour;
  const u = currentUser();
  if (u) state.toured[u.id] = true;
  ui.tour = null;
  ui.view = returnView;
  save(); render();
  const target = document.getElementById(returnFocusId) || document.getElementById("main");
  if (target) target.focus();
}
// Starts the tour if this person hasn't seen it yet.
function maybeStartTour(){
  const u = currentUser();
  if (u && !state.toured[u.id]) startTour();
}

function tourCard(u){
  if (!ui.tour) return "";
  const steps = TOURS[u.role], i = ui.tour.i, st = steps[i], last = i === steps.length - 1;
  return `<section class="tour" aria-labelledby="tour-title" aria-describedby="tour-text">
    <h2 id="tour-title" tabindex="-1" aria-describedby="tour-text"><span class="tour-step">Tour · step ${i + 1} of ${steps.length}</span>${st.title}</h2>
    <p id="tour-text">${st.text}</p>
    <div class="tour-dots" aria-hidden="true">${steps.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>
    <div class="row"><button class="linkbtn small" data-act="tourEnd">Skip tour</button><span style="flex:1"></span>
      ${i ? `<button class="btn secondary sm" id="tour-back" data-act="tourStep" data-v="-1">Back</button>` : ""}
      <button class="btn sm" id="tour-next" data-act="tourStep" data-v="1">${last ? "Finish" : "Next"}</button></div>
  </section>`;
}
