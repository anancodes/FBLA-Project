/*
 * views/help.js
 * Help screen: role-specific getting-started steps, FAQ, and accessibility tips.
 */
"use strict";

function helpView(u){
  const coord = u.role === "coordinator";
  const steps = coord
    ? [["Post an event","Go to Events and choose New event. Set the date, time, and how many volunteers you need."],["Watch sign-ups","The Overview lists events under half full so you can recruit early."],["Check people in","On event day, open Check-in and mark each volunteer present or a no-show."],["Report results","Use Reports to total hours by volunteer, event, month, or cause, then copy the data."]]
    : [["Set up your profile","Add your skills and availability so we can recommend shifts."],["Find a shift","Browse Opportunities and filter by cause or your skills."],["Show up","Check in with the coordinator on site. They'll record your hours."],["Track your hours","See your verified hours, and copy them for school or club forms."]];
  const faq = coord ? [
    ["Why can't I check people in for a future event?","Check-in opens on the day of the event so no one gets credit for hours they haven't served yet."],
    ["Can I lower the number of volunteers needed?","Yes, as long as the new number isn't below the people already signed up. Contact some volunteers first if you need to."],
    ["What does reliability mean?","It's the share of a volunteer's completed shifts they showed up for. No-shows lower it; cancellations don't."],
    ["How do I get report data into Excel?","On Reports, choose Download CSV and open the file in Excel or Google Sheets. Copy works too, if you'd rather paste."],
    ["How does the waitlist work?","When an event is full, volunteers can join a waitlist. If someone cancels, or you add spots by editing the event, the first person in line is signed up automatically and gets an update."],
    ["How do I set up a club?","Go to Clubs and choose New club. Set the hour requirement and term dates, then share the join code with members. To add student officers, choose Make officer next to their name. Officers can approve hours and run club events, but can't approve their own hours."],
    ["A join code got shared too widely. What do I do?","On the club's page, choose New code. The old code stops working right away; people who already joined stay in the club."],
    ["How do I verify a new organizer?","Site admins see an Organizers screen. Follow its checklist (call the organization at a number you look up yourself and confirm they're a real nonprofit), then choose Verify."],
    ["What happens when I change or delete an event?","Everyone signed up or on the waitlist gets an update on their Home page explaining what changed."],
    ["How do I change the organization name?","Go to Settings and enter your organization's name, town, and a short description. They update across the whole site right away."],
    ["What does Verified organizer mean?","Coordinators who VolunteerHub has checked show a Verified badge, and volunteers see only verified listings unless they turn that filter off. New coordinator accounts start unverified."],
    ["What do I do with a reported concern?","Reported concerns appear at the top of the Overview. Open the listing, fix or delete it if needed, then choose Mark resolved."],
    ["Who sees my announcements?","Choose All volunteers, or pick one event to reach only the people signed up for it or waiting for a spot."],
  ] : [
    ["Why can't I sign up for an event?","It may be full, or it may overlap with another shift you've signed up for. You'll see a message explaining which. If it's full, you can join the waitlist."],
    ["How does the waitlist work?","If someone cancels, the first person in line gets the spot automatically. You'll see an update on your Home page and in your Inbox."],
    ["How do I know an opportunity is real?","Look for the Verified organizer badge. It means VolunteerHub has checked that the coordinator works with a real organization. Open More info to see who posted it, when, and how to reach them. Real listings never ask you to pay, share bank details, or send ID numbers. If something seems off, choose Report a concern."],
    ["How do I join a club like HOSA or NHS?","Ask a club officer or your adviser for the join code. Go to Hours & clubs, open the My clubs tab, type the code, and choose Join."],
    ["How do I get credit for service I did somewhere else?","In Hours & clubs, open My clubs and choose Log outside hours. Add the date, hours, what you did, and your supervisor's email or phone. An officer or your adviser checks with your supervisor and approves it. You'll get an update either way."],
    ["Do club event hours count automatically?","Yes. When an officer checks you in at a club event, those hours count toward that club's requirement right away."],
    ["Can I find shifts near me?","Yes. On Opportunities, type your ZIP code and choose a distance. Shifts are sorted nearest first and show how far away they are. Save your ZIP on your Profile so the search starts there every time."],
    ["How do I get a certificate of my hours?","Go to Hours & clubs and choose View certificate, then Print certificate. You can also save it as a PDF from the print window."],
    ["When do my hours show up?","Once a coordinator marks you present at the event."],
    ["How do I cancel?","Go to My schedule, choose Cancel, then Confirm cancel. Your spot opens up for someone else."],
    ["Who can see my information?","Your phone number, ZIP code, and emergency contact are shown only to you and verified coordinators. You can delete your account anytime from Profile."],
    ["Can I export my hours?","Yes. On Hours & clubs, choose Download CSV to get a spreadsheet file."],
  ];
  return `<div class="head"><div><h1>Help</h1><p class="muted">How VolunteerHub works for ${coord ? "coordinators" : "volunteers"}.</p></div></div>
  <section class="steps">${steps.map(([t, d], i) => `<div class="card step"><span class="n">${i+1}</span><h3>${t}</h3><p class="muted small">${d}</p></div>`).join("")}</section>
  <section class="card spread"><div><h2>New here?</h2><p class="muted small">Take a one-minute tour of every screen.</p></div><button class="btn" data-act="tour">Take the tour</button></section>
  <section><h2 style="margin-bottom:10px">Common questions</h2>${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</section>
  <section class="card stack"><h2>Accessibility</h2>
    <p class="muted">Open your account menu (your name, top right) to change the <b>text size</b>, switch between <b>light and dark</b> themes, or turn on <b>high contrast</b>. Every action works with a keyboard: <kbd>Tab</kbd> moves between controls, <kbd>Enter</kbd> activates them, and <kbd>Esc</kbd> closes pop-up forms.</p></section>`;
}
