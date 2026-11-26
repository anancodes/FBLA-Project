/* The shared inbox presents announcements and personal updates in reading order. */
"use strict";

function reach(a){
  if (Array.isArray(a.recipientIds) && a.audience !== "all") return a.recipientIds.length;
  if (a.audience === "all") return state.users.filter(u => u.role === "volunteer").length;
  return new Set([...activeRegs(+a.audience), ...waitlistFor(+a.audience)].map(r => r.userId)).size;
}

function audienceLabel(a){
  if (a.audience === "all") return "All volunteers";
  const e = eventById(+a.audience);
  return e ? `Volunteers for ${e.title} (${fmtDate(e.date, {month:"short", day:"numeric"})})` : "Volunteers for a deleted event";
}

function announcementMessage(a){
  return {key:`announcement-${a.id}`, title:a.title, body:a.body, at:a.at, sender:userById(a.authorId).name,
    audience:audienceLabel(a), icon:"megaphone"};
}

function inboxMessage(m){
  const date = new Date(m.at);
  const day = date.toLocaleDateString("en-US", {month:"short", day:"numeric"});
  const time = date.toLocaleTimeString("en-US", {hour:"numeric", minute:"2-digit"});
  return `<details class="message${m.unread ? " unread" : ""}" id="message-${esc(m.key)}">
    <summary>
      <span class="message-icon">${icon(m.icon)}</span>
      <span class="message-subject">
        <strong>${m.unread ? '<span class="unread-dot" aria-hidden="true"></span><span class="sr-only">New: </span>' : ""}${esc(m.title)}</strong>
        <span class="message-meta"><span class="message-sender">${esc(m.sender)}</span><span class="message-preview">${esc(m.body)}</span></span>
      </span>
      <time datetime="${esc(m.at)}"><span>${esc(day)}</span><span class="message-time">${esc(time)}</span></time>
      ${icon("chevron", "message-chevron")}
    </summary>
    <div class="message-content">
      <p class="message-body">${esc(m.body)}</p>
      ${m.audience ? `<p class="message-audience">To ${esc(m.audience)}</p>` : ""}
      ${m.actions || ""}
    </div>
  </details>`;
}

function inboxList(messages, heading, itemName, empty){
  return `<section class="inbox-list" aria-labelledby="inbox-list-title">
    <div class="inbox-list-head"><h2 id="inbox-list-title">${heading}</h2>
      <span>${messages.length} ${itemName}${messages.length === 1 ? "" : "s"}</span></div>
    <div class="message-list">${messages.length ? messages.map(inboxMessage).join("") : `<p class="empty inbox-empty">${empty}</p>`}</div>
  </section>`;
}

function newsView(u){
  const canPost = u.role === "coordinator" && (!DB.live || DB.isVerifiedCoordinator(u));
  return `<div class="inbox">
    <header class="inbox-head">
      <div><h1>Inbox</h1><p>${canPost ? "Send updates to volunteers and revisit past announcements." : "Announcements, shift changes, and club updates."}</p></div>
      ${canPost ? `<button class="btn" type="button" id="inbox-compose" data-act="composeAnnouncement" aria-haspopup="dialog">${icon("edit")}New announcement</button>` : ""}
    </header>
    ${canPost ? coordinatorInbox(u) : volunteerInbox(u)}
  </div>`;
}

function volunteerInbox(u){
  const seen = ui.newsSeen || readSet(u.id);
  const messages = announcementsFor(u).map(a => ({...announcementMessage(a), unread:!seen.has(a.id)}))
    .concat(noticesFor(u.id).map(n => ({key:`update-${n.id}`, title:"Shift update", body:n.text, at:n.at,
      sender:"VolunteerHub", icon:"calendar", unread:!!ui.newNotices?.has(n.id)})))
    .sort((a,b) => b.at.localeCompare(a.at));
  return inboxList(messages, "Messages", "message", "You're all caught up. Updates about shifts and club hours will appear here.");
}

function coordinatorInbox(u){
  const messages = announcementsFor(u).map(a => {
    const total = reach(a);
    return {...announcementMessage(a), actions:`<div class="message-actions">
      <span>Reaches ${total} ${total === 1 ? "volunteer" : "volunteers"}</span>
      ${armBtn(`ann:${a.id}`, "Delete", "Confirm delete")}
    </div>`};
  });
  return inboxList(messages, "Posted announcements", "announcement", "Your announcements will appear here after you post them.");
}

function announcementForm(){
  const upcoming = state.events.filter(e => e.date >= TODAY).sort(byDate);
  return `<form id="annForm" class="announcement-form" novalidate>
    <h2>New announcement</h2>
    <div class="announcement-audience field">
      <label for="an-aud">Send to</label>
      <select id="an-aud" name="audience">
        <option value="all">All volunteers</option>
        ${upcoming.map(e => `<option value="${esc(e.id)}">Volunteers for ${esc(e.title)} (${fmtDate(e.date)})</option>`).join("")}
      </select>
    </div>
    <div class="field">
      <label for="an-title">Headline</label>
      <input id="an-title" name="title" maxlength="100" placeholder="e.g. Parking change for Saturday" aria-describedby="e-title">
      <span class="ferr" id="e-title"></span>
    </div>
    <div class="field">
      <label for="an-body">Message</label>
      <textarea id="an-body" name="body" rows="5" maxlength="3000" placeholder="What do volunteers need to know?" aria-describedby="e-body"></textarea>
      <span class="ferr" id="e-body"></span>
    </div>
    <div class="announcement-actions">
      <button class="btn secondary" type="button" data-act="close">Cancel</button>
      <button class="btn" type="submit">Post announcement</button>
    </div>
  </form>`;
}
