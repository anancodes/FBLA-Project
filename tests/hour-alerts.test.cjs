const test = require("node:test");
const assert = require("node:assert/strict");
const Pace = require("../volunteerhub-web/vh-web/js/pace");
const {gmailMailbox, checkMember, rawMessage} = require("../functions/delivery");
const club = {id:1, name:"Service Club", short:"SC", req:{label:"Fall", start:"2026-11-01", end:"2026-11-21", hours:20}};
const message = {sender:"sender@example.org", volunteer:"volunteer@example.org", supervisor:"adviser@example.org",
  ...Pace.message(club, "Maya", 8, Pace.progress(club.req, 8, "2026-11-11"), "https://example.org/#clubs")};

test("pace includes equality, respects term boundaries, small goals and Central dates", () => {
  const progress = (earned,date,extra) => Pace.progress({...club.req,...extra},earned,date);
  assert.equal(progress(8,"2026-11-11").behind,true);
  assert.equal(progress(8.25,"2026-11-11").behind,false);
  assert.equal(progress(8,"2026-11-11",{alertGap:2.25}).behind,false);
  assert.equal(progress(0,"2026-10-31").behind,false);
  assert.equal(progress(0,"2026-11-01").expected,0);
  assert.equal(progress(18,"2026-11-21").behind,true);
  assert.equal(progress(20,"2026-11-21").status,"Complete");
  assert.equal(progress(0,"2026-11-22").status,"Term ended");
  assert.equal(progress(0,"2026-11-21",{hours:.5}).threshold,.5);
  assert.equal(Pace.progress(null,0).behind,false);
  assert.equal(progress(0,"2026-11-11",{start:"2026-02-30"}).behind,false);
  assert.equal(Pace.today(new Date("2026-11-11T03:00:00Z")),"2026-11-10");
});
test("only attended club shifts and approved in-term logs contribute to the shortfall", () => {
  const events = [[1,1,"2026-11-02"],[2,2,"2026-11-02"],[3,1,"2026-10-31"],[4,1,"2026-11-20"]].map(([id,clubId,date])=>({id,clubId,date}));
  const regs = [1,2,3,4].map(eventId=>({eventId,userId:"u",status:"attended",hours:1.25}));
  regs.push({eventId:1,userId:"u",status:"registered",hours:4});
  const logs = ["approved","pending","rejected"].map(status=>({clubId:1,userId:"u",date:"2026-11-05",status,hours:2}));
  assert.deepEqual(Pace.totals(club,events,regs,logs,"2026-11-11").get("u"),{eventHours:1.25, approved:2, pending:2});
});
function fixture(){
  const entries = new Map(), available = new Set(), calls = [];
  const ledger = {async change(key, fn){
    const next = fn(entries.get(key));
    if (next.write === null) entries.delete(key); else if (next.write) entries.set(key,next.write);
    return next.result;
  }};
  const mailbox = {id:"sender", async createDraft(){ const id = "draft-" + calls.length; calls.push("create"); available.add(id); return id; },
    async sendDraft(id){ if (!available.delete(id)) throw Object.assign(new Error(),{status:404}); calls.push("send"); }};
  return {mailbox,calls,run:(overrides={})=>checkMember({ledger,key:"member",behind:true,mailbox,makeMessage:()=>message,...overrides})};
}
test("concurrent checks send once; a later observed recovery rearms the next episode", async () => {
  const f = fixture();
  assert.deepEqual((await Promise.all([f.run(),f.run()])).sort(),["busy","sent"]);
  assert.equal(await f.run(),"alreadySent");
  assert.equal(await f.run({behind:false}),"onTrack");
  assert.equal(await f.run(),"sent");
  assert.deepEqual(f.calls,["create","send","create","send"]);
});
test("a temporary Gmail failure retries the persisted draft", async () => {
  const f=fixture(), send=f.mailbox.sendDraft;
  f.mailbox.sendDraft=async()=>{throw new Error("timeout");};
  await assert.rejects(f.run());
  f.mailbox.sendDraft=send;
  assert.equal(await f.run(),"sent");assert.deepEqual(f.calls,["create","send"]);
});
test("a lost acknowledgement flags a missing draft without sending a replacement",async()=>{
  const f=fixture(), send=f.mailbox.sendDraft;
  f.mailbox.sendDraft=async id=>{await send(id);throw new Error("response lost");};
  await assert.rejects(f.run());f.mailbox.sendDraft=send;
  assert.equal(await f.run(),"review");assert.equal(await f.run(),"review");
  assert.deepEqual(f.calls,["create","send"]);
});
test("both recipients are required, including when resuming an existing draft",async()=>{
  const f=fixture(), send=f.mailbox.sendDraft;
  assert.equal(await f.run({makeMessage:()=>null}),"missingRecipient");
  assert.deepEqual(f.calls,[]);
  f.mailbox.sendDraft=async()=>{throw new Error("timeout");};await assert.rejects(f.run());
  f.mailbox.sendDraft=send;
  assert.equal(await f.run({makeMessage:()=>({...message,supervisor:"new@example.org"})}),"review");
  assert.deepEqual(f.calls,["create"]);
});
test("Gmail transport sends a UTF-8 draft to the volunteer with a private adviser copy",async()=>{
  const calls=[];
  const api=gmailMailbox("id","test-access",async(url,options)=>{
    calls.push([url,JSON.parse(options.body)]);
    return {ok:true,json:async()=>({id:"id1"})};
  });
  const draft=await api.createDraft(message);await api.sendDraft(draft);
  const wire=Buffer.from(calls[0][1].message.raw,"base64url").toString();
  assert.match(wire,/To: volunteer@example.org\r\nBcc: adviser@example.org\r\n/);
  assert.match(Buffer.from(wire.split("\r\n\r\n")[1],"base64").toString(),/2 hours behind pace/);
  assert.match(calls[1][0],/drafts\/send$/);assert.deepEqual(calls[1][1],{id:"id1"});
  assert.throws(()=>rawMessage({...message,supervisor:"x@example.org\r\nBcc: other@example.org"}));
});
