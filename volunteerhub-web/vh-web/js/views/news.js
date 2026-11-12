/* Inbox uses one chronological reading list for announcements and personal updates. */
"use strict";

function reach(a){
  if (a.audience === "all") return state.users.filter(u => u.role === "volunteer").length;
  return new Set([...activeRegs(+a.audience),...waitlistFor(+a.audience)].map(r => r.userId)).size;
}
function audienceLabel(a){
  if (a.audience === "all") return "All volunteers";
  const e = eventById(+a.audience);
  return e ? `Volunteers for ${e.title} (${fmtDate(e.date,{month:"short",day:"numeric"})})` : "Volunteers for a deleted event";
}
const postedAt = at => new Date(at).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
function inboxMessage(m){
  return `<details class="message${m.unread ? " unread" : ""}" id="message-${esc(m.key)}">
    <summary><span class="message-sender">${esc(m.sender)}</span><span class="message-subject">${m.unread ? `<span class="unread-dot" aria-hidden="true"></span><span class="sr-only">New: </span>` : ""}<strong>${esc(m.title)}</strong><span class="message-preview">${esc(m.body)}</span></span><time datetime="${esc(m.at)}">${postedAt(m.at)}</time></summary>
    <div class="message-content"><p class="message-body">${esc(m.body)}</p>${m.audience ? `<p class="muted small">To ${esc(m.audience)}</p>` : ""}${m.actions || ""}</div>
  </details>`;
}
function newsView(u){ return u.role === "coordinator" ? cNews(u) : vNews(u); }
function vNews(u){
  const seen = ui.newsSeen || readSet(u.id);
  const messages = announcementsFor(u).map(a => ({key:`announcement-${a.id}`,title:a.title,body:a.body,at:a.at,sender:userById(a.authorId).name,audience:audienceLabel(a),unread:!seen.has(a.id)}))
    .concat(noticesFor(u.id).map(n => ({key:`update-${n.id}`,title:"Shift update",body:n.text,at:n.at,sender:"VolunteerHub",unread:!!ui.newNotices && ui.newNotices.has(n.id)})))
    .sort((a,b) => b.at.localeCompare(a.at));
  return `<div class="head"><div><h1>Inbox</h1><p class="muted">Announcements and updates, all in one place.</p></div><span class="muted small">${messages.length} ${messages.length === 1 ? "message" : "messages"}</span></div>
    <section class="message-list" aria-label="Messages">${messages.length ? messages.map(inboxMessage).join("") : `<div class="empty">You're all caught up. Updates about shifts and club hours will appear here.</div>`}</section>`;
}
function cNews(u){
  const upcoming = state.events.filter(e => e.date >= TODAY).sort(byDate), list = announcementsFor(u);
  return `<div class="head"><div><h1>Inbox</h1><p class="muted">Share updates with your volunteers.</p></div></div>
  <details class="compose disclosure" id="inbox-compose"><summary>New announcement</summary>
    <form id="annForm" class="stack" novalidate>
      <div class="field"><label for="an-title">Headline</label><input id="an-title" name="title" maxlength="80" placeholder="e.g. Parking change for Saturday"><span class="ferr" id="e-title"></span></div>
      <div class="field"><label for="an-body">Message</label><textarea id="an-body" name="body" rows="4" maxlength="600" placeholder="What do volunteers need to know?"></textarea><span class="ferr" id="e-body"></span></div>
      <div class="field"><label for="an-aud">Send to</label><select id="an-aud" name="audience"><option value="all">All volunteers</option>${upcoming.map(e => `<option value="${e.id}">Volunteers for ${esc(e.title)} (${fmtDate(e.date)})</option>`).join("")}</select></div>
      <div><button class="btn" type="submit">Post announcement</button></div>
    </form>
  </details>
  <section class="message-list" aria-label="Posted announcements">${list.length ? list.map(a => inboxMessage({key:`announcement-${a.id}`,title:a.title,body:a.body,at:a.at,sender:userById(a.authorId).name,audience:audienceLabel(a),actions:`<div class="spread"><span class="muted small">Reaches ${reach(a)} ${reach(a) === 1 ? "volunteer" : "volunteers"}</span>${armBtn(`ann:${a.id}`,"Delete","Confirm delete")}</div>`})).join("") : `<div class="empty">No announcements yet. Write one using New announcement.</div>`}</section>`;
}
