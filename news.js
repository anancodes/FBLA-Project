/*
 * views/news.js
 * Announcements screen.
 * Coordinators write announcements for everyone or for the people signed up for one event.
 * Volunteers read the announcements meant for them, plus personal updates
 * (for example, "A spot opened up and you're now signed up").
 */
"use strict";

// How many volunteers an announcement reaches.
function reach(a){
  if (a.audience === "all") return state.users.filter(u => u.role === "volunteer").length;
  return new Set([...activeRegs(+a.audience), ...waitlistFor(+a.audience)].map(r => r.userId)).size;
}
function audienceLabel(a){
  if (a.audience === "all") return "All volunteers";
  const e = eventById(+a.audience);
  return e ? `Volunteers for ${e.title} (${fmtDate(e.date, {month:"short", day:"numeric"})})` : "Volunteers for a deleted event";
}
const postedAt = iso => new Date(iso).toLocaleDateString("en-US", {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"});

function newsView(u){
  return u.role === "coordinator" ? cNews(u) : vNews(u);
}

function vNews(u){
  const seen = ui.newsSeen || readSet(u.id);           // captured before this visit marked things read
  const list = announcementsFor(u), notes = noticesFor(u.id);
  return `<div class="head"><div><h1>Announcements</h1><p class="muted">News from your coordinators and updates about your shifts.</p></div></div>
  ${notes.length ? `<section class="card"><h2>Your updates</h2>${notes.map(n => `<div class="ann-mini">${ui.newNotices && ui.newNotices.has(n.id) ? `<span class="pill mark">New</span>` : ""}<div><b>${esc(n.text)}</b><p class="muted small">${postedAt(n.at)}</p></div></div>`).join("")}</section>` : ""}
  <section class="stack">
    ${list.length ? list.map(a => `<article class="card ann">
      <div class="spread"><div class="row">${seen.has(a.id) ? "" : `<span class="pill mark">New</span>`}<h2>${esc(a.title)}</h2></div><span class="muted small">${postedAt(a.at)}</span></div>
      <p>${esc(a.body)}</p>
      <p class="muted small">From ${esc((userById(a.authorId) || {name:"Coordinator"}).name)} · To ${esc(audienceLabel(a))}</p></article>`).join("")
      : `<div class="empty">No announcements yet.</div>`}
  </section>`;
}

function cNews(u){
  const list = announcementsFor(u);
  const upcoming = state.events.filter(e => e.date >= TODAY).sort(byDate);
  return `<div class="head"><div><h1>Announcements</h1><p class="muted">Share news with all volunteers, or only with the people signed up for one event.</p></div></div>
  <form id="annForm" class="card stack" novalidate style="max-width:760px">
    <h2>New announcement</h2>
    <div class="field"><label for="an-title">Headline</label><input id="an-title" name="title" maxlength="80" placeholder="e.g. Parking change for Saturday"><span class="ferr" id="e-title"></span></div>
    <div class="field"><label for="an-body">Message</label><textarea id="an-body" name="body" rows="4" maxlength="600" placeholder="What do volunteers need to know?"></textarea><span class="ferr" id="e-body"></span></div>
    <div class="field"><label for="an-aud">Send to</label><select id="an-aud" name="audience"><option value="all">All volunteers</option>${upcoming.map(e => `<option value="${e.id}">Volunteers for ${esc(e.title)} (${fmtDate(e.date)})</option>`).join("")}</select></div>
    <div class="row"><button class="btn" type="submit">Post announcement</button></div>
  </form>
  <section class="stack"><h2>Posted (${list.length})</h2>
    ${list.length ? list.map(a => `<article class="card ann">
      <div class="spread"><h2>${esc(a.title)}</h2>${armBtn(`ann:${a.id}`, "Delete", "Confirm delete")}</div>
      <p>${esc(a.body)}</p>
      <p class="muted small">${postedAt(a.at)} · To ${esc(audienceLabel(a))} · Reaches ${reach(a)} ${reach(a) === 1 ? "volunteer" : "volunteers"}</p></article>`).join("")
      : `<div class="empty">You haven't posted anything yet.</div>`}
  </section>`;
}
