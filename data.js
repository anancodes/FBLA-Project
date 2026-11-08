/*
 * data.js
 * App-wide constants (causes, skills, availability) and the sample data used for the demo.
 * seed() builds a fictional nonprofit with volunteers, events, and sign-up history.
 */
"use strict";

const KEY = "volunteerhub-demo-v1";
const CATS = ["Food Pantry","Tutoring","Environment","Senior Support","Fundraising"];
const SKILLS = ["Lifting","Driving","Spanish","Tutoring","Cooking","Tech","First Aid"];
const AVAIL = ["Weekday mornings","Weekday evenings","Weekends"];
const HOUR_GOAL = 40;

function seed(){
  let s = 11; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const users = [
    {id:1, name:"Jordan Reyes", email:"coordinator@demo.org", phone:"555-201-4410", role:"coordinator", password:"demo1234", skills:[], availability:[]},
    {id:2, name:"Maya Chen", email:"volunteer@demo.org", phone:"555-318-0927", role:"volunteer", password:"demo1234", skills:["Tutoring","Tech","Spanish"], availability:["Weekday evenings","Weekends"]},
  ];
  const people = [["Liam Okafor",["Lifting","Driving"]],["Sofia Martinez",["Spanish","Cooking"]],["Ethan Brooks",["Tech","Tutoring"]],["Aisha Rahman",["First Aid","Cooking"]],["Noah Kim",["Lifting"]],["Grace Thompson",["Tutoring","Spanish"]],["Lucas Silva",["Driving","Lifting"]],["Priya Patel",["Tech","First Aid"]],["Owen Murphy",["Cooking","Lifting"]],["Zoe Williams",["Tutoring"]],["Daniel Nguyen",["Driving","Tech"]],["Hannah Lee",["First Aid","Spanish"]]];
  people.forEach(([n, sk], i) => users.push({
    id:i+3, name:n, email:n.toLowerCase().replace(" ", ".") + "@example.org",
    phone:`555-${410 + i*23}-${String(1200 + i*617).slice(0,4)}`, role:"volunteer", password:"demo1234",
    skills:sk, availability:[AVAIL[i%3], AVAIL[(i+1)%3]]
  }));
  const tpl = [
    ["Saturday Food Sort","Food Pantry","09:00","12:00","Riverbend Pantry Warehouse",12,["Lifting"],"Sort and shelve donated groceries for the weekly distribution."],
    ["After-School Homework Help","Tutoring","15:30","17:30","Eastside Library, Room B",6,["Tutoring"],"Help students in grades 3–8 with homework and reading."],
    ["Miller Creek Cleanup","Environment","08:00","11:00","Miller Creek Trailhead",15,[],"Pick up litter and clear invasive plants along the creek trail. Gloves provided."],
    ["Senior Grocery Delivery","Senior Support","10:00","13:00","Riverbend Pantry Warehouse",5,["Driving"],"Deliver grocery boxes to homebound seniors on the north-side route."],
    ["Community Dinner Prep","Food Pantry","16:00","19:00","St. Mark's Community Kitchen",8,["Cooking"],"Prep and serve a hot meal for about 120 neighbors."],
    ["Tech Help Desk for Seniors","Senior Support","13:00","15:00","Oakwood Senior Center",4,["Tech"],"Help older adults with phones, email, and video calls."],
    ["Fall 5K Check-In","Fundraising","07:00","10:00","Riverside Park Pavilion",10,[],"Staff registration tables and water stations at our annual fundraiser run."],
    ["Mobile Pantry Distribution","Food Pantry","14:00","17:00","Lincoln Elementary Parking Lot",14,["Lifting","Spanish"],"Hand out produce boxes at our pop-up pantry."],
    ["ESL Conversation Circle","Tutoring","18:00","19:30","Eastside Library, Room A",5,["Spanish"],"Lead small-group English conversation practice for adult learners."],
    ["Neighborhood Health Fair","Senior Support","09:00","13:00","Oakwood Senior Center",8,["First Aid"],"Greet attendees and help run blood-pressure and vision screening stations."],
  ];
  const offsets = [-154,-147,-140,-133,-126,-119,-112,-105,-98,-91,-84,-77,-70,-63,-56,-49,-42,-35,-28,-21,-14,-9,-5,-2,0,2,5,8,12,15,19,26];
  const events = offsets.map((o, i) => { const t = tpl[i % tpl.length];
    return {id:i+1, title:t[0], category:t[1], start:t[2], end:t[3], location:t[4], slots:t[5], skills:t[6], desc:t[7], date:addDays(o)}; });
  const regs = []; const vols = users.filter(u => u.role === "volunteer").map(u => u.id);
  events.forEach(e => {
    const past = e.date < TODAY;
    let n = Math.round(e.slots * (past ? 0.6 + rnd()*0.35 : 0.3 + rnd()*0.55));
    if (!past && e.slots <= 4) n = e.slots;            // one full upcoming event
    n = Math.min(n, vols.length);
    const pool = [...vols].sort(() => rnd() - 0.5);
    if (past && !pool.slice(0, n).includes(2) && rnd() < 0.55) pool.unshift(2);   // give Maya a history
    if (!past && e.category === "Tutoring") { const k = pool.indexOf(2); if (k > -1 && k < n) pool.splice(k, 1); } // leave tutoring open for her
    [...new Set(pool)].slice(0, n).forEach(uid => {
      let status = "registered", hours = 0;
      if (past) { status = rnd() < 0.87 ? "attended" : "no-show"; hours = status === "attended" ? duration(e) : 0; }
      regs.push({id:regs.length+1, userId:uid, eventId:e.id, status, hours});
    });
  });
  return {v:1, users, events, regs, session:{userId:null}, prefs:{font:15, hc:false}};
}
