const test = require("node:test");
const assert = require("node:assert/strict");
const {createRequire} = require("node:module");
if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || "")) throw Error("Run with the local Firestore emulator.");
process.env.GCLOUD_PROJECT = "demo-volunteerhub";
process.env.GMAIL_CLIENT_ID = "fixture.apps.googleusercontent.com";
process.env.GMAIL_CLIENT_SECRET = "local-fixture";
process.env.VOLUNTEERHUB_URL = "https://example.org/hub/";
const runtime = createRequire(require.resolve("../functions/package.json"));
const {gmailConnector} = require("../functions");
const {getFirestore} = runtime("firebase-admin/firestore");
const {getAuth} = runtime("firebase-admin/auth");
const {OAuth2Client} = runtime("google-auth-library");
const {runChecks} = require("../functions/worker");
const db = getFirestore();

test("scheduled worker reads Firestore, uses verified account addresses and re-arms on recovery",async t=>{
  const club = {id:78, name:"Garden Club", short:"GC", createdBy:"lead", req:{start:"2026-11-01",end:"2026-11-21",hours:20,label:"Fall",emailAlerts:true}};
  const seed = db.batch();
  Object.entries({
    "clubs/78":club,
    "memberships/78_lead":{clubId:78,userId:"lead",role:"adviser"},
    "memberships/78_member":{clubId:78,userId:"member",name:"Maya",role:"officer"},
    "memberships/78_unverified":{clubId:78,userId:"unverified",name:"Alex",role:"member"},
    "events/781":{id:781,clubId:78,date:"2026-11-03"},
    "regs/781_member":{eventId:781,userId:"member",hours:2,status:"attended"},
    "hourLogs/781":{clubId:78,userId:"member",date:"2026-11-03",hours:6,status:"approved"}
  }).forEach(([path,data])=>seed.set(db.doc(path),data));
  await seed.commit();
  t.after(()=>db.doc("clubs/78").delete());
  const sent=[], mailbox={id:"gmail-sub",createDraft:async m=>{sent.push(m);return "draft-"+sent.length;},sendDraft:async()=>({})};
  const auth={getUsers:async ids=>({users:ids.map(({uid})=>({uid,email:uid+"@example.org",emailVerified:uid!=="unverified"}))})};
  const run=date=>runChecks({db,auth,mailbox,sender:"sender@example.org",site:"https://example.org",date});
  const first=await run("2026-11-11");
  assert.equal(first.sent,1);assert.equal(first.missingRecipient,1);
  assert.equal(sent[0].volunteer,"member@example.org");assert.equal(sent[0].supervisor,"lead@example.org");
  assert.match(sent[0].body,/8 approved hours/);assert.equal((await run("2026-11-11")).sent,0);
  await db.doc("hourLogs/781").update({hours:9});
  assert.equal((await run("2026-11-12")).sent,0);
  assert.equal((await run("2026-11-15")).sent,1);
  assert.equal((await run("2026-11-22")).checked,0);
});

test("admin consent, callback replay, status and disconnect work through the HTTP entry point",async t=>{
  const app=runtime("express")();
  app.use("/gmailConnector",gmailConnector);
  const server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  await db.doc("users/mail-admin").set({admin:true});
  await db.doc("mailPrivate/gmail").delete();
  const url="http://127.0.0.1:"+server.address().port+"/gmailConnector";
  const post=(path,uid="mail-admin",origin="https://example.org")=>fetch(url+"/"+path,{method:"POST",headers:{origin,authorization:"Bearer "+uid}});
  t.mock.method(getAuth(),"verifyIdToken",async uid=>({uid,email_verified:true}));
  assert.equal((await post("status","member")).status,403);
  assert.equal((await post("connect","mail-admin","https://other.example.org")).status,403);
  assert.equal((await (await post("status")).json()).connected,false);
  const authUrl=new URL((await (await post("connect")).json()).url);
  assert.equal(authUrl.hostname,"accounts.google.com");assert.equal(authUrl.searchParams.get("access_type"),"offline");
  const state=authUrl.searchParams.get("state");
  t.mock.method(OAuth2Client.prototype,"getToken",async()=>({tokens:{scope:"https://www.googleapis.com/auth/gmail.compose",refresh_token:"fixture-only",id_token:"fixture-id"}}));
  t.mock.method(OAuth2Client.prototype,"verifyIdToken",async()=>({getPayload:()=>({email:"team@example.org",email_verified:true,sub:"sender"})}));
  t.mock.method(OAuth2Client.prototype,"revokeToken",async()=>({}));
  const callback=()=>fetch(url+"/callback?code=sample&state="+state,{redirect:"manual"});
  const result=await callback();assert.equal(result.status,303);assert.equal(result.headers.get("location"),"https://example.org/hub/?gmail=connected#settings");
  assert.match((await callback()).headers.get("location"),/gmail=failed/);
  const status=await (await post("status")).json();
  assert.equal(status.sender,"team@example.org");assert.ok(!JSON.stringify(status).includes("fixture-only"));
  assert.equal((await (await post("disconnect")).json()).connected,false);
  assert.equal((await db.doc("mailPrivate/gmail").get()).exists,false);
});
