/*
 * views/organizers.js
 * Site admins only: review new coordinator accounts and verify the real ones.
 * Verified organizers get the "Verified organizer" badge on their listings, can see
 * volunteer contact details, post announcements, and change organization settings.
 */
"use strict";

function cOrganizers(u){
  if (!u.admin) return `<h1>Organizers</h1><div class="empty">Only site admins can verify organizers.</div>`;
  const coords = state.users.filter(x => x.role === "coordinator").sort((a, b) => (a.verified === b.verified ? a.name.localeCompare(b.name) : a.verified ? 1 : -1));
  const posted = id => state.events.filter(e => e.postedBy === id).length;
  return `<div class="head"><div><h1>Organizers</h1><p class="muted">Check that each coordinator really works with the organization they name before you verify them.</p></div></div>
  <section class="card stack" style="max-width:820px">
    <h2>Before you verify someone</h2>
    <ol class="muted" style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px">
      <li>Call the organization at a phone number you find yourself (not one they gave you) and confirm the person works there.</li>
      <li>Check that the organization is a real nonprofit, for example on the IRS Tax Exempt Organization Search.</li>
      <li>Look at the events they've posted. Real listings never ask volunteers for money, bank details, or ID numbers.</li>
    </ol>
  </section>
  <div class="tablewrap"><table><thead><tr><th>Organizer</th><th>Organization</th><th>Contact</th><th class="num">Events</th><th>Status</th><th class="num">Action</th></tr></thead><tbody>
  ${coords.length ? coords.map(c => `<tr>
    <td><b>${esc(c.name)}</b>${c.admin ? ` <span class="pill accent">Site admin</span>` : ""}</td>
    <td>${esc(c.org || state.org.name)}</td>
    <td class="small">${esc(c.email)}${c.phone ? `<span class="sub">${esc(c.phone)}</span>` : ""}</td>
    <td class="num">${posted(c.id)}</td>
    <td>${c.verified ? `<span class="pill good">Verified${c.verifiedAt ? ` ${fmtDate(c.verifiedAt, {month:"short", day:"numeric"})}` : ""}</span>` : `<span class="pill warn">Waiting</span>`}</td>
    <td><div class="actions">${c.id === u.id ? `<span class="muted small">You</span>` : c.verified ? armBtn(`unverify:${c.id}`, "Remove", "Confirm remove", "secondary sm") : armBtn(`verify:${c.id}`, "Verify", "Confirm verify", "sm")}</div></td>
  </tr>`).join("") : `<tr><td colspan="6" class="muted">No organizer accounts yet.</td></tr>`}
  </tbody></table></div>`;
}
