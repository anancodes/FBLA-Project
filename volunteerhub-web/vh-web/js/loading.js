/* Loading feedback for Firebase reads and user-initiated writes. */
"use strict";

const LOADING_DELAY = 200;
const SLOW_LOADING_DELAY = 8000;
const LOAD_RECOVERY_DELAY = 15000;
const AUTH_RETRY_DELAY = 30000;

const pendingActions = new Map();
const originalButtons = new WeakMap();
let authRetryAt = 0;

function operationKey(button){
  if (!button) return null;
  if (button.dataset.operation) return button.dataset.operation;
  if (button.type === "submit" && button.form){
    const {id, dataset} = button.form;
    if (["loginForm", "signupForm", "resetForm", "completeProfileForm", "guestForm"].includes(id)) return "auth";
    if (id === "guestUpgradeForm") return "guest-upgrade";
    if (id === "joinForm") return "join-club";
    if (id === "clubForm" && !dataset.id) return "create-club";
    if (id === "deleteAccountForm") return "delete-account";
    if (id === "eventForm") return `event:${dataset.id || "new"}`;
    if (id === "walkinForm") return `attendance:${ui.ciEvent}`;
  }
  const {act, id} = button.dataset;
  if (act === "checkVerification" || act === "resendVerification") return "verify-email";
  if (act === "mark" || act === "allPresent") return `attendance:${ui.ciEvent}`;
  if (act === "signup" || act === "waitlist") return `shift:${id}`;
  if (act === "deleteEvent") return `event:${id}`;
  if (act === "cancelShift"){
    const reg = state.regs.find(r => String(r.id) === id);
    if (reg) return `shift:${reg.eventId}`;
  }
  return null;
}

function sessionActionKey(key){
  return key === "auth" ? key : `${state.session.userId}:${key}`;
}

function actionBlocked(button){
  const key = operationKey(button);
  return !!(key && (pendingActions.has(sessionActionKey(key)) ||
    (key === "auth" && Cloud.enabled && (!Cloud.ready || Cloud.loadPhase || Date.now() < authRetryAt))));
}

function syncPendingControls(){
  for (const button of document.querySelectorAll("#app button, #modal button, #action-confirmation button")){
    const key = operationKey(button);
    const original = originalButtons.get(button);
    if (!key && !original) continue;
    const pending = pendingActions.get(sessionActionKey(key));
    const trigger = pending?.trigger;
    const matches = trigger && (button.form ? button.form.id === trigger.form?.id
      : button.dataset.v === trigger.dataset.v && button.dataset.id === trigger.dataset.id &&
        (button.dataset.act === trigger.dataset.act || (button.dataset.act === "arm" && trigger.dataset.act === "confirm")));
    if (actionBlocked(button)){
      button.setAttribute("aria-disabled", "true");
      if (matches && pending.visible && !original){
        originalButtons.set(button, {html:button.innerHTML, label:button.getAttribute("aria-label")});
        button.textContent = pending.label;
        button.removeAttribute("aria-label");
        button.classList.add("action-pending");
      }
    } else {
      button.removeAttribute("aria-disabled");
      if (original){
        button.innerHTML = original.html;
        if (original.label !== null) button.setAttribute("aria-label", original.label);
        button.classList.remove("action-pending");
        originalButtons.delete(button);
      }
    }
  }
}

async function runPending(key, label, trigger, request, succeeded, failed){
  const actionKey = sessionActionKey(key);
  if (pendingActions.has(actionKey)) return false;
  const session = state.session.userId;
  const stillHere = () => (key === "auth" || session === state.session.userId);
  const pending = {label, trigger, visible:false};
  const confirmationStatus = trigger?.id === "confirm-action" ? $("#confirmation-status") : null;
  const status = confirmationStatus || $("#operation-status");
  pendingActions.set(actionKey, pending);
  syncPendingControls();
  const show = setTimeout(() => {
    pending.visible = true;
    if (!stillHere()) return;
    syncPendingControls();
    status.textContent = label;
  }, LOADING_DELAY);
  const slow = setTimeout(() => {
    if (!stillHere()) return;
    if (confirmationStatus){
      confirmationStatus.classList.remove("sr-only");
      confirmationStatus.textContent = "Still waiting for the server.";
    } else toast(`${label} Still waiting for confirmation.`);
  }, SLOW_LOADING_DELAY);
  try {
    await request();
  } catch (err) {
    if (key === "auth" && err?.code === "auth/too-many-requests"){
      authRetryAt = Date.now() + AUTH_RETRY_DELAY;
      setTimeout(syncPendingControls, AUTH_RETRY_DELAY);
    }
    if (stillHere()) failed(err);
    return false;
  } finally {
    clearTimeout(show);
    clearTimeout(slow);
    pendingActions.delete(actionKey);
    syncPendingControls();
    if (confirmationStatus || status.textContent === label) status.textContent = "";
    confirmationStatus?.classList.add("sr-only");
  }
  if (stillHere()) succeeded?.();
  return true;
}

function authFormError(id, field, err){
  const form = document.getElementById(id);
  if (!form) return;
  const message = Cloud.friendly(err);
  if (field) showErrors(form, {[field]:message});
  else form.querySelector(".formerr").textContent = message;
}

function retryLoadButton(){
  const coolingDown = Date.now() < Cloud.retryAt;
  return `<button class="btn secondary" data-act="retryLoad" ${coolingDown ? "disabled" : ""}>${coolingDown ? "Try again in a moment" : "Try again"}</button>`;
}

function loadAccountStatus(){
  if (!Cloud.loadPhase || Cloud.loadPhase === "workspace") return "";
  const profile = Cloud.loadPhase === "profile", failed = Cloud.loadStatus === "retry";
  const message = failed
    ? Cloud.loadDenied ? "We couldn't access your profile. Contact your VolunteerHub administrator."
      : profile ? "Your profile couldn't be opened. Check your connection and try again."
        : "Sign-in is unavailable. Check your connection and try again."
    : Cloud.loadStatus === "slow"
      ? profile ? "Your profile is taking longer to open. Check your connection." : "Connecting to sign-in is taking longer than usual."
      : profile ? "Opening your VolunteerHub profile…" : "Connecting to VolunteerHub sign-in…";
  return `<div class="load-account">
    <p class="load-status" ${Cloud.loadStatus === "starting" ? "hidden" : ""}>${message}</p>
    ${failed ? `<div class="row">${retryLoadButton()}` +
      (profile ? '<button class="linkbtn" data-act="cloudSignOut">Sign out</button>' : "") + '</div>' : ""}
  </div>`;
}

function workspaceLoading(u, title){
  const failed = Cloud.loadStatus === "retry";
  const subject = ({find:"volunteer opportunities", shifts:"your schedule", hours:"your service hours", clubs:"your clubs",
    news:"your inbox", events:"events", checkin:"the check-in roster", volunteers:"the volunteer directory", manage:"club records",
    organizers:"organizer records", reports:"report data", settings:"organization settings", profile:"your profile",
  })[ui.view] || (u.role === "volunteer" ? "your shifts and service hours" : "your events and volunteer records");
  const message = failed
    ? Cloud.loadDenied ? "VolunteerHub couldn't access these records. Contact your administrator for help."
      : `VolunteerHub couldn't load ${subject}. Check your connection and try again.`
    : Cloud.loadStatus === "slow" ? `Still loading ${subject}. Check your connection if the wait continues.`
      : `Loading ${subject}…`;
  return `<section class="workspace-load">
    <h1>${esc(title)}</h1>
    <p class="load-status" ${Cloud.loadStatus === "starting" ? "hidden" : ""}>${message}</p>
    ${failed ? retryLoadButton() : `<div class="load-skeleton" aria-hidden="true" ${Cloud.loadStatus === "starting" ? "hidden" : ""}>
      ${Array.from({length:3}, () => '<div class="load-skeleton-row"><span></span><div><span></span><span></span></div></div>').join("")}
    </div>`}
  </section>`;
}
