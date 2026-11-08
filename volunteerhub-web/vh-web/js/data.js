/*
 * data.js
 * App-wide constants (causes, skills, availability) and the sample data used for the demo.
 * VENUES describes each place events happen (area, address, parking, accessibility).
 * EVENT_INFO adds practical details per event type (what to bring and wear, minimum age).
 * seed() builds a fictional nonprofit with volunteers, events, and sign-up history.
 * All names, places, and addresses are made up for the demo. The organization's own
 * name and town come from Settings (state.org), so any nonprofit can make it theirs.
 */
"use strict";

const KEY = "volunteerhub-demo-v1";
const CATS = ["Food Pantry","Tutoring","Environment","Senior Support","Fundraising"];
const SKILLS = ["Lifting","Driving","Spanish","Tutoring","Cooking","Tech","First Aid"];
const AVAIL = ["Weekday mornings","Weekday evenings","Weekends"];
const HOUR_GOAL = 60;   // service-hour goal shown to volunteers
const AREAS = ["Downtown","Eastside","North Side","Riverside","West Side"];

const VENUES = [
  {name:"Main Pantry Warehouse", area:"Downtown", address:"1420 Mill Street", parking:"Free lot behind the building.", access:"Ground floor and wheelchair accessible. Most tasks involve standing."},
  {name:"St. Mark's Community Kitchen", area:"Downtown", address:"310 Church Street", parking:"Street parking on Church Street; free after 5 PM.", access:"Ramp at the side entrance. Kitchen work is standing."},
  {name:"Eastside Library", area:"Eastside", address:"88 Harper Avenue", parking:"City lot across the street.", access:"Elevator to all floors and accessible restrooms."},
  {name:"Lincoln Elementary Parking Lot", area:"Eastside", address:"700 Lincoln Way", parking:"Park on Elm Street; the lot is used for the event.", access:"Outdoors on pavement. Some lifting of 20-pound boxes."},
  {name:"Miller Creek Trailhead", area:"North Side", address:"Miller Creek Road at Route 9", parking:"Gravel lot at the trailhead.", access:"Unpaved, uneven trail. Not wheelchair accessible."},
  {name:"Northgate Mall, Center Court", area:"North Side", address:"4400 Northgate Boulevard", parking:"Mall parking garage, levels 2–4.", access:"Indoors, step-free."},
  {name:"Riverside Park Pavilion", area:"Riverside", address:"5 Front Street", parking:"Free parking along Front Street.", access:"Paved paths to the pavilion. Outdoors."},
  {name:"Oakwood Senior Center", area:"West Side", address:"2050 Oakwood Drive", parking:"Visitor spaces at the main entrance.", access:"Step-free building with accessible restrooms."},
];
// Matches "Eastside Library, Room B" to the "Eastside Library" venue.
const venueOf = e => VENUES.find(v => e.location === v.name || e.location.startsWith(v.name + ",")) || {name:e.location, area:e.area || "Other", address:"", parking:"", access:""};

const EVENT_INFO = {
  "Saturday Food Sort":          {bring:"A water bottle.", wear:"Closed-toe shoes and clothes that can get dusty.", minAge:14},
  "After-School Homework Help":  {bring:"Nothing. Supplies are provided.", wear:"Casual clothes.", minAge:16},
  "Miller Creek Cleanup":        {bring:"Water and sunscreen. Gloves and bags are provided.", wear:"Long pants and sturdy shoes.", minAge:12},
  "Senior Grocery Delivery":     {bring:"A valid driver's license and your own car.", wear:"Casual clothes.", minAge:18},
  "Community Dinner Prep":       {bring:"A hair tie or hat.", wear:"Closed-toe shoes.", minAge:14},
  "Tech Help Desk for Seniors":  {bring:"Nothing needed.", wear:"Casual clothes.", minAge:14},
  "Fall 5K Check-In":            {bring:"A water bottle.", wear:"Layers. A volunteer T-shirt is provided.", minAge:12},
  "Mobile Pantry Distribution":  {bring:"Work gloves, if you have them.", wear:"Closed-toe shoes.", minAge:14},
  "ESL Conversation Circle":     {bring:"Nothing. Conversation guides are provided.", wear:"Casual clothes.", minAge:16},
  "Neighborhood Health Fair":    {bring:"Nothing needed.", wear:"Business casual.", minAge:16},
};

function seed(){
  let s = 11; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const users = [
    {id:1, name:"Jordan Reyes", email:"coordinator@demo.org", phone:"555-201-4410", role:"coordinator", password:"demo1234", skills:[], availability:[],
     org:"", verified:true, verifiedAt:addDays(-60)},
    {id:2, name:"Maya Chen", email:"volunteer@demo.org", phone:"555-318-0927", role:"volunteer", password:"demo1234", skills:["Tutoring","Tech","Spanish"], availability:["Weekday evenings","Weekends"]},
  ];
  const people = [["Liam Okafor",["Lifting","Driving"]],["Sofia Martinez",["Spanish","Cooking"]],["Ethan Brooks",["Tech","Tutoring"]],["Aisha Rahman",["First Aid","Cooking"]],["Noah Kim",["Lifting"]],["Grace Thompson",["Tutoring","Spanish"]],["Lucas Silva",["Driving","Lifting"]],["Priya Patel",["Tech","First Aid"]],["Owen Murphy",["Cooking","Lifting"]],["Zoe Williams",["Tutoring"]],["Daniel Nguyen",["Driving","Tech"]],["Hannah Lee",["First Aid","Spanish"]]];
  people.forEach(([n, sk], i) => users.push({
    id:i+3, name:n, email:n.toLowerCase().replace(" ", ".") + "@example.org",
    phone:`555-${410 + i*23}-${String(1200 + i*617).slice(0,4)}`, role:"volunteer", password:"demo1234",
    skills:sk, availability:[AVAIL[i%3], AVAIL[(i+1)%3]]
  }));
  const tpl = [
    ["Saturday Food Sort","Food Pantry","09:00","12:00","Main Pantry Warehouse",12,["Lifting"],"Sort and shelve donated groceries for the weekly distribution."],
    ["After-School Homework Help","Tutoring","15:30","17:30","Eastside Library, Room B",6,["Tutoring"],"Help students in grades 3–8 with homework and reading."],
    ["Miller Creek Cleanup","Environment","08:00","11:00","Miller Creek Trailhead",15,[],"Pick up litter and clear invasive plants along the creek trail. Gloves provided."],
    ["Senior Grocery Delivery","Senior Support","10:00","13:00","Main Pantry Warehouse",5,["Driving"],"Deliver grocery boxes to homebound seniors on the north-side route."],
    ["Community Dinner Prep","Food Pantry","16:00","19:00","St. Mark's Community Kitchen",8,["Cooking"],"Prep and serve a hot meal for about 120 neighbors."],
    ["Tech Help Desk for Seniors","Senior Support","13:00","15:00","Oakwood Senior Center",4,["Tech"],"Help older adults with phones, email, and video calls."],
    ["Fall 5K Check-In","Fundraising","07:00","10:00","Riverside Park Pavilion",10,[],"Staff registration tables and water stations at our annual fundraiser run."],
    ["Mobile Pantry Distribution","Food Pantry","14:00","17:00","Lincoln Elementary Parking Lot",14,["Lifting","Spanish"],"Hand out produce boxes at our pop-up pantry."],
    ["ESL Conversation Circle","Tutoring","18:00","19:30","Eastside Library, Room A",5,["Spanish"],"Lead small-group English conversation practice for adult learners."],
    ["Neighborhood Health Fair","Senior Support","09:00","13:00","Oakwood Senior Center",8,["First Aid"],"Greet attendees and help run blood-pressure and vision screening stations."],
  ];
  const offsets = [-154,-147,-140,-133,-126,-119,-112,-105,-98,-91,-84,-77,-70,-63,-56,-49,-42,-35,-28,-21,-14,-9,-5,-2,0,2,5,8,12,15,19,26];
  const events = offsets.map((o, i) => { const t = tpl[i % tpl.length];
    const date = addDays(o), posted = addDays(Math.min(0, o - 14));
    return {id:i+1, title:t[0], category:t[1], start:t[2], end:t[3], location:t[4], area:venueOf({location:t[4]}).area, slots:t[5], skills:t[6], desc:t[7], date,
            ...EVENT_INFO[t[0]], postedBy:1, postedAt:posted, updatedAt:posted}; });
  const regs = []; const vols = users.filter(u => u.role === "volunteer").map(u => u.id);
  events.forEach(e => {
    const past = e.date < TODAY;
    let n = Math.round(e.slots * (past ? 0.6 + rnd()*0.35 : 0.3 + rnd()*0.55));
    const fullDemo = e.date === addDays(5);               // one full upcoming event, to demo the waitlist
    if (fullDemo) n = e.slots;
    n = Math.min(n, vols.length);
    const pool = [...vols].sort(() => rnd() - 0.5);
    if (past && !pool.slice(0, n).includes(2) && rnd() < 0.55) pool.unshift(2);   // give Maya a history
    if (!past && e.category === "Tutoring") { const k = pool.indexOf(2); if (k > -1 && k < n) pool.splice(k, 1); } // leave tutoring open for her
    if (fullDemo) { const k = pool.indexOf(2); if (k > -1) pool.splice(k, 1); }  // so she can try the waitlist
    if (e.date === addDays(2) && !pool.slice(0, n).includes(2)) pool.unshift(2);  // a shift soon, to demo reminders
    [...new Set(pool)].slice(0, n).forEach(uid => {
      let status = "registered", hours = 0;
      if (past) { status = rnd() < 0.87 ? "attended" : "no-show"; hours = status === "attended" ? duration(e) : 0; }
      regs.push({id:regs.length+1, userId:uid, eventId:e.id, status, hours});
    });
  });
  // Waitlists on upcoming events that are already full
  events.filter(e => e.date >= TODAY).forEach(e => {
    const taken = regs.filter(r => r.eventId === e.id);
    if (taken.length < e.slots) return;
    vols.filter(id => id !== 2 && !taken.some(r => r.userId === id)).slice(0, 2)
      .forEach(uid => regs.push({id:regs.length+1, userId:uid, eventId:e.id, status:"waitlist", hours:0}));
  });

  // A second organizer who has NOT been verified yet, with one listing (shows the "unverified" warning)
  const casey = {id:users.length+1, name:"Casey Morgan", email:"casey@example.org", phone:"555-640-2291", role:"coordinator", password:"demo1234", skills:[], availability:[], org:"Northgate Holiday Helpers", verified:false};
  users.push(casey);
  events.push({id:events.length+1, title:"Holiday Gift Wrapping Booth", category:"Fundraising", date:addDays(9), start:"11:00", end:"15:00",
    location:"Northgate Mall, Center Court", area:"North Side", slots:6, skills:[], desc:"Wrap gifts for shoppers in exchange for donations to local families.",
    bring:"Scissors, if you have them.", wear:"Something festive.", minAge:16, postedBy:casey.id, postedAt:addDays(-1), updatedAt:addDays(-1)});

  // Sample announcements from the coordinator
  const ago = days => new Date(Date.now() - days * 86400000).toISOString();
  const announcements = [
    {id:1, title:"Thank you for a record fall season", body:"Our volunteers served more hours this season than any season before. Every food sort, delivery, and tutoring session made a difference for our neighbors.", audience:"all", authorId:1, at:ago(6)},
    {id:2, title:"Winter coat drive starts next month", body:"We'll collect new and gently used coats at every Saturday Food Sort. Sign up for a sort shift if you'd like to help with intake and sizing.", audience:"all", authorId:1, at:ago(2)},
  ];
  const mp = events.find(e => e.date >= TODAY && e.title === "Mobile Pantry Distribution");
  if (mp) announcements.push({id:3, title:"Parking change for Mobile Pantry", body:`For the ${fmtDate(mp.date)} distribution, please park on Elm Street. The school lot will be full of produce trucks.`, audience:String(mp.id), authorId:1, at:ago(1)});

  const org = {name:"Your Organization", city:"Your City", about:""};   // coordinators change these in Settings
  return {v:DATA_VERSION, org, users, events, regs, announcements, notices:[], reads:{}, toured:{}, concerns:[], session:{userId:null}, prefs:{font:15, hc:false}};
}
