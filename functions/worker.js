"use strict";

const {createHash} = require("node:crypto");
const Pace = require("./pace.cjs");
const {checkMember} = require("./delivery");
const records = snap => snap.docs.map(d => d.data());
function batches(list, size){
  const parts = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
}
function firestoreLedger(db){
  return {change(key, change){
    const ref = db.collection("hourAlertLedger").doc(key);
    return db.runTransaction(async tx => {
      const old = await tx.get(ref), next = change(old.data());
      if (next.write) tx.set(ref, next.write);
      else if (next.write === null && old.exists) tx.delete(ref);
      return next.result;
    });
  }};
}

async function runChecks({db, auth, mailbox, sender, site, date = Pace.today()}){
  const counts = {checked:0, sent:0, review:0, missingRecipient:0, failed:0, busy:0};
  const ledger = firestoreLedger(db);
  const clubs = records(await db.collection("clubs").where("req.emailAlerts", "==", true).get());
  for (const club of clubs){
    if (!club.req || date < club.req.start || date > club.req.end) continue;
    const forClub = coll => db.collection(coll).where("clubId", "==", club.id).get().then(records);
    const [members, events, logs] = await Promise.all([forClub("memberships"), forClub("events"), forClub("hourLogs")]);
    const eventIds = events.filter(e => e.date >= club.req.start && e.date <= date).map(e => e.id);
    const regs = [];
    for (const ids of batches(eventIds, 30)){
      regs.push(...records(await db.collection("regs").where("eventId", "in", ids).get()));
    }
    const totals = Pace.totals(club, events, regs, logs, date);
    const adviser = members.find(m => m.userId === club.createdBy && m.role === "adviser");
    const volunteers = members.filter(m => ["member", "officer"].includes(m.role));
    // Use verified sign-in addresses. Free-form contacts on individual hour
    // logs supervise a particular shift and do not receive the student's term record.
    const addresses = new Map();
    const uids = [...new Set([club.createdBy, ...volunteers.map(m => m.userId)])];
    for (const ids of batches(uids, 100)){
      const result = await auth.getUsers(ids.map(uid => ({uid})));
      for (const user of result.users) if (user.emailVerified && !user.disabled) addresses.set(user.uid, user.email);
    }
    for (const member of volunteers){
      const hours = totals.get(member.userId), earned = hours ? hours.eventHours + hours.approved : 0;
      const pace = Pace.progress(club.req, earned, date);
      const key = createHash("sha256").update(JSON.stringify([club.id, member.userId, club.req.start, club.req.end])).digest("hex");
      counts.checked++;
      try {
        const result = await checkMember({ledger, key, behind:pace.behind, mailbox,
          context:{clubId:club.id, userId:member.userId, termStart:club.req.start, termEnd:club.req.end}, makeMessage:() => {
          const volunteer = addresses.get(member.userId), supervisor = adviser && addresses.get(adviser.userId);
          return volunteer && supervisor ? {sender, volunteer, supervisor, ...Pace.message(club, member.name, earned, pace, site)} : null;
        }});
        if (Object.hasOwn(counts, result)) counts[result]++;
      } catch { counts.failed++; } // Keep unrelated clubs and members moving; the scheduler retries after the run.
    }
  }
  return counts;
}
module.exports = {runChecks, firestoreLedger};
