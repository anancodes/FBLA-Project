/*
 * tour.js
 * First-login guided tour. Each step opens one screen and shows a small card that
 * explains it. The tour starts automatically the first time each person logs in,
 * and can be replayed from Help (and from Profile for volunteers).
 */
"use strict";

const TOURS = {
  volunteer: [
    {view:"dashboard", title:"Welcome to VolunteerHub", text:"This is your home page. Shift reminders, updates about your sign-ups, and progress toward your hour goal show up here."},
    {view:"find", title:"Find opportunities", text:"Browse upcoming shifts as a list or a calendar. Filter by cause, area of town, location, or your skills. Choose More info to see the address, what to bring, and who posted it. Look for the Verified organizer badge. If a shift is full, join the waitlist."},
    {view:"shifts", title:"My shifts", text:"See what you've signed up for and where you are on any waitlist. If you can't make it, cancel here so the next person in line gets your spot."},
    {view:"hours", title:"My hours", text:"Every hour a coordinator verifies is counted here. Print a service certificate for school or clubs, or download your hours as a spreadsheet."},
    {view:"news", title:"Announcements", text:"Messages from coordinators land here, like parking changes or new drives. The number on the menu shows how many are new."},
    {view:"profile", title:"Your profile", text:"Add your skills and when you're available. We use them to recommend shifts on your home page."},
    {view:"help", title:"Help is always here", text:"Find answers to common questions and accessibility settings. You can replay this tour anytime from Help or your Profile."},
  ],
  coordinator: [
    {view:"dashboard", title:"Welcome to VolunteerHub", text:"The overview shows how your program is doing: active volunteers, hours served, events that need people, and check-ins you still need to finish."},
    {view:"events", title:"Events", text:"Create and edit shifts, and see sign-ups and waitlists at a glance. Switch to Calendar to see the whole month."},
    {view:"checkin", title:"Check-in", text:"On event day, mark each volunteer present or a no-show. Hours are credited automatically. You can add walk-ins and print or download the roster."},
    {view:"volunteers", title:"Volunteers", text:"Your volunteer directory, with skills, hours, and reliability. Open any volunteer's service certificate from here."},
    {view:"reports", title:"Reports", text:"Total hours and attendance by volunteer, event, month, or cause. Filter by dates, cause, or one volunteer, then download, copy, or print."},
    {view:"news", title:"Announcements", text:"Post news to all volunteers, or only to the people signed up for one event."},
    {view:"settings", title:"Make it yours", text:"Enter your organization's name and town here. They show up across the whole site, from the header to certificates and reports."},
    {view:"help", title:"Help is always here", text:"Answers to common questions and accessibility settings. You can replay this tour from Help anytime."},
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
  state.toured[u.id] = true;
  ui.tour = null;
  save(); render();
}
// Starts the tour if this person hasn't seen it yet.
function maybeStartTour(){
  const u = currentUser();
  if (u && !state.toured[u.id]) startTour();
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
