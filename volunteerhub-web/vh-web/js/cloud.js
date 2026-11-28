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
const FIREBASE_SCRIPTS = {
  "firebase-app-compat.js":"sha384-ZaR6mWzmJtrRibZ1Vm7SoHFr8OXjyAuGAXalGDKqbxFT18oi/z+oZLIRFkpeNor1",
  "firebase-auth-compat.js":"sha384-I1LYojsZ5RM1cOda44Z2h42Qa6YfsQ1XkXxREnhp4ueYBR/4d1pG1K+NZM537Vsj",
  "firebase-firestore-compat.js":"sha384-Ke0FJhH7LyRqDxZ0wt+/OXV38yfQVu7g9VPEEGjYmB4RVOY/ta04uecRhsMwT7V3",
};
const FIREBASE_APP_CHECK_INTEGRITY = "sha384-Tsd7RAB2e2isM7pHHNFd4hZbrHBtszy6x4HCQqkLDM7PTHvRAjrMZKBOP2ntQDqc";
const clean = obj => JSON.parse(JSON.stringify(obj));   // Firestore rejects "undefined" values

const Cloud = {
  enabled:false,     // Firebase settings are filled in
  ready:false,       // we know whether someone is signed in
  online:typeof navigator !== "undefined" ? navigator.onLine : true,
  auth:null, fs:null, verificationUser:null, verificationSentAt:0,
  clubEvents:new Map(), announcementParts:{general:[], targeted:[]},
  loadPhase:"", loadStatus:"", loadTimers:[], retryAt:0,
  initialReads:null, pendingWrites:new Map(),
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
    state = this.emptyState();
    this.startLoad("session");
    const files = Object.keys(FIREBASE_SCRIPTS);
    if (window.FIREBASE_APP_CHECK_SITE_KEY) files.push("firebase-app-check-compat.js");
    let i = 0;
    const next = () => {
      if (i === files.length){
        this.init(cfg).catch(err => this.loadFailed(err));
        return;
      }
      const s = document.createElement("script");
      const file = files[i++];
      s.src = (window.FIREBASE_SDK_BASE || FIREBASE_SDK) + file;
      if (!window.FIREBASE_SDK_BASE){
        s.integrity = FIREBASE_SCRIPTS[file] || FIREBASE_APP_CHECK_INTEGRITY;
        s.crossOrigin = "anonymous";
      }
      s.onload = next; s.onerror = () => this.loadFailed();
      document.head.appendChild(s);
    };
    next();
    window.addEventListener("online", () => { this.online = true; this.showSync(); });
    window.addEventListener("offline", () => {
      this.online = false; this.showSync();
      if (DB.live && !this.loadPhase) toast("You're offline. Changes will sync when you reconnect.");
    });
  },
  startLoad(phase){
    this.clearLoad();
    this.loadPhase = phase;
    this.loadDenied = false;
    this.loadStatus = "starting";
    this.loadTimers = [
      setTimeout(() => { this.loadStatus = "loading"; this.renderLoad(); }, LOADING_DELAY),
      setTimeout(() => { this.loadStatus = "slow"; this.renderLoad(); }, SLOW_LOADING_DELAY),
      setTimeout(() => this.loadFailed(), LOAD_RECOVERY_DELAY),
    ];
    this.renderLoad();
  },
  clearLoad(){
    this.loadTimers.forEach(clearTimeout);
    this.loadTimers = [];
    this.loadPhase = this.loadStatus = "";
  },
  renderLoad(){
    if (!ui.demo && (!$("#app").firstElementChild || currentUser() || ui.authMode !== "landing")) render();
  },
  loadFailed(err){
    this.loadTimers.forEach(clearTimeout);
    this.loadStatus = "retry";
    this.loadDenied = err?.code === "permission-denied";
    if (this.loadDenied) console.warn("VolunteerHub could not load", this.loadPhase, err?.code);
    this.renderLoad();
  },
  retryLoad(){
    if (this.loadStatus !== "retry" || Date.now() < this.retryAt) return;
    this.retryAt = Date.now() + 3000;
    if (this.loadPhase === "session") return location.reload();
    if (this.loadPhase === "workspace" && this.me) this.attach(this.me);
    else this.onAuth(this.auth.currentUser);
    document.getElementById("page-title")?.focus({preventScroll:true});
    setTimeout(() => { if (this.loadStatus === "retry") this.renderLoad(); }, 3000);
  },
  async init(cfg){
    try { firebase.initializeApp(cfg); } catch(e){ /* already started */ }
    if (window.FIREBASE_APP_CHECK_SITE_KEY){
      const provider = new firebase.appCheck.ReCaptchaEnterpriseProvider(window.FIREBASE_APP_CHECK_SITE_KEY);
      firebase.appCheck().activate(provider, true);
    }
    this.auth = firebase.auth(); this.fs = firebase.firestore();
    if (window.FIREBASE_EMULATOR) window.FIREBASE_EMULATOR(this.auth, this.fs);   // used only for testing
    await this.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
    // Do not persist live personal records on a shared device. Clear the old version's cache when possible.
    await this.fs.clearPersistence().catch(() => {});
    // Only the published organization settings are public.
    this.fs.doc("settings/org").onSnapshot(d => {
      if (d.exists){ this.org = d.data(); if (!ui.demo) state.org = Object.assign(this.emptyState().org, this.org); this.later(); }
    }, () => {});
    this.auth.onAuthStateChanged(user => this.onAuth(user), err => this.loadFailed(err));
  },

  /* ----- Signed in / signed out ----- */
  onAuth(user){
    this.ready = true;
    this.detach();
    if (this.meSub){ this.meSub(); this.meSub = null; }
    this.me = null; this.roleKey = ""; DB.live = false;
    this.pendingWrites = new Map();
    this.verificationUser = user && !user.emailVerified ? user : null;
    this.clearLoad();
    this.data = {users:[], events:[], regs:[], announcements:[], notices:[], concerns:[], clubs:[], memberships:[], hourLogs:[], clubCodes:{}};
    this.parts = {coords:[], all:null};
    if (!ui.demo){
      closeModal(false);
      state = this.emptyState();
    }
    if (!user || this.verificationUser){
      if (!ui.demo) render();
      return;
    }
    this.startLoad("profile");
    // Account creation and the first saved profile may arrive in different snapshots.
    this.meSub = this.fs.collection("users").doc(user.uid).onSnapshot({includeMetadataChanges:true}, d => {
      if (d.metadata.fromCache && this.online) return;
      if (!d.exists){
        if (this.me && this.deletingUid !== user.uid) this.logout().catch(err => this.loadFailed(err));
        return;
      }
      const me = d.data(), key = `${me.role}|${!!me.verified}|${!!me.admin}`;
      this.me = me;
      if (key !== this.roleKey){
        this.roleKey = key;
        this.attach(me);
        if (me.role === "coordinator" && !d.metadata.fromCache) this.ensureOrganizer(me).catch(err => this.loadError("organizer listing", err));
      }
      this.mergeUsers();
    }, err => {
      if (this.loadPhase === "profile") this.loadFailed(err);
      else this.loadError("your profile", err);
    });
  },

  // Subscribe to what this person is allowed to see (matches firestore.rules).
  attach(me){
    this.detach();
    const fs = this.fs, coordLike = me.role === "coordinator" && (me.verified || me.admin);
    this.initialReads = new Set();
    this.startLoad("workspace");
    const watch = (coll, query, onDocs) => {
      this.initialReads.add(coll);
      this.subs.push(query.onSnapshot({includeMetadataChanges:true}, snapshot => {
        if (this.initialReads?.has(coll) && snapshot.metadata.fromCache && this.online) return;
        const pending = this.pendingWrites.get(coll);
        const previous = new Map(pending ? this.data[coll].map(record => [String(record.id), record]) : []);
        const docs = snapshot.docs.map(doc => pending?.has(doc.id) && doc.metadata.hasPendingWrites
          ? previous.get(doc.id) : doc.data()).filter(Boolean);
        if (onDocs) onDocs(docs);
        else { this.data[coll] = docs; this.apply(); }
        this.finishRead(coll);
      }, err => {
        if (this.initialReads?.has(coll)) this.loadFailed(err);
        else this.loadError(coll, err);
      }));
    };
    watch("events", coordLike ? fs.collection("events") : fs.collection("events").where("clubId", "==", null));
    watch("regs", fs.collection("regs"));
    if (coordLike) watch("announcements", fs.collection("announcements"));
    else {
      const list = fs.collection("announcements");
      watch("announcements", list.where("audience", "==", "all"), docs => this.mergeAnnouncements("general", docs));
      watch("targetedAnnouncements", list.where("recipientIds", "array-contains", me.id), docs => this.mergeAnnouncements("targeted", docs));
    }
    watch("notices", fs.collection("notices").where("userId", "==", me.id));
    watch("concerns", me.admin ? fs.collection("concerns") : fs.collection("concerns").where("userId", "==", me.id));
    // Clubs: everyone sees the list. Verified coordinators see all memberships and logged hours;
    // students see their own, plus everything for clubs they manage (see syncClubSubs).
    watch("clubs", fs.collection("clubs"));
    const organizers = fs.collection("organizers");
    watch("organizers", coordLike ? organizers : organizers.where("verified", "==", true), docs => { this.parts.coords = docs.map(doc => ({...doc, role:"coordinator"})); this.mergeUsers(); });
    const C = this.club; C.key = ""; C.allM = C.allL = null; C.myM = []; C.myL = [];
    if (coordLike){
      watch("memberships", fs.collection("memberships"), docs => { C.allM = docs; this.mergeClubs(); });
      watch("hourLogs", fs.collection("hourLogs"), docs => { C.allL = docs; this.mergeClubs(); });
    } else {
      watch("memberships", fs.collection("memberships").where("userId", "==", me.id), docs => {
        C.myM = docs;
        this.watchClubEvents();
        this.mergeClubs();
      });
      watch("hourLogs", fs.collection("hourLogs").where("userId", "==", me.id), docs => { C.myL = docs; this.mergeClubs(); });
    }
    if (coordLike) watch("users", fs.collection("users"), docs => { this.parts.all = docs; this.mergeUsers(); });
    else this.parts.all = null;
  },
  detach(){
    this.subs.forEach(stop => stop());
    this.subs = [];
    this.initialReads = null;
    this.stopClubSubs();
    this.clubEvents.forEach(entry => entry.stop());
    this.clubEvents.clear();
    this.announcementParts = {general:[], targeted:[]};
  },

  finishRead(key){
    if (!this.initialReads?.delete(key) || this.initialReads.size) return;
    this.initialReads = null;
    this.clearLoad();
    this.apply();
    if (!ui.demo) setTimeout(() => { if (!this.loadPhase) maybeStartTour(); }, 50);
  },

  mergeAnnouncements(part, docs){
    this.announcementParts[part] = docs;
    const announcements = [...this.announcementParts.general, ...this.announcementParts.targeted];
    this.data.announcements = [...new Map(announcements.map(doc => [doc.id, doc])).values()];
    this.apply();
  },

  watchClubEvents(){
    const ids = new Set(this.club.myM.map(membership => membership.clubId));
    if ([...ids].some(id => !this.clubEvents.has(id)) && !this.initialReads){
      this.initialReads = new Set();
      this.startLoad("workspace");
    }
    for (const id of ids){
      if (this.clubEvents.has(id)) continue;
      const key = `club-events:${id}`, entry = {docs:[], stop:null};
      this.initialReads?.add(key);
      entry.stop = this.fs.collection("events").where("clubId", "==", id).onSnapshot({includeMetadataChanges:true}, snapshot => {
        if (this.initialReads?.has(key) && snapshot.metadata.fromCache && this.online) return;
        entry.docs = snapshot.docs.map(doc => doc.data());
        this.finishRead(key);
        this.apply();
      }, error => {
        if (this.initialReads?.has(key)) this.loadFailed(error);
        else this.loadError("club events", error);
      });
      this.clubEvents.set(id, entry);
    }
    for (const [id, entry] of this.clubEvents){
      if (ids.has(id)) continue;
      entry.stop();
      this.clubEvents.delete(id);
      this.finishRead(`club-events:${id}`);
    }
  },

  // Combine your own club records with those of clubs you manage (no duplicates).
  mergeClubs(){
    this.collectClubData();
    this.apply();
  },
  collectClubData(){
    const C = this.club, byId = list => [...new Map(list.map(x => [x.id, x])).values()];
    this.data.memberships = C.allM || byId([...C.myM, ...Object.values(C.m).flat()]);
    this.data.hourLogs = C.allL || byId([...C.myL, ...Object.values(C.l).flat()]);
  },
  // When the clubs you manage change, listen to their members, hours, and join code.
  syncClubSubs(){
    if (!this.me) return;
    const ids = managedClubs(this.me).map(c => c.id).sort((a, b) => a - b), key = ids.join(","), C = this.club;
    if (key === C.key) return;
    this.stopClubSubs(); C.key = key;
    this.data.clubCodes = Object.fromEntries(ids.filter(id => this.data.clubCodes[id]).map(id => [id, this.data.clubCodes[id]]));
    state.clubCodes = this.data.clubCodes;
    this.collectClubData();
    state.memberships = this.data.memberships;
    state.hourLogs = this.data.hourLogs;
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
    const d = this.data, events = [...d.events, ...[...this.clubEvents.values()].flatMap(entry => entry.docs)];
    const eventIds = new Set(events.map(e => e.id));
    Object.assign(state, {users:d.users, events, announcements:d.announcements, notices:d.notices, concerns:d.concerns,
      clubs:d.clubs, memberships:d.memberships, hourLogs:d.hourLogs, clubCodes:d.clubCodes,
      regs:d.regs.filter(r => eventIds.has(r.eventId))});       // ignore sign-ups for deleted events
    DB.live = !!this.me; state.session.userId = this.me ? this.me.id : null;
    if (DB.live && !this.loadPhase) this.syncClubSubs();
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
    if (!DB.live || !this.online || this.loadPhase || this.pendingWrites.size || this.promoting || !currentUser()) return;
    this.promoting = true;
    try {
      const upcoming = state.events.filter(e => e.date >= TODAY);
      upcoming.filter(e => spotsLeft(e) < 0).forEach(e => fixOverbooking(e));
      upcoming.filter(e => spotsLeft(e) > 0 && waitlistFor(e.id).length).forEach(e => fillFromWaitlist(e));
    }
    finally { this.promoting = false; }
  },

  /* ----- Writing ----- */
  commit(coll, changes){
    const batch = this.fs.batch();
    for (const {id, fields, record} of changes){
      const ref = this.fs.collection(coll).doc(String(id));
      if (record) batch.set(ref, this.writeData(coll, record));
      else batch.update(ref, clean(fields));
    }
    const writes = this.pendingWrites;
    const pending = writes.get(coll) || new Set();
    for (const {id} of changes) pending.add(String(id));
    writes.set(coll, pending);
    return batch.commit().finally(() => {
      for (const {id} of changes) pending.delete(String(id));
      if (!pending.size) writes.delete(coll);
    });
  },
  writeData(coll, record){
    const data = clean(record);
    if (coll === "regs") data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    return data;
  },
  write(promise){ promise.catch(err => toast(`That change didn't save: ${this.friendly(err)}`, "bad")); },
  set(coll, obj){ this.write(this.fs.collection(coll).doc(String(obj.id)).set(this.writeData(coll, obj))); },
  update(coll, id, fields){ this.write(this.fs.collection(coll).doc(String(id)).update(clean(fields))); },
  remove(coll, id){ this.write(this.fs.collection(coll).doc(String(id)).delete()); },
  setOrg(org){ this.write(this.fs.doc("settings/org").set(clean(org))); },
  // Join codes: clubSecrets shows managers the code; joinCodes lets members look one up.
  createClub(club, adviser, code){
    const batch = this.fs.batch();
    batch.set(this.fs.collection("clubs").doc(String(club.id)), clean(club));
    batch.set(this.fs.collection("memberships").doc(adviser.id), clean(adviser));
    batch.set(this.fs.collection("clubSecrets").doc(String(club.id)), {code});
    batch.set(this.fs.collection("joinCodes").doc(code), {clubId:club.id});
    return batch.commit();
  },
  setClubCode(clubId, code){
    const ref = this.fs.collection("clubSecrets").doc(String(clubId)), codes = this.fs.collection("joinCodes");
    return this.fs.runTransaction(async transaction => {
      const previous = await transaction.get(ref);
      transaction.set(ref, {code});
      transaction.set(codes.doc(code), {clubId});
      if (previous.exists) transaction.delete(codes.doc(previous.data().code));
    });
  },
  findClubByCode(code){
    return this.fs.collection("joinCodes").doc(code).get({source:"server"}).then(d => {
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
      return this.fs.collection("users").doc(cred.user.uid).set(clean({id:cred.user.uid, ...profile}))
        .then(async () => {
          try {
            await this.sendVerification(cred.user);
            toast("Check your email for the verification link.");
          } catch {
            toast("Account created. Use Resend email if the verification link doesn't arrive.", "bad");
          }
        });
    });
  },
  resetPassword(email){
    return this.auth.sendPasswordResetEmail(email).catch(error => {
      if (error.code !== "auth/user-not-found") throw error;
    });
  },
  logout(){ return this.auth.signOut(); },
  async sendVerification(user = this.verificationUser){
    if (!user || (this.verificationSentUid === user.uid && Date.now() < this.verificationSentAt)) throw {code:"auth/verification-cooldown"};
    this.verificationSentUid = user.uid;
    this.verificationSentAt = Date.now() + 60000;
    await user.sendEmailVerification();
  },
  async checkVerification(){
    const user = this.verificationUser;
    if (!user) return;
    await user.reload();
    if (!user.emailVerified) throw {code:"auth/email-not-verified"};
    await user.getIdToken(true);
    if (this.auth.currentUser?.uid === user.uid) this.onAuth(user);
  },
  organizerRecord(profile){
    return {id:profile.id, name:profile.name, org:profile.org || "", verified:!!profile.verified};
  },
  ensureOrganizer(profile){
    return this.fs.collection("organizers").doc(profile.id).set(this.organizerRecord(profile));
  },
  setOrganizerVerification(profile, fields){
    const batch = this.fs.batch();
    batch.update(this.fs.collection("users").doc(profile.id), fields);
    batch.set(this.fs.collection("organizers").doc(profile.id), this.organizerRecord({...profile, ...fields}));
    return batch.commit();
  },
  async deleteAccount(password, shifts){
    const user = this.auth.currentUser, credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(credential);
    await user.getIdToken(true);
    for (let i = 0; i < shifts.length; i += 100){
      await this.commit("regs", shifts.slice(i, i + 100).map(shift => ({id:shift.id, fields:{status:"cancelled"}})));
    }
    this.deletingUid = user.uid;
    try {
      await this.fs.collection("users").doc(user.uid).delete();
      try {
        await user.delete();
        toast("Your sign-in and profile were deleted.");
      } catch (error) {
        await this.logout();
        toast("Your profile was deleted. Contact your site administrator to remove the remaining sign-in.", "bad");
      }
    } finally {
      this.deletingUid = null;
    }
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
      "auth/email-already-in-use":"Try signing in or requesting a password reset.",
      "auth/verification-cooldown":"Wait a minute between verification emails.",
      "auth/weak-password":"Choose a password that meets VolunteerHub's password policy.",
      "auth/password-does-not-meet-requirements":"Choose a password that meets VolunteerHub's password policy.",
      "auth/email-not-verified":"Your email is still unverified. Open the link in your inbox, then check again.",
      "auth/too-many-requests":"Too many tries. Wait at least 30 seconds before trying again.",
      "auth/network-request-failed":"You're offline. Check your internet connection and try again.",
      "auth/requires-recent-login":"For your security, log out, log back in, and then try again.",
      "permission-denied":"you don't have permission to do that.", "unavailable":"the database can't be reached right now.",
      "resource-exhausted":"VolunteerHub is busy. Try again in a moment.",
    };
    return map[code] || "VolunteerHub couldn't complete the request. Please try again.";
  },
  loadError(what, err){
    console.warn("Couldn't load", what, err?.code);
    if (err && err.code === "permission-denied") toast(`Couldn't load ${what}. The database rules may need updating (see SETUP-FIREBASE.md).`, "bad");
  },
  showSync(){
    const el = document.getElementById("sync-status");
    if (el && !this.loadPhase){ el.textContent = this.online ? "Connected" : "Offline: changes will sync when you reconnect"; el.className = `pill ${this.online ? "good" : "warn"}`; }
  },
};
