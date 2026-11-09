/*
 * cloud.js
 * Live mode: connects VolunteerHub to a Firebase project so everyone shares the same data.
 *   - Firebase Authentication handles accounts and passwords (this site never sees them).
 *   - Cloud Firestore stores users, events, sign-ups, announcements, notices, and concerns.
 *   - Live listeners (onSnapshot) push changes from other devices into `state` instantly.
 *   - firestore.rules decides who may read or change what; the app mirrors those rules
 *     in DB.canManageReg() so it never tries something the database will refuse.
 * If firebase-config.js is left empty, none of this runs and the site is demo-only.
 */
"use strict";

const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/10.14.1/";
const clean = obj => JSON.parse(JSON.stringify(obj));   // Firestore rejects "undefined" values

const Cloud = {
  enabled:false,     // Firebase settings are filled in
  ready:false,       // we know whether someone is signed in
  online:typeof navigator !== "undefined" ? navigator.onLine : true,
  auth:null, fs:null,
  meSub:null, subs:[], roleKey:"", me:null,
  data:{users:[], events:[], regs:[], announcements:[], notices:[], concerns:[], clubs:[], memberships:[], hourLogs:[], clubCodes:{}},
  parts:{coords:[], all:null},
  club:{key:"", subs:[], myM:[], myL:[], allM:null, allL:null, m:{}, l:{}},   // club data: yours + clubs you manage
  org:null,

  emptyState(){
    return {v:DATA_VERSION, org:Object.assign({name:"Your Organization", zip:DEFAULT_HOME_ZIP, about:"", waiver:DEFAULT_WAIVER}, this.org || {}),
      users:[], events:[], regs:[], announcements:[], notices:[], concerns:[], clubs:[], memberships:[], hourLogs:[], clubCodes:{},
      session:{userId:null}, prefs:loadPrefs()};
  },

  /* ----- Start up ----- */
  boot(){
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey) return;                        // no settings: demo-only site
    this.enabled = true; ui.liveShell = true;
    state = this.emptyState(); render();
    const files = ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"];
    let i = 0;
    const next = () => {
      if (i === files.length) return this.init(cfg);
      const s = document.createElement("script");
      s.src = (window.FIREBASE_SDK_BASE || FIREBASE_SDK) + files[i++];
      s.onload = next; s.onerror = () => this.unavailable();
      document.head.appendChild(s);
    };
    next();
    window.addEventListener("online", () => { this.online = true; this.showSync(); });
    window.addEventListener("offline", () => { this.online = false; this.showSync(); if (DB.live) toast("You're offline. Changes will save when you reconnect."); });
  },
  // Couldn't download Firebase (for example, no internet): fall back to the demo.
  unavailable(){
    this.enabled = false; ui.liveShell = false; state = demoState(); render();
    toast("Couldn't reach the live database, so you're seeing the demo. Check your internet connection.", "bad");
  },
  init(cfg){
    try { firebase.initializeApp(cfg); } catch(e){ /* already started */ }
    this.auth = firebase.auth(); this.fs = firebase.firestore();
    if (window.FIREBASE_EMULATOR) window.FIREBASE_EMULATOR(this.auth, this.fs);   // used only for testing
    this.fs.enablePersistence({synchronizeTabs:true}).catch(() => {});           // keeps working through short outages
    // The organization's name and ZIP are public so the login page can show them
    this.fs.doc("settings/org").onSnapshot(d => {
      if (d.exists){ this.org = d.data(); if (!ui.demo) state.org = Object.assign(this.emptyState().org, this.org); this.later(); }
    }, () => {});
    this.auth.onAuthStateChanged(user => this.onAuth(user));
  },

  /* ----- Signed in / signed out ----- */
  onAuth(user){
    this.ready = true;
    this.detach(); if (this.meSub){ this.meSub(); this.meSub = null; }
    this.me = null; this.roleKey = ""; DB.live = false;
    if (!user){
      this.data = {users:[], events:[], regs:[], announcements:[], notices:[], concerns:[], clubs:[], memberships:[], hourLogs:[], clubCodes:{}};
      this.stopClubSubs();
      if (!ui.demo){ state = this.emptyState(); render(); }
      return;
    }
    // Watch your own profile. A brand-new account's profile may take a moment to appear.
    this.meSub = this.fs.collection("users").doc(user.uid).onSnapshot(d => {
      if (!d.exists) return;
      const me = d.data(), key = `${me.role}|${!!me.verified}|${!!me.admin}`;
      this.me = me;
      if (key !== this.roleKey){ this.roleKey = key; this.attach(me); }   // permissions changed: re-subscribe
      this.mergeUsers();
    }, err => this.loadError("your profile", err));
  },

  // Subscribe to what this person is allowed to see (matches firestore.rules).
  attach(me){
    this.detach();
    const fs = this.fs, coordLike = me.role === "coordinator" && (me.verified || me.admin);
    const watch = (coll, query, onDocs) => this.subs.push(query.onSnapshot(
      s => { const docs = s.docs.map(d => d.data()); if (onDocs) onDocs(docs); else this.data[coll] = docs; this.apply(); },
      err => this.loadError(coll, err)));
    watch("events", fs.collection("events"));
    watch("regs", fs.collection("regs"));
    watch("announcements", fs.collection("announcements"));
    watch("notices", fs.collection("notices").where("userId", "==", me.id));
    watch("concerns", coordLike ? fs.collection("concerns") : fs.collection("concerns").where("userId", "==", me.id));
    // Clubs: everyone sees the list. Verified coordinators see all memberships and logged hours;
    // students see their own, plus everything for clubs they manage (see syncClubSubs).
    watch("clubs", fs.collection("clubs"));
    const C = this.club; C.key = ""; C.allM = C.allL = null; C.myM = []; C.myL = [];
    if (coordLike){
      watch("memberships", fs.collection("memberships"), docs => { C.allM = docs; this.mergeClubs(); });
      watch("hourLogs", fs.collection("hourLogs"), docs => { C.allL = docs; this.mergeClubs(); });
    } else {
      watch("memberships", fs.collection("memberships").where("userId", "==", me.id), docs => { C.myM = docs; this.mergeClubs(); });
      watch("hourLogs", fs.collection("hourLogs").where("userId", "==", me.id), docs => { C.myL = docs; this.mergeClubs(); });
    }
    if (coordLike) watch("users", fs.collection("users"), docs => { this.parts.all = docs; this.mergeUsers(); });
    else { this.parts.all = null; watch("users", fs.collection("users").where("role", "==", "coordinator"), docs => { this.parts.coords = docs; this.mergeUsers(); }); }
  },
  detach(){ this.subs.forEach(stop => stop()); this.subs = []; this.stopClubSubs(); },

  // Combine your own club records with those of clubs you manage (no duplicates).
  mergeClubs(){
    const C = this.club, byId = list => [...new Map(list.map(x => [x.id, x])).values()];
    this.data.memberships = C.allM || byId([...C.myM, ...Object.values(C.m).flat()]);
    this.data.hourLogs = C.allL || byId([...C.myL, ...Object.values(C.l).flat()]);
    this.apply();
  },
  // When the clubs you manage change, listen to their members, hours, and join code.
  syncClubSubs(){
    if (!this.me) return;
    const ids = managedClubs(this.me).map(c => c.id).sort((a, b) => a - b), key = ids.join(","), C = this.club;
    if (key === C.key) return;
    this.stopClubSubs(); C.key = key;
    ids.forEach(id => {
      if (!C.allM) C.subs.push(this.fs.collection("memberships").where("clubId", "==", id).onSnapshot(s => { C.m[id] = s.docs.map(d => d.data()); this.mergeClubs(); }, e => this.loadError("club members", e)));
      if (!C.allL) C.subs.push(this.fs.collection("hourLogs").where("clubId", "==", id).onSnapshot(s => { C.l[id] = s.docs.map(d => d.data()); this.mergeClubs(); }, e => this.loadError("club hours", e)));
      C.subs.push(this.fs.collection("clubSecrets").doc(String(id)).onSnapshot(d => { if (d.exists){ this.data.clubCodes[id] = d.data().code; this.apply(); } }, () => {}));
    });
  },
  stopClubSubs(){ const C = this.club; C.subs.forEach(stop => stop()); C.subs = []; C.m = {}; C.l = {}; C.key = ""; },
  mergeUsers(){
    const list = (this.parts.all || this.parts.coords).filter(u => !this.me || u.id !== this.me.id);
    this.data.users = this.me ? [this.me, ...list] : list;
    this.apply();
  },

  // Copy the latest database data into `state` and redraw (skipped while exploring the demo).
  apply(){
    if (ui.demo) return;
    const d = this.data, eventIds = new Set(d.events.map(e => e.id));
    Object.assign(state, {users:d.users, events:d.events, announcements:d.announcements, notices:d.notices, concerns:d.concerns,
      clubs:d.clubs, memberships:d.memberships, hourLogs:d.hourLogs, clubCodes:Object.assign({}, d.clubCodes, state.clubCodes),
      regs:d.regs.filter(r => eventIds.has(r.eventId))});       // ignore sign-ups for deleted events
    const wasLive = DB.live;
    DB.live = !!this.me; state.session.userId = this.me ? this.me.id : null;
    if (DB.live && !wasLive){ ui.view = ui.view || "dashboard"; setTimeout(() => maybeStartTour(), 50); }
    if (DB.live) this.syncClubSubs();
    this.later();
  },
  later(){
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { render(); this.autoPromote(); }, 30);
  },

  // Keeps every upcoming event consistent after each live update:
  //  1. If two people took the last spot at the same moment, move the later one to the waitlist.
  //  2. If a spot opened while someone was offline, fill it from the waitlist.
  // Volunteers can only change their own sign-ups; managers can change any for their events.
  autoPromote(){
    if (!DB.live || this.promoting || !currentUser()) return;
    this.promoting = true;
    try {
      const upcoming = state.events.filter(e => e.date >= TODAY);
      upcoming.filter(e => spotsLeft(e) < 0).forEach(e => fixOverbooking(e));
      upcoming.filter(e => spotsLeft(e) > 0 && waitlistFor(e.id).length).forEach(e => fillFromWaitlist(e));
    }
    finally { this.promoting = false; }
  },

  /* ----- Writing ----- */
  write(promise){ promise.catch(err => toast(`That change didn't save: ${this.friendly(err)}`, "bad")); },
  set(coll, obj){ this.write(this.fs.collection(coll).doc(String(obj.id)).set(clean(obj))); },
  update(coll, id, fields){ this.write(this.fs.collection(coll).doc(String(id)).update(clean(fields))); },
  remove(coll, id){ this.write(this.fs.collection(coll).doc(String(id)).delete()); },
  setOrg(org){ this.write(this.fs.doc("settings/org").set(clean(org))); },
  // Join codes: clubSecrets shows managers the code; joinCodes lets members look one up.
  setClubCode(clubId, code, old){
    this.write(this.fs.collection("clubSecrets").doc(String(clubId)).set({code}));
    this.write(this.fs.collection("joinCodes").doc(code).set({clubId}));
    if (old) this.write(this.fs.collection("joinCodes").doc(old).delete());
  },
  findClubByCode(code){
    return this.fs.collection("joinCodes").doc(code).get().then(d => {
      if (!d.exists) throw new Error("not found");
      return d.data().clubId;
    });
  },

  /* ----- Accounts ----- */
  login(email, password){
    return this.auth.signInWithEmailAndPassword(email, password).then(() => { ui.view = "dashboard"; });
  },
  signup(profile, password){
    return this.auth.createUserWithEmailAndPassword(profile.email, password).then(cred => {
      ui.view = profile.role === "volunteer" ? "profile" : "dashboard";
      return this.fs.collection("users").doc(cred.user.uid).set(clean({id:cred.user.uid, ...profile}));
    }).then(() => toast(profile.role === "volunteer" ? "Welcome! Add your skills and ZIP code so we can recommend shifts." : "Welcome! A site admin will verify your organizer account."));
  },
  resetPassword(email){ return this.auth.sendPasswordResetEmail(email); },
  logout(){ return this.auth.signOut(); },
  // Remove the profile first (while still signed in), then the login. If Firebase asks the
  // person to sign in again first, put the profile back so nothing is lost.
  deleteAccount(){
    const user = this.auth.currentUser, me = clean(this.me), ref = this.fs.collection("users").doc(user.uid);
    return ref.delete().then(() => user.delete()).catch(err => {
      if (err.code === "auth/requires-recent-login") return ref.set(me).then(() => { throw err; });
      throw err;
    });
  },

  /* ----- Demo mode inside a live site ----- */
  enterDemo(){ ui.demo = true; ui.liveShell = false; DB.live = false; state = demoState(); },
  exitDemo(){
    ui.demo = false; ui.liveShell = true; state = this.emptyState();
    this.apply(); render();
  },

  /* ----- Messages ----- */
  friendly(err){
    const code = (err && err.code) || "";
    const map = {
      "auth/invalid-credential":"That email and password don't match.", "auth/wrong-password":"That email and password don't match.",
      "auth/user-not-found":"That email and password don't match.", "auth/invalid-email":"Enter a valid email, like name@example.org.",
      "auth/email-already-in-use":"An account with this email already exists. Try logging in.",
      "auth/weak-password":"Choose a stronger password: at least 8 characters with a letter and a number.",
      "auth/too-many-requests":"Too many tries. Wait a few minutes and try again.",
      "auth/network-request-failed":"You're offline. Check your internet connection and try again.",
      "auth/requires-recent-login":"For your security, log out, log back in, and then try again.",
      "permission-denied":"you don't have permission to do that.", "unavailable":"the database can't be reached right now.",
    };
    return map[code] || (err && err.message) || "Something went wrong. Please try again.";
  },
  loadError(what, err){
    console.warn("Couldn't load", what, err);
    if (err && err.code === "permission-denied") toast(`Couldn't load ${what}. The database rules may need updating (see SETUP-FIREBASE.md).`, "bad");
  },
  showSync(){
    const el = document.getElementById("sync-status");
    if (el) el.textContent = this.online ? "● Connected" : "○ Offline: changes will sync when you reconnect";
  },
};
