"use strict";

const {createHash, randomUUID} = require("node:crypto");

// A Gmail draft can be sent only once. Persist its ID before sending so a
// timeout, a restarted job, or a second invocation can retry the same draft.
async function checkMember({ledger, key, behind, mailbox, makeMessage, context = {}, now = Date.now}){
  const lease = randomUUID();
  const claim = await ledger.change(key, previous => {
    if (previous?.leaseUntil > now()) return {result:"busy"};
    if (!behind) return {write:null, result:"onTrack"};
    if (previous?.status === "sent") return {result:"alreadySent"};
    if (previous?.status === "review" || (previous?.draft && previous.mailbox !== mailbox.id))
      return {result:"review"};
    return {write:{...context, status:"pending", draft:previous?.draft || null, mailbox:mailbox.id,
      route:previous?.route || null, lease, leaseUntil:now() + 10 * 60 * 1000}, result:{draft:previous?.draft, route:previous?.route}};
  });
  if (typeof claim === "string") return claim;
  const update = fields => ledger.change(key, entry => entry?.lease === lease ?
    {write:{...entry, ...fields}, result:true} : {result:false});
  try {
    let draft = claim.draft;
    const message = await makeMessage();
    if (!message){ await update({leaseUntil:0}); return "missingRecipient"; }
    const route = createHash("sha256").update(JSON.stringify([message.volunteer, message.supervisor])).digest("hex");
    if (draft && claim.route !== route){
      await update({status:"review", leaseUntil:0});
      return "review";
    }
    if (!draft){
      draft = await mailbox.createDraft(message);
      if (!await update({draft, route})) return "busy";
    }
    try { await mailbox.sendDraft(draft); }
    catch (error){
      // Gmail removes sent drafts. A missing draft may also have been manually
      // deleted. Flag it for reconciliation without issuing a replacement.
      if (error.status !== 404) throw error;
      await update({status:"review", leaseUntil:0});
      return "review";
    }
    await update({status:"sent", leaseUntil:0});
    return "sent";
  } catch (error){
    await update({leaseUntil:0});
    throw error;
  }
}

function rawMessage({sender, volunteer, supervisor, subject, body}){
  const address = /^[^\s<>@,;:"]+@[^\s<>@,;:"]+\.[^\s<>@,;:"]+$/;
  if (![sender, volunteer, supervisor].every(v => typeof v === "string" && address.test(v))) throw new Error("Invalid recipient");
  const fields = ["From: " + sender, "To: " + volunteer];
  if (volunteer.toLowerCase() !== supervisor.toLowerCase()) fields.push("Bcc: " + supervisor);
  fields.push("Subject: =?UTF-8?B?" + Buffer.from(subject).toString("base64") + "?=",
    "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64",
    "", (Buffer.from(body).toString("base64").match(/.{1,76}/g) || []).join("\r\n"));
  return Buffer.from(fields.join("\r\n")).toString("base64url");
}

function gmailMailbox(id, accessToken, request = fetch){
  async function post(path, data){
    const response = await request("https://gmail.googleapis.com/gmail/v1/users/me/" + path, {
      method:"POST", signal:AbortSignal.timeout(20000),
      headers:{Authorization:"Bearer " + accessToken, "Content-Type":"application/json"}, body:JSON.stringify(data)
    });
    if (!response.ok) throw Object.assign(new Error("Gmail request failed"), {status:response.status});
    return response.json();
  }
  return {id,
    async createDraft(message){
      const draft = await post("drafts", {message:{raw:rawMessage(message)}});
      if (!draft.id) throw new Error("Gmail did not return a draft ID");
      return draft.id;
    },
    sendDraft:id => post("drafts/send", {id})
  };
}

module.exports = {checkMember, gmailMailbox, rawMessage};
