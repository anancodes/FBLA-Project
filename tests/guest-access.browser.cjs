const test=require('node:test');
const assert=require('node:assert/strict');
const helper=require('./browser-helpers.cjs');
const fs=require('node:fs');
test.before(helper.start);test.after(helper.stop);

const open=async(p,query)=>{const base=new URL(p.url());await p.goto(`${base.origin}/${query}`);};
const futureEvent=p=>p.evaluate(()=>state.events.find(e=>e.date>TODAY&&!e.clubId&&spotsLeft(e)>0).id);
const join=async(p,name='Riley Guest')=>{
 await p.locator('#g-name').fill(name);await p.locator('#g-waiver').check();
 await p.locator('#guestForm [type="submit"]').click();
 await p.waitForFunction(()=>currentUser()?.guest===true);
};

test('a guest link opens a no-account welcome, requires the waiver, and signs the guest in',async t=>{
 const p=await helper.page(t);await open(p,'?invite=demo7q2m9px4#join');
 assert.equal(await p.locator('h1').textContent(),'Join as a guest');
 assert.equal(new URL(p.url()).search,'','The invite code is removed from the address bar');
 await p.locator('#g-name').fill('Riley Guest');await p.locator('#guestForm [type="submit"]').click();
 assert.match(await p.locator('#e-waiver').textContent(),/waiver/);
 await p.locator('#g-waiver').check();await p.locator('#guestForm [type="submit"]').click();
 await p.waitForFunction(()=>currentUser()?.guest===true);
 const me=await p.evaluate(()=>currentUser());
 assert.equal(me.email,'');assert.equal(me.role,'volunteer');assert.equal(me.invite,'DEMO7Q2M9PX4');assert.ok(me.waiverAt);
 assert.match(await p.locator('.pv-account small').textContent(),/Guest/);
 assert.equal(await p.locator('.guest-banner').count(),1);
});

test('expired, turned-off and incomplete links do not create guests',async t=>{
 const p=await helper.page(t);await open(p,'?invite=AAAAAAAAAAAA#join');
 await p.locator('#g-name').fill('Riley Guest');await p.locator('#g-waiver').check();await p.locator('#guestForm [type="submit"]').click();
 assert.match(await p.locator('#g-err').textContent(),/expired or was turned off/);
 assert.equal(await p.evaluate(()=>currentUser()),null);
 await open(p,'?invite=short#join');
 assert.equal(await p.locator('h1').textContent(),"This link isn't complete");assert.equal(await p.locator('#guestForm').count(),0);
});

test('an event link opens that event after the guest joins and the guest can sign up',async t=>{
 const p=await helper.page(t);const id=await futureEvent(p);
 await open(p,`?invite=DEMO7Q2M9PX4&event=${id}#join`);await join(p);
 await p.locator('#modal .modal').waitFor();
 assert.equal(await p.locator('#modal h2').first().textContent(),await p.evaluate(id=>eventById(id).title,id));
 await p.locator('#modal [data-act="signup"]').click();
 if (await p.locator('#confirm-action').isVisible()) await p.locator('#confirm-action').click();
 await p.waitForFunction(id=>state.regs.some(r=>r.eventId===id&&r.userId===currentUser().id&&r.status!=='cancelled'),id);
});

test('a club join link makes the guest a club member',async t=>{
 const p=await helper.page(t);await open(p,'?join=HOSA-7K2PQM#join');
 assert.match(await p.locator('.auth-intro').textContent(),/join a club/);
 await join(p);
 await p.waitForFunction(()=>state.memberships.some(m=>m.clubId===1&&m.userId===currentUser().id&&m.role==='member'));
});

test('a guest can save their hours with an email and sign in with it later',async t=>{
 const p=await helper.page(t);await open(p,'?invite=DEMO7Q2M9PX4#join');await join(p);
 await p.locator('.pv-profile').click();await p.locator('#gu-email').fill('riley@example.org');
 await p.locator('#gu-pass').fill('a long passphrase');await p.locator('#gu-pass2').fill('a long passphrase');
 await p.locator('#guestUpgradeForm [type="submit"]').click();
 await p.waitForFunction(()=>currentUser()?.guest===false);
 assert.equal(await p.evaluate(()=>currentUser().email),'riley@example.org');
 assert.equal(await p.locator('#guestUpgradeForm').count(),0);
});

test('coordinators share a guest link and QR code, rotate it, and share single events',async t=>{
 const p=await helper.page(t);await helper.signIn(p,1);
 await p.locator('.rail a[data-v="volunteers"]').click();await p.locator('.subtabs a[data-v="invite"]').click();
 assert.equal(await p.locator('h1').textContent(),'Invite volunteers');
 const link=await p.locator('#share-link').inputValue();
 assert.match(link,/\?invite=DEMO7Q2M9PX4#join$/);
 assert.ok(await p.locator('svg.qr-code path').getAttribute('d'));
 const download=p.waitForEvent('download');await p.locator('[data-act="downloadQR"]').click();
 assert.match((await download).suggestedFilename(),/^volunteerhub-qr-.*\.png$/);
 await p.locator('[data-act="arm"][data-v^="newinvite"]').click();await p.locator('[data-act="confirm"]').click();
 const next=await p.locator('#share-link').inputValue();assert.notEqual(next,link);
 assert.equal(await p.evaluate(()=>state.invites.filter(i=>i.active).length),1);
 const id=await futureEvent(p);
 await p.evaluate(id=>showEventPopup(id),id);await p.locator('#modal [data-act="shareEvent"]').click();
 await p.locator('#modal svg.qr-code').waitFor();
 assert.match(await p.locator('#modal #share-link').inputValue(),new RegExp(`event=${id}`));
 await p.locator('#modal [data-act="close"]').first().click();
 // The rotated-out code no longer lets anyone in.
 await p.locator('.pv-utility-links [data-act="logout"]').click();
 await open(p,'?invite=DEMO7Q2M9PX4#join');
 await p.locator('#g-name').fill('Late Guest');await p.locator('#g-waiver').check();await p.locator('#guestForm [type="submit"]').click();
 assert.match(await p.locator('#g-err').textContent(),/expired or was turned off/);
});

test('club managers can share a join link with a QR code',async t=>{
 const p=await helper.page(t);await helper.signIn(p,1);
 await p.locator('.rail a[data-v="volunteers"]').click();await p.locator('.subtabs a[data-v="manage"]').click();
 const share=p.locator('[data-act="shareClub"]').first();await share.waitFor();await share.click();
 assert.match(await p.locator('#modal #share-link').inputValue(),/\?join=(HOSA|NHS)-/);
});

test('sign-in and sign-up pages point volunteers to links instead of accounts',async t=>{
 const p=await helper.page(t);await open(p,'#login');
 assert.match(await p.locator('.login-card').textContent(),/QR code from your coordinator/);
 await open(p,'#signup');assert.match(await p.locator('.auth-intro').textContent(),/link or QR code/);
});

// Live mode against a small Firebase stand-in: anonymous sign-in, invite lookup and the profile write.
function installGuestFirebase(){
  const listeners = new Map(), docs = new Map([["invites/LIVEINVITE23", {code:"LIVEINVITE23", active:true}], ["invites/OFFINVITE234", {code:"OFFINVITE234", active:false}]]);
  const snap = (path, record) => ({exists:!!record, metadata:{fromCache:false, hasPendingWrites:false}, data:() => structuredClone(record), ref:ref(path)});
  function ref(path, filter = null){
    return {
      path, doc:id => ref(`${path}/${id}`), where:(f, op, v) => ref(path, [f, op, v]),
      async get(){ mock.reads.push(path); return snap(path, docs.get(path)); },
      async set(record){ mock.writes.push({path, record}); docs.set(path, record); listeners.get(path)?.next(snap(path, record)); },
      async update(fields){ docs.set(path, {...docs.get(path), ...fields}); },
      onSnapshot(options, next){
        if (typeof options === "function") next = options;
        const key = filter ? path + "|" + JSON.stringify(filter) : path;
        listeners.set(key, {next, filter});
        if (path.split("/").length % 2 === 0 && docs.has(path)) setTimeout(() => next(snap(path, docs.get(path))), 0);
        return () => listeners.delete(key);
      },
    };
  }
  const auth = {
    currentUser:null, persistence:[],
    async setPersistence(p){ this.persistence.push(p); },
    onAuthStateChanged(next){ this.notify = next; },
    async signInAnonymously(){
      mock.anonymousSignIns++;
      this.currentUser = {uid:"anon1", isAnonymous:true, emailVerified:false, email:null, async delete(){}};
      this.notify(this.currentUser);
      return {user:this.currentUser};
    },
    async signOut(){ this.currentUser = null; this.notify(null); },
  };
  const mock = {
    anonymousSignIns:0, reads:[], writes:[], auth, ready:() => !!auth.notify,
    pushAll(){ for (const [key, l] of listeners) if (key.split("|")[0].split("/").length % 2 === 1) l.next({metadata:{fromCache:false, hasPendingWrites:false}, docs:[]}); },
  };
  window.guestMock = mock;
  window.firebase = {initializeApp(){}, auth:() => auth,
    firestore:() => ({clearPersistence:async () => {}, doc:ref, collection:ref, batch:() => ({set(){}, update(){}, commit:async () => {}})})};
  window.firebase.auth.Auth = {Persistence:{SESSION:"session", LOCAL:"local"}};
  window.firebase.auth.EmailAuthProvider = {credential:() => ({})};
  window.firebase.firestore.FieldValue = {serverTimestamp:() => "fixture-timestamp"};
}
async function liveGuestPage(t, query){
  const p = await helper.page(t);
  await p.addInitScript(installGuestFirebase);
  await p.route('**/js/firebase-config.js', r => r.fulfill({contentType:'text/javascript',
    body:'window.FIREBASE_CONFIG={apiKey:"fixture"}; window.FIREBASE_SDK_BASE="/firebase-fixture/";'}));
  await p.route('**/firebase-fixture/**', r => r.fulfill({contentType:'text/javascript', body:''}));
  await open(p, query);
  await p.waitForFunction(() => guestMock.ready());
  await p.evaluate(() => guestMock.auth.notify(null));
  return p;
}

test('live guests sign in anonymously, keep the pass in this browser, and skip email verification',async t=>{
  const p = await liveGuestPage(t, '?invite=LIVEINVITE23#join');
  await p.locator('#g-name').fill('Riley Guest'); await p.locator('#g-phone').fill('555-123-4567'); await p.locator('#g-waiver').check();
  await p.locator('#guestForm [type="submit"]').click();
  await p.waitForFunction(() => guestMock.writes.length === 1);
  const {path, record} = await p.evaluate(() => guestMock.writes[0]);
  assert.equal(path, 'users/anon1');
  assert.deepEqual(Object.keys(record).sort(), ['availability','email','emergency','guest','id','invite','location','name','phone','reads','role','skills','toured','verified','waiverAt','zip']);
  assert.equal(record.email, ''); assert.equal(record.guest, true); assert.equal(record.invite, 'LIVEINVITE23'); assert.equal(record.role, 'volunteer');
  assert.deepEqual(await p.evaluate(() => guestMock.auth.persistence), ['session','local']);
  assert.equal(await p.evaluate(() => localStorage.getItem('volunteerhub-guest')), '1');
  await p.waitForFunction(() => Cloud.loadPhase === 'workspace'); await p.evaluate(() => guestMock.pushAll());
  await p.waitForFunction(() => !Cloud.loadPhase && currentUser()?.guest);
  assert.equal(await p.locator('text=Verify your email').count(), 0);
  assert.match(await p.locator('.pv-footer-data').textContent(), /Guest pass on this browser/);
  // Signing out warns first, then clears the saved pass.
  await p.locator('.pv-utility-links [data-act="logout"]').click();
  assert.match(await p.locator('#modal h2').textContent(), /Sign out of your guest pass/);
  await p.locator('#modal [data-act="logout"][data-v="confirm"]').click();
  await p.waitForFunction(() => !currentUser());
  assert.equal(await p.evaluate(() => localStorage.getItem('volunteerhub-guest')), null);
});

test('a turned-off live link is refused before any guest sign-in is created',async t=>{
  const p = await liveGuestPage(t, '?invite=OFFINVITE234#join');
  await p.locator('#g-name').fill('Riley Guest'); await p.locator('#g-waiver').check();
  await p.locator('#guestForm [type="submit"]').click();
  await p.waitForFunction(() => document.getElementById('g-err')?.textContent);
  assert.match(await p.locator('#g-err').textContent(), /expired or was turned off/);
  assert.equal(await p.evaluate(() => guestMock.anonymousSignIns), 0);
});

test('guest and invite screens fit small screens and pass accessibility checks in both themes',async t=>{
  const p=await helper.page(t),axePath=process.env.AXE_CORE_PATH;
  const scan=async label=>{
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label);
    if(!axePath)return;
    assert.ok(fs.existsSync(axePath));await helper.loadAxe(p,axePath);
    const violations=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations);
    assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],label);
  };
  await p.setViewportSize({width:390,height:900});
  for(const theme of ['light','dark']){
    await open(p,'?invite=DEMO7Q2M9PX4#join');
    await p.evaluate(theme=>{state.prefs.theme=theme;render()},theme);await scan(`welcome ${theme}`);
    await p.evaluate(theme=>{state.users.forEach(u=>u.toured=true);state.session.userId=1;ui.view='invite';state.prefs.theme=theme;render()},theme);
    await scan(`invite ${theme}`);
    await p.locator('[data-act="logout"]').last().click();
    await open(p,'?invite=DEMO7Q2M9PX4#join');await join(p);
    const tourEnd=p.locator('[data-act="tourEnd"]');if(await tourEnd.count())await tourEnd.click();
    await p.evaluate(theme=>{state.prefs.theme=theme;render()},theme);await scan(`guest home ${theme}`);
    await p.evaluate(()=>handlers.nav('profile'));await scan(`guest profile ${theme}`);
    await p.evaluate(()=>{state.session.userId=null;save();});
  }
});
