/*
 * db.js
 * The one place where saved data changes. Every screen calls DB.add / DB.update /
 * DB.remove instead of editing `state` directly.
 *
 *   Demo mode: changes stay in this browser (localStorage), using sample data.
 *   Live mode: changes are also sent to the Firebase database (see cloud.js), and
 *              changes made on other people's devices flow back in automatically.
 *
 * Changes are applied to `state` right away so the screen updates instantly
 * ("optimistic update"). If the database refuses a change, Firebase sends the
 * real data back and the screen corrects itself.
 */
"use strict";

const DB = {
  live: false,      // true while signed in to the real database

  // Unique ids: small counting numbers in demo mode; time-based numbers in live
  // mode so two people creating things at the same moment never collide.
  newId(coll){
    return this.live ? Date.now() * 100 + Math.floor(Math.random() * 100) : nid(state[coll]);
  },
  add(coll, obj){
    state[coll].push(obj);
    if (this.live) Cloud.set(coll, obj);
    return obj;
  },
  update(coll, obj, fields){
    Object.assign(obj, fields);
    if (this.live) Cloud.update(coll, obj.id, fields);
    return obj;
  },
  remove(coll, id){
    state[coll] = state[coll].filter(x => x.id !== id);
    if (this.live) Cloud.remove(coll, id);
  },
  setOrg(org){
    state.org = org;
    if (this.live) Cloud.setOrg(org);
  },

  /* Permission checks that mirror the database's security rules (firestore.rules),
     so the app doesn't try something the database will refuse. */
  isVerifiedCoordinator(u = currentUser()){ return !!u && u.role === "coordinator" && (u.verified || u.admin); },
  canManageReg(r){
    const u = currentUser();
    if (!this.live) return true;
    const e = eventById(r.eventId);
    return r.userId === u.id || this.isVerifiedCoordinator(u) || (u.role === "coordinator" && !!e && e.postedBy === u.id);
  },
  canNotify(userId){
    const u = currentUser();
    return !this.live || userId === u.id || this.isVerifiedCoordinator(u);
  },
};
