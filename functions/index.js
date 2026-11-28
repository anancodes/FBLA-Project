"use strict";

const {createHash, randomBytes} = require("node:crypto");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");
const {defineSecret, defineString, projectID} = require("firebase-functions/params");
const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {OAuth2Client} = require("google-auth-library");
const {gmailMailbox} = require("./delivery");
const {runChecks} = require("./worker");
const {timeZone} = require("./pace.cjs");

initializeApp();
const db = getFirestore();
const clientId = defineString("GMAIL_CLIENT_ID");
const clientSecret = defineSecret("GMAIL_CLIENT_SECRET");
const site = defineString("VOLUNTEERHUB_URL", {default:"https://anancodes.github.io/FBLA-Project/volunteerhub-web/vh-web/"});
const region = "us-central1";
const gmailScope = "https://www.googleapis.com/auth/gmail.compose";
const credentials = db.doc("mailPrivate/gmail");
const attempt = db.doc("mailPrivate/consent");
const lastCheck = db.doc("mailPrivate/lastCheck");
const digest = str => createHash("sha256").update(str).digest("hex");
const errorWith = status => Object.assign(new Error("Connector request failed"), {status});
const oauth = () => new OAuth2Client(clientId.value(), clientSecret.value(),
  "https://" + region + "-" + projectID.value() + ".cloudfunctions.net/gmailConnector/callback");

async function admin(uid){
  const user = await db.doc("users/" + uid).get();
  if (user.data()?.admin !== true) throw errorWith(403);
}
async function adminFromRequest(req){
  const bearer = (req.get("authorization") || "").match(/^Bearer (\S+)$/);
  if (!bearer) throw errorWith(401);
  let token;
  try { token = await getAuth().verifyIdToken(bearer[1], true); }
  catch { throw errorWith(401); }
  if (!token.email_verified) throw errorWith(403);
  await admin(token.uid);
  return token.uid;
}
async function startConsent(uid){
  const state = randomBytes(32).toString("hex");
  await attempt.set({hash:digest(state), uid, expires:Date.now() + 600000, used:false});
  return oauth().generateAuthUrl({access_type:"offline", prompt:"consent select_account",
    scope:["openid", "email", gmailScope], state});
}
async function completeConsent(code, state){
  if (typeof code !== "string" || typeof state !== "string" || !/^[a-f0-9]{64}$/.test(state)) throw errorWith(400);
  const hash = digest(state);
  const uid = await db.runTransaction(async tx => {
    const current = (await tx.get(attempt)).data();
    if (!current || current.used || current.expires < Date.now() || current.hash !== hash) throw errorWith(400);
    tx.update(attempt, {used:true});
    return current.uid;
  });
  await admin(uid);
  const client = oauth(), {tokens} = await client.getToken(code);
  if (!tokens.refresh_token || !tokens.id_token || !tokens.scope?.split(" ").includes(gmailScope)) throw errorWith(400);
  const ticket = await client.verifyIdToken({idToken:tokens.id_token, audience:clientId.value()});
  const account = ticket.getPayload();
  if (!account?.email_verified || !account.email || !account.sub) throw errorWith(400);
  // A disconnect or a new consent attempt invalidates an in-flight callback.
  await db.runTransaction(async tx => {
    const current = (await tx.get(attempt)).data();
    const profile = (await tx.get(db.doc("users/" + uid))).data();
    if (current?.hash !== hash || profile?.admin !== true) throw errorWith(403);
    tx.set(credentials, {mailbox:account.sub, sender:account.email, refresh:tokens.refresh_token, version:hash});
    tx.delete(attempt);
  });
}

exports.gmailConnector = onRequest({region, secrets:[clientSecret], maxInstances:3}, async (req, res) => {
  res.set({"Cache-Control":"no-store", "Referrer-Policy":"no-referrer", "X-Content-Type-Options":"nosniff"});
  const url = new URL(site.value()), path = req.path.replace(/\/$/, "");
  if (req.method === "GET" && path === "/callback"){
    let result = "connected";
    try {
      if (req.query.error) result = "cancelled";
      else await completeConsent(req.query.code, req.query.state);
    } catch { result = "failed"; }
    url.searchParams.set("gmail", result);
    url.hash = "settings";
    return res.redirect(303, url.href);
  }
  if (req.get("origin") !== url.origin) return res.sendStatus(403);
  res.set({"Access-Control-Allow-Origin":url.origin, "Vary":"Origin",
    "Access-Control-Allow-Methods":"POST, OPTIONS", "Access-Control-Allow-Headers":"Authorization, Content-Type"});
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.sendStatus(405);
  try {
    const uid = await adminFromRequest(req);
    if (path === "/connect") return res.json({url:await startConsent(uid)});
    if (path === "/status"){
      const [account, last] = await Promise.all([credentials.get(), lastCheck.get()]);
      return res.json({connected:account.exists, sender:account.get("sender") || null, last:last.data() || null});
    }
    if (path === "/disconnect"){
      const refresh = await db.runTransaction(async tx => {
        const current = await tx.get(credentials);
        tx.delete(credentials); tx.delete(attempt);
        return current.get("refresh");
      });
      if (refresh) await oauth().revokeToken(refresh).catch(() => {});
      return res.json({connected:false});
    }
    return res.sendStatus(404);
  } catch (err){ return res.status([400,401,403].includes(err.status) ? err.status : 503).json({error:"Gmail connector unavailable"}); }
});

exports.checkServiceHours = onSchedule({region, secrets:[clientSecret], schedule:"0 9 * * *", timeZone,
  timeoutSeconds:540, maxInstances:1, concurrency:1, retryCount:3, minBackoffSeconds:120}, async () => {
  const account = (await credentials.get()).data();
  if (!account) return;
  const at = new Date().toISOString();
  try {
    const client = oauth();
    client.setCredentials({refresh_token:account.refresh});
    const {token} = await client.getAccessToken();
    const mailbox = gmailMailbox(account.mailbox, token);
    // Confirm the sending account still has permission immediately before each send.
    const sendDraft = mailbox.sendDraft;
    mailbox.sendDraft = async id => {
      if ((await credentials.get()).get("version") !== account.version) throw errorWith(403);
      return sendDraft(id);
    };
    const results = await runChecks({db, auth:getAuth(), mailbox, sender:account.sender, site:site.value()});
    await lastCheck.set({at, ...results});
    if (results.failed || results.busy) throw errorWith(503);
  } catch (err){
    if (err.status !== 503) await lastCheck.set({at, error:"Check failed. Check the Gmail connection and job logs."});
    throw new Error("Hour alert check requires a retry");
  }
});
