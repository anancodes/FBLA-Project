const test = require("node:test");
const assert = require("node:assert/strict");
const helper = require("./browser-helpers.cjs");
test.before(helper.start); test.after(helper.stop);

test("adviser previews both recipients and saves a threshold that survives refresh", async t => {
  const p = await helper.page(t,{viewport:{width:390,height:844}});
  await helper.signIn(p,1);
  await p.locator('.rail [data-v="settings"]').click();
  assert.match(await p.locator(".mail-panel").textContent(),/Preview only/);
  await p.getByRole("button",{name:"Preview club alerts"}).click();
  await p.locator("[data-act=pacePreview]").click();
  const modal=p.getByRole("dialog",{name:"Hour alert preview"});
  assert.match(await modal.locator("dl").textContent(),/Adviser · Bcc.*jordan\.reyes@example\.org/);
  assert.match(await modal.locator(".mail-body").textContent(),/hours behind pace/);
  await modal.getByRole("button",{name:"Close"}).click();
  await p.locator("[data-act=editClub]").click();
  await p.locator("#cl-alerts").check();
  await p.locator("#cl-gap").fill("501");
  await p.getByRole("button",{name:"Save changes"}).click();
  assert.equal(await p.locator("#cl-gap").getAttribute("aria-invalid"),"true");
  await p.locator("#cl-gap").fill("1.25");
  await p.getByRole("button",{name:"Save changes"}).click();
  await p.reload();
  await p.locator(".club-alert-panel").waitFor();
  assert.match(await p.locator(".club-alert-panel").textContent(),/Enabled for club.*1.25 hours/s);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
});
test("live settings recover from a connection failure and confirm disconnect",async t=>{
  const p=await helper.page(t);
  await helper.signIn(p,1);
  await p.evaluate(()=>{
    DB.live=true;
    window.mailCalls=[];
    GmailAlerts.request=async(action)=>{
      mailCalls.push(action);
      if (mailCalls.length===1) throw Error("Unavailable");
      return action==="disconnect" ? {connected:false} : {connected:true,sender:"team@example.org"};
    };
  });
  await p.locator('.rail [data-v="settings"]').click();
  await p.getByRole("button",{name:"Retry connection"}).click();
  await p.getByRole("button",{name:"Disconnect Gmail"}).click();
  await p.getByRole("button",{name:"Keep connected"}).click();
  assert.deepEqual(await p.evaluate(()=>mailCalls),["status","status"]);
  await p.getByRole("button",{name:"Disconnect Gmail"}).click();
  await p.getByRole("dialog").getByRole("button",{name:"Disconnect Gmail"}).click();
  await p.getByRole("button",{name:"Connect Gmail",exact:true}).waitFor();
  assert.deepEqual(await p.evaluate(()=>mailCalls),["status","status","disconnect"]);
});
test("monthly totals and the optional outside-service report reconcile with approved entries",async t=>{
  const p=await helper.page(t);
  await helper.signIn(p,2);await p.locator('.rail [data-v="hours"]').click();
  await p.locator("#service-by-month summary").click();
  const monthly = await p.locator("#service-by-month tbody tr").evaluateAll(rows=>rows.reduce((n,tr)=>n+Number(tr.lastElementChild.textContent),0));
  assert.equal(monthly,await p.evaluate(()=>userStats(currentUser().id).hours));
  await p.locator("[data-act=logout]").click();await helper.signIn(p,1);
  await p.locator('.rail [data-v="reports"]').click();
  await p.locator("#report-filters summary").click();
  await p.locator("#r-vol").selectOption("2");
  const before=await p.locator(".report-recap strong").textContent();
  await p.locator("#r-outside").check();
  const outside=await p.evaluate(()=>sum(state.hourLogs.filter(l=>l.userId===2 && l.status==="approved" && l.date>=ui.rep.from && l.date<=ui.rep.to).map(l=>l.hours)));
  assert.ok(outside>0);
  assert.equal(parseFloat(await p.locator(".report-recap strong").textContent()),parseFloat(before)+outside);
  assert.match(await p.evaluate(()=>ui.csv.build()),/Outside service records/);
  await p.locator("#r-group").selectOption("month");
  assert.equal(parseFloat(await p.locator(".report-recap strong").textContent()),parseFloat(before)+outside);
});
