const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {initializeTestEnvironment, assertSucceeds, assertFails} = require("@firebase/rules-unit-testing");
const {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} = require("firebase/firestore");

const projectId = "demo-volunteerhub";
const emulator = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8875";
const endpoint = /^(127[.]0[.]0[.]1|localhost):([0-9]+)$/.exec(emulator);
if (!endpoint) throw Error("Rules tests require a loopback emulator.");

const now = new Date().toISOString();
const today = now.slice(0, 10);
const future = "2099-05-10";
let env;
const profile = (id, role = "volunteer", extra = {}) => ({
  id, role, name:"Casey O’Connor", email:`${id}@example.org`, phone:"", skills:[], availability:[],
  verified:false, waiverAt:role === "volunteer" ? now : "", ...extra,
});
const venue = (id, overrides = {}) => ({
  id, postedBy:"organizer", postedAt:today, updatedAt:today, title:"Community cleanup",
  category:"Environment", date:future, start:"10:00", end:"12:00", location:"Community Garden",
  slots:10, skills:[], desc:"Meet in the garden.\nBring gloves.", clubId:null, ...overrides,
});
const club = (id, createdBy = "organizer") => ({
  id, name:"Community Service Club", short:"NHS", about:"School service activities", req:null, createdBy,
});
const member = (clubId, userId, role, extra = {}) => ({
  id:`${clubId}_${userId}`, clubId, userId, role, name:profile(userId).name, email:`${userId}@example.org`,
  joinedAt:today, ...extra,
});
const registration = (eventId, userId, status = "registered", hours = 0) => ({
  id:`${eventId}_${userId}`, eventId, userId, status, hours, createdAt:serverTimestamp(),
});
const concern = (id, userId, eventId = 10) => ({
  id, userId, eventId, reason:"Feels unsafe", details:"Please review the listing.", status:"open", at:now,
});
const user = (id, verified = true) => env.authenticatedContext(id, {
  email:`${id}@example.org`, email_verified:verified, auth_time:Math.floor(Date.now() / 1000),
}).firestore();
const ref = (db, path) => doc(db, path);
// Guests sign in anonymously from a coordinator's link or QR code.
const guest = (id, authAge = 0) => env.authenticatedContext(id, {
  firebase:{sign_in_provider:"anonymous", identities:{}}, auth_time:Math.floor(Date.now() / 1000) - authAge,
}).firestore();
const guestProfile = (id, invite = "GUESTLINK234", extra = {}) => ({
  id, role:"volunteer", name:"Riley Guest", email:"", phone:"", skills:[], availability:[],
  verified:false, waiverAt:now, guest:true, invite, ...extra,
});

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore:{host:endpoint[1], port:Number(endpoint[2]),
      rules:fs.readFileSync(path.resolve(__dirname,"../volunteerhub-web/vh-web/firestore.rules"),"utf8")},
  });
});
test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const batch = writeBatch(db);
    const fixtures = {
      "users/volunteer":profile("volunteer"), "users/other":profile("other"),
      "users/officer":profile("officer"), "users/unverified":profile("unverified"),
      "users/organizer":profile("organizer","coordinator",{verified:true, emergency:"Private contact"}),
      "users/pending":profile("pending","coordinator"),
      "users/admin":profile("admin","coordinator",{admin:true,verified:true}),
      "organizers/organizer":{id:"organizer",name:profile("organizer").name,verified:true,org:""},
      "events/10":venue(10), "events/11":venue(11,{clubId:5}), "events/12":venue(12,{date:today}),
      "clubs/5":club(5),
      "memberships/5_organizer":member(5,"organizer","adviser"),
      "memberships/5_officer":member(5,"officer","officer"),
      "memberships/5_volunteer":member(5,"volunteer","member"),
      "concerns/60":concern(60,"volunteer"),
      "clubSecrets/5":{code:"NHS-ABC234DEF567"}, "joinCodes/NHS-ABC234DEF567":{clubId:5},
      "settings/org":{name:"VolunteerHub",zip:"20001",about:"",waiver:"Please follow the organizer’s instructions when volunteering."},
      "settings/internal":{owner:"staff"},
      "invites/GUESTLINK234":{code:"GUESTLINK234",createdBy:"organizer",createdAt:today,active:true},
      "invites/OLDLINK23456":{code:"OLDLINK23456",createdBy:"organizer",createdAt:today,active:false},
      "users/guest":guestProfile("guest"),
      "users/linked":guestProfile("linked"),
    };
    Object.entries(fixtures).forEach(([key, record]) => batch.set(ref(db,key),record));
    await batch.commit();
  });
});
test.after(async () => { await env?.cleanup(); });

test("verified accounts can read their own record and the public directory, with private profiles scoped by role", async () => {
  const guest = env.unauthenticatedContext().firestore(), vol = user("volunteer");
  await assertSucceeds(getDoc(ref(guest,"settings/org")));
  await assertFails(getDoc(ref(guest,"settings/internal")));
  await assertFails(getDocs(collection(guest,"settings")));
  await assertFails(getDoc(ref(user("unverified",false),"events/10")));
  await assertSucceeds(getDoc(ref(vol,"users/volunteer")));
  await assertFails(getDocs(collection(vol,"users")));
  await assertFails(getDoc(ref(vol,"users/organizer")));
  const publicProfile = await assertSucceeds(getDoc(ref(vol,"organizers/organizer")));
  assert.deepEqual(Object.keys(publicProfile.data()).sort(), ["id","name","org","verified"]);
  await assertSucceeds(getDocs(collection(user("organizer"),"users")));
  await assertFails(getDocs(collection(user("pending"),"users")));
});

test("profile creation checks identity and schema, and organizers can only publish their approved projection", async () => {
  const newcomer = user("newcomer",false);
  await assertSucceeds(setDoc(ref(newcomer,"users/newcomer"),profile("newcomer")));
  await assertFails(setDoc(ref(user("new"),"users/new"),profile("new","coordinator",{verified:true})));
  await assertFails(setDoc(ref(user("new"),"users/new"),profile("new","volunteer",{email:"other@example.org"})));
  await assertSucceeds(updateDoc(ref(user("volunteer"),"users/volunteer"),{name:"María O’Connor"}));
  await assertFails(updateDoc(ref(user("volunteer"),"users/volunteer"),{phone:["555-123-4567"]}));
  await assertFails(updateDoc(ref(user("volunteer"),"users/volunteer"),{name:"x".repeat(81)}));
  await assertFails(updateDoc(ref(user("volunteer"),"users/volunteer"),{email:"other@example.org"}));
  await assertSucceeds(setDoc(ref(user("pending"),"organizers/pending"),{
    id:"pending",name:profile("pending").name,org:"",verified:false,
  }));
  await assertFails(updateDoc(ref(user("organizer"),"organizers/organizer"),{phone:"555-123-4567"}));
  await assertFails(updateDoc(ref(user("organizer"),"users/pending"),{verified:true,verifiedAt:today}));
  const admin = user("admin"), batch = writeBatch(admin);
  batch.update(ref(admin,"users/pending"),{verified:true,verifiedAt:today});
  batch.set(ref(admin,"organizers/pending"),{id:"pending",name:profile("pending").name,org:"",verified:true});
  await assertSucceeds(batch.commit());
});

test("event queries enforce club membership and event writes preserve ownership and valid field types", async () => {
  const vol = user("volunteer"), other = user("other"), org = user("organizer");
  const publicEvents = await assertSucceeds(getDocs(query(collection(other,"events"),where("clubId","==",null))));
  assert.deepEqual(publicEvents.docs.map(d => d.id),["10","12"]);
  await assertSucceeds(getDocs(query(collection(vol,"events"),where("clubId","==",5))));
  await assertFails(getDocs(query(collection(other,"events"),where("clubId","==",5))));
  await assertFails(getDoc(ref(other,"events/11")));
  await assertFails(getDocs(collection(other,"events")));
  await assertSucceeds(getDocs(collection(org,"events")));
  await assertFails(setDoc(ref(user("pending"),"events/90"),venue(90,{postedBy:"pending"})));
  await assertFails(updateDoc(ref(org,"events/10"),{postedBy:"other"}));
  await assertFails(updateDoc(ref(org,"events/10"),{slots:201}));
  await assertFails(updateDoc(ref(org,"events/10"),{start:"25:00"}));
  await assertSucceeds(setDoc(ref(org,"events/90"),venue(90,{category:"Other",location:"West footbridge",zip:""})));
  await assertSucceeds(setDoc(ref(user("officer"),"events/91"),venue(91,{postedBy:"officer",clubId:5})));
});

test("one registration per volunteer and event, with fixed identity and role-controlled attendance", async () => {
  const vol = user("volunteer"), org = user("organizer"), other = user("other");
  await assertSucceeds(setDoc(ref(vol,"regs/10_volunteer"),registration(10,"volunteer")));
  await assertFails(setDoc(ref(vol,"regs/10_volunteer"),registration(10,"volunteer")));
  await assertFails(setDoc(ref(other,"regs/11_other"),registration(11,"other")));
  await assertFails(updateDoc(ref(vol,"regs/10_volunteer"),{userId:"other"}));
  await assertFails(updateDoc(ref(vol,"regs/10_volunteer"),{status:"attended",hours:2}));
  await assertFails(updateDoc(ref(org,"regs/10_volunteer"),{status:"attended",hours:2}));
  await assertSucceeds(updateDoc(ref(vol,"regs/10_volunteer"),{status:"cancelled"}));
  await assertSucceeds(updateDoc(ref(vol,"regs/10_volunteer"),{status:"waitlist"}));
  await assertSucceeds(setDoc(ref(org,"regs/12_volunteer"),registration(12,"volunteer","attended",2)));
  await assertFails(updateDoc(ref(org,"regs/12_volunteer"),{hours:25}));
  await assertSucceeds(updateDoc(ref(org,"regs/12_volunteer"),{hours:1.5}));
});

test("targeted announcements and concerning reports use their intended audiences", async () => {
  const org = user("organizer"), vol = user("volunteer"), other = user("other");
  const post = {id:21,title:"Parking information",body:"Please enter by the east gate.",audience:"10",
    authorId:"organizer",at:now,recipientIds:["volunteer"]};
  await assertSucceeds(setDoc(ref(org,"announcements/21"),post));
  await assertSucceeds(getDocs(query(collection(vol,"announcements"),where("recipientIds","array-contains","volunteer"))));
  await assertSucceeds(getDocs(query(collection(vol,"announcements"),where("audience","==","all"))));
  await assertFails(getDoc(ref(other,"announcements/21")));
  await assertFails(getDocs(collection(vol,"announcements")));
  await assertSucceeds(getDocs(query(collection(vol,"concerns"),where("userId","==","volunteer"))));
  await assertFails(getDoc(ref(org,"concerns/60")));
  await assertSucceeds(getDocs(collection(user("admin"),"concerns")));
  await assertFails(updateDoc(ref(org,"concerns/60"),{status:"resolved"}));
  await assertSucceeds(updateDoc(ref(user("admin"),"concerns/60"),{status:"resolved"}));
});

test("club code changes are atomic and club roles and hour reviews are scoped", async () => {
  const org = user("organizer"), vol = user("volunteer"), officer = user("officer"), other = user("other");
  await assertSucceeds(getDoc(ref(other,"joinCodes/NHS-ABC234DEF567")));
  await assertFails(getDocs(collection(other,"joinCodes")));
  await assertFails(getDoc(ref(other,"clubSecrets/5")));
  await assertFails(deleteDoc(ref(officer,"memberships/5_organizer")));
  await assertFails(updateDoc(ref(officer,"memberships/5_volunteer"),{role:"officer"}));
  await assertFails(setDoc(ref(other,"memberships/5_other"),member(5,"other","member",{
    code:"NHS-ABC234DEF567", email:"volunteer@example.org",
  })));
  await assertFails(setDoc(ref(org,"clubSecrets/5"),{code:"NHS-BBC234DEF567"}));
  const rotate = writeBatch(org);
  rotate.set(ref(org,"clubSecrets/5"),{code:"NHS-BBC234DEF567"});
  rotate.set(ref(org,"joinCodes/NHS-BBC234DEF567"),{clubId:5});
  rotate.delete(ref(org,"joinCodes/NHS-ABC234DEF567"));
  await assertSucceeds(rotate.commit());
  await assertFails(getDoc(ref(other,"joinCodes/NHS-ABC234DEF567")));
  await assertSucceeds(setDoc(ref(other,"memberships/5_other"),member(5,"other","member",{code:"NHS-BBC234DEF567"})));
  const log = {id:80,clubId:5,userId:"volunteer",name:profile("volunteer").name,date:today,hours:2,place:"Community Garden",
    activity:"Prepared the garden beds.",supervisor:"Casey Lane",contact:"staff@example.org",status:"pending",at:now};
  await assertSucceeds(setDoc(ref(vol,"hourLogs/80"),log));
  await assertFails(updateDoc(ref(vol,"hourLogs/80"),{status:"approved",reviewedBy:profile("volunteer").name,reviewedAt:today,note:""}));
  await assertSucceeds(updateDoc(ref(officer,"hourLogs/80"),{status:"approved",reviewedBy:profile("officer").name,reviewedAt:today,note:""}));
});

test("new clubs can create their adviser and join code in one write", async () => {
  const organizer = user("organizer"), batch = writeBatch(organizer);
  batch.set(ref(organizer,"clubs/6"),club(6));
  batch.set(ref(organizer,"memberships/6_organizer"),member(6,"organizer","adviser"));
  batch.set(ref(organizer,"clubSecrets/6"),{code:"NHS-NEW234DEF567"});
  batch.set(ref(organizer,"joinCodes/NHS-NEW234DEF567"),{clubId:6});
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(ref(user("other"),"joinCodes/NHS-NEW234DEF567")));
});

test("only a recently authenticated volunteer can delete their own profile", async () => {
  const old = env.authenticatedContext("volunteer", {
    email:"volunteer@example.org",email_verified:true,auth_time:Math.floor(Date.now() / 1000) - 3600,
  }).firestore();
  await assertFails(deleteDoc(ref(old,"users/volunteer")));
  await assertFails(deleteDoc(ref(user("other"),"users/volunteer")));
  await assertSucceeds(deleteDoc(ref(user("volunteer"),"users/volunteer")));
});

test("advisers may configure a valid term threshold; mail credentials and delivery records are server-only", async () => {
  const req = {hours:10, label:"Fall", start:"2026-09-01", end:"2026-12-01", emailAlerts:true, alertGap:1.25};
  const adviserClub = ref(user("organizer"),"clubs/5");
  await assertSucceeds(updateDoc(adviserClub,{req}));
  await assertFails(updateDoc(ref(user("volunteer"),"clubs/5"),{req:{...req,alertGap:4}}));
  for (const gap of [0,0.3,10.25]) await assertFails(updateDoc(adviserClub,{req:{...req,alertGap:gap}}));
  await assertSucceeds(updateDoc(adviserClub,{req:{hours:10,label:"Fall",start:"2026-09-01",end:"2026-12-01"}}));
  for (const key of ["mailPrivate/gmail","mailPrivate/consent","hourAlertLedger/record"]){
    const record = ref(user("admin"),key);
    await assertFails(setDoc(record,{example:true}));
    await assertFails(getDoc(record));
  }
});

test("guests need an active invite or club code, stay volunteers, and never carry an email", async () => {
  await assertSucceeds(setDoc(ref(guest("g1"),"users/g1"),guestProfile("g1")));
  await assertSucceeds(setDoc(ref(guest("g2"),"users/g2"),guestProfile("g2","NHS-ABC234DEF567")));
  await assertFails(setDoc(ref(guest("g3"),"users/g3"),guestProfile("g3","OLDLINK23456")));
  await assertFails(setDoc(ref(guest("g3"),"users/g3"),guestProfile("g3","NOSUCHLINK23")));
  await assertFails(setDoc(ref(guest("g3"),"users/g3"),guestProfile("g3","NHS-ABC234DEF999")));
  await assertFails(setDoc(ref(guest("g3"),"users/g3"),guestProfile("g3","GUESTLINK234",{role:"coordinator",waiverAt:""})));
  await assertFails(setDoc(ref(guest("g3"),"users/g3"),guestProfile("g3","GUESTLINK234",{email:"g3@example.org"})));
  await assertFails(setDoc(ref(guest("g3"),"users/g3"),guestProfile("g3","GUESTLINK234",{waiverAt:""})));
  await assertFails(setDoc(ref(guest("g3"),"users/g3"),guestProfile("g3","GUESTLINK234",{admin:true})));
  await assertFails(setDoc(ref(guest("g3"),"users/other3"),guestProfile("other3")));
  // Email accounts can't create a profile that claims to be a guest.
  await assertFails(setDoc(ref(user("new"),"users/new"),{...profile("new"),guest:true,invite:"GUESTLINK234"}));
  // An anonymous sign-in with no profile can't read anything private.
  await assertFails(getDocs(query(collection(guest("nobody"),"events"),where("clubId","==",null))));
  await assertFails(getDoc(ref(guest("nobody"),"regs/10_volunteer")));
});

test("guests sign up for shifts, join clubs and log hours, but get no coordinator powers", async () => {
  const db = guest("guest");
  await assertSucceeds(getDocs(query(collection(db,"events"),where("clubId","==",null))));
  await assertSucceeds(setDoc(ref(db,"regs/10_guest"),registration(10,"guest")));
  await assertSucceeds(updateDoc(ref(db,"users/guest"),{name:"Riley Q. Guest",phone:"555-123-4567"}));
  await assertFails(updateDoc(ref(db,"users/guest"),{guest:false}));
  await assertFails(updateDoc(ref(db,"users/guest"),{role:"coordinator"}));
  await assertSucceeds(setDoc(ref(db,"memberships/5_guest"),{id:"5_guest",clubId:5,userId:"guest",role:"member",
    name:"Riley Guest",email:"",joinedAt:today,code:"NHS-ABC234DEF567"}));
  await assertSucceeds(setDoc(ref(db,"hourLogs/70"),{id:70,clubId:5,userId:"guest",name:"Riley Guest",date:today,hours:2,
    place:"City food bank",activity:"Sorted canned food donations.",supervisor:"Dana Whitfield",contact:"dana@example.org",status:"pending",at:now}));
  await assertFails(getDocs(collection(db,"users")));
  await assertFails(getDoc(ref(db,"users/volunteer")));
  await assertFails(setDoc(ref(db,"events/40"),venue(40,{postedBy:"guest"})));
  await assertFails(setDoc(ref(db,"invites/NEWLINK23456"),{code:"NEWLINK23456",createdBy:"guest",createdAt:today,active:true}));
  await assertFails(getDoc(ref(db,"clubSecrets/5")));
  // Guests can't re-enter a password, so the pass itself is enough to delete their own profile.
  await assertSucceeds(deleteDoc(ref(guest("guest",3600),"users/guest")));
});

test("coordinators manage only their own guest links, and anyone holding a code can check it", async () => {
  const organizer = user("organizer");
  await assertSucceeds(getDoc(ref(guest("nobody"),"invites/GUESTLINK234")));
  await assertSucceeds(setDoc(ref(organizer,"invites/NEWLINK23456"),{code:"NEWLINK23456",createdBy:"organizer",createdAt:today,active:true}));
  await assertSucceeds(updateDoc(ref(organizer,"invites/GUESTLINK234"),{active:false}));
  await assertFails(updateDoc(ref(organizer,"invites/OLDLINK23456"),{active:true}));
  await assertSucceeds(getDocs(query(collection(organizer,"invites"),where("createdBy","==","organizer"))));
  await assertFails(getDocs(collection(organizer,"invites")));
  await assertFails(setDoc(ref(user("pending"),"invites/PENDLINK2345"),{code:"PENDLINK2345",createdBy:"pending",createdAt:today,active:true}));
  await assertFails(setDoc(ref(user("volunteer"),"invites/VOLLINK23456"),{code:"VOLLINK23456",createdBy:"volunteer",createdAt:today,active:true}));
  await assertFails(setDoc(ref(organizer,"invites/short"),{code:"short",createdBy:"organizer",createdAt:today,active:true}));
  await assertFails(updateDoc(ref(user("admin"),"invites/NEWLINK23456"),{createdBy:"admin"}));
});

test("a guest who links and verifies an email moves the profile to that email and nothing else", async () => {
  const linked = (verified, email = "riley@example.org") => env.authenticatedContext("linked", {
    email, email_verified:verified, firebase:{sign_in_provider:"password", identities:{}}, auth_time:Math.floor(Date.now() / 1000),
  }).firestore();
  await assertFails(updateDoc(ref(linked(false),"users/linked"),{guest:false,email:"riley@example.org"}));
  await assertFails(updateDoc(ref(linked(true),"users/linked"),{guest:false,email:"someone.else@example.org"}));
  await assertFails(updateDoc(ref(linked(true),"users/linked"),{guest:false,email:"riley@example.org",role:"coordinator"}));
  await assertSucceeds(updateDoc(ref(linked(true),"users/linked"),{guest:false,email:"riley@example.org"}));
  await assertFails(updateDoc(ref(linked(true),"users/linked"),{guest:true,email:""}));
});
