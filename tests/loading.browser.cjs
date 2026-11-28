const test = require('node:test');
const assert = require('node:assert/strict');
const helper = require('./browser-helpers.cjs');

test.before(helper.start);
test.after(helper.stop);

// Drive the Firebase compat boundary. Queries emit cache and server snapshots
// independently, and writes can be observed locally before they are acknowledged.
function installFirebaseMock(){
  const listeners = new Map(), reads = new Map();
  function ref(path, filter = null){
    return {
      path,
      doc:id => ref(`${path}/${id}`),
      where:(field, op, value) => ref(path, [field, op, value]),
      set:async () => {},
      onSnapshot(options, next, error){
        if (typeof options === "function"){ error = next; next = options; }
        const key = filter ? path + "|" + JSON.stringify(filter) : path;
        const listener = {next, error, filter};
        listeners.set(key, listener);
        return () => { if (listeners.get(key) === listener) listeners.delete(key); };
      },
    };
  }
  const auth = {
    currentUser:null,
    async setPersistence(){},
    onAuthStateChanged(next){ this.notify = next; },
    signInWithEmailAndPassword(){
      mock.signIns++;
      return new Promise((resolve, reject) => { mock.resolveSignIn = resolve; mock.rejectSignIn = reject; });
    },
    async signOut(){ this.currentUser = null; this.notify(null); },
  };
  const mock = {
    signIns:0, batches:[], singleReads:0,
    ready:() => !!auth.notify,
    signedOut:() => auth.notify(null),
    user(id, emailVerified = true){
      auth.currentUser = {uid:String(id), emailVerified, email:"person@example.org",
        async reload(){ this.emailVerified = mock.emailVerified; }, async getIdToken(){}, async sendEmailVerification(){}};
      auth.notify(auth.currentUser);
    },
    fail(path, code){ listeners.get(path).error({code}); },
    doc(path, record, fromCache = false){
      const snapshot = {exists:!!record, metadata:{fromCache}, data:() => structuredClone(record)};
      if (reads.has(path)){ reads.get(path)(snapshot); reads.delete(path); }
      else listeners.get(path).next(snapshot);
    },
    push(path, records, {fromCache = false, pending = []} = {}){
      for (const [key, listener] of listeners){
        if (key !== path && !key.startsWith(path + "|")) continue;
        const scoped = records.filter(record => {
          if (!listener.filter) return true;
          const [field, op, value] = listener.filter;
          return op === "array-contains" ? record[field]?.includes(value) : record[field] === value;
        });
        listener.next({
          metadata:{fromCache, hasPendingWrites:pending.length > 0},
          docs:scoped.map(record => ({id:String(record.id), metadata:{hasPendingWrites:pending.includes(record.id)}, data:() => structuredClone(record)})),
        });
      }
    },
  };
  window.firebaseMock = mock;
  window.firebase = {
    initializeApp(){},
    auth:() => auth,
    firestore:() => ({
      clearPersistence:async () => {},
      doc:ref, collection:ref,
      runTransaction(callback){
        mock.singleReads++;
        return callback({get:({path}) => new Promise(resolve => reads.set(path, resolve))});
      },
      batch(){
        const changes = [];
        return {
          set:({path}, record) => changes.push({path, record}),
          update:({path}, fields) => changes.push({path, fields}),
          commit:() => new Promise((resolve, reject) => mock.batches.push({changes, resolve, reject})),
        };
      },
    }),
  };
  window.firebase.auth.Auth = {Persistence:{SESSION:"session"}};
  window.firebase.firestore.FieldValue = {serverTimestamp:() => "fixture-timestamp"};
}

async function livePage(t, options){
  const page = await helper.page(t, options);
  await page.clock.install();
  await page.addInitScript(installFirebaseMock);
  await page.route('**/js/firebase-config.js', r => r.fulfill({
    contentType:'text/javascript', body:'window.FIREBASE_CONFIG={apiKey:"fixture"}; window.FIREBASE_SDK_BASE="/firebase-fixture/";',
  }));
  await page.route('**/firebase-fixture/**', r => r.fulfill({contentType:'text/javascript', body:''}));
  await page.reload();
  await page.waitForFunction(() => firebaseMock.ready());
  return page;
}

function initialRecords(role){
  const sample = seed();
  const me = {...sample.users.find(u => u.role === role), id:`live-${role}`, toured:true};
  const source = sample.events.find(e => e.date > TODAY);
  const organizer = role === "coordinator" ? me : sample.users.find(u => u.role === "coordinator" && u.verified);
  const events = [
    {...source, id:901, slots:5, postedBy:organizer.id, clubId:null, skills:me.skills},
    {...source, id:902, date:TODAY, slots:5, postedBy:organizer.id, clubId:null, skills:me.skills},
  ];
  const roster = [3,4].map((userId, k) => ({id:801 + k, userId, eventId:902, status:"registered", hours:0}));
  firebaseMock.user(me.id);
  firebaseMock.doc(`users/${me.id}`, me);
  for (const name of ["events","regs","announcements","notices","concerns","clubs","memberships","hourLogs","users","organizers","invites"]){
    const records = {events, regs:role === "coordinator" ? roster : [], users:sample.users,
      organizers:sample.users.filter(user => user.role === "coordinator")};
    firebaseMock.push(name, records[name] || []);
  }
}

test('account startup and workspace hold empty cache results and recover without extra requests', async t => {
  const page = await livePage(t, {reducedMotion:'reduce', viewport:{width:390,height:840}});
  assert.match(await page.locator('h1').textContent(), /Show up for your community/);
  assert.equal(await page.locator('.load-status').count(), 0, 'The public landing page stays available');
  await page.locator('.landing-actions a[href="#login"]').click();
  assert.equal(await page.locator('#loginForm button').isDisabled(), true);
  await page.clock.fastForward(250);
  assert.match(await page.locator('#connection-status').textContent(), /Connecting to VolunteerHub sign-in/);
  await page.evaluate(() => {
    const me = {...seed().users.find(u => u.role === "volunteer"), id:"live-volunteer", toured:true};
    window.fixtureUser = me;
    firebaseMock.user(me.id);
    firebaseMock.doc(`users/${me.id}`, me, true);
  });
  await page.clock.fastForward(250);
  assert.match(await page.locator('#connection-status').textContent(), /Opening your VolunteerHub profile/);
  await page.evaluate(() => {
    const me = window.fixtureUser;
    firebaseMock.doc(`users/${me.id}`, me);
    firebaseMock.push("events",[],{fromCache:true});
  });
  await page.clock.fastForward(350);
  const sidebar = page.locator('.pv-sidebar');
  assert.equal(await sidebar.evaluate(element => element.inert), true);
  await page.locator('.rail a[data-v="find"]').dispatchEvent('click');
  assert.equal(await page.evaluate(() => ui.view), "dashboard", "Navigation stays frozen while events load");
  assert.match(await page.locator('.load-status').textContent(),/Loading your shifts and service hours/);
  assert.equal(await page.locator('.load-skeleton-row span').first().evaluate(e => getComputedStyle(e).animationName), 'none');
  assert.equal(await page.locator('#findForm').count(), 0, 'No empty results before the live reads arrive');
  await page.clock.fastForward(8100);
  assert.match(await page.locator('.load-status').textContent(),/Still loading your shifts and service hours/);
  await page.clock.fastForward(7000);
  assert.match(await page.locator('.load-status').textContent(),/couldn't load your shifts and service hours/);
  assert.equal(await page.getByRole('button',{name:'Try again',exact:true}).isEnabled(), true);
  await page.evaluate(() => {
    for (const name of ["events","regs","announcements","notices","concerns","clubs","memberships","hourLogs","users","organizers","invites"]) firebaseMock.push(name,[]);
  });
  await page.clock.fastForward(100);
  await page.waitForFunction(() => !document.querySelector('.pv-sidebar').inert);
  await page.locator('.rail a[data-v="find"]').click();
  assert.equal(await page.locator('#findForm').isVisible(), true);
  assert.equal(await page.locator('.load-skeleton').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
});

test('sign-in submits once, preserves input after failure and observes the Firebase rate-limit cooldown', async t => {
  const page = await livePage(t);
  await page.evaluate(() => firebaseMock.signedOut());
  await page.locator('.landing-actions a[href="#login"]').click();
  await page.locator('#li-email').fill('user@example.org');
  await page.locator('#li-pass').fill('demo1234');
  const submit = page.locator('#loginForm [type="submit"]');
  await submit.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => firebaseMock.signIns), 1);
  assert.equal(await submit.textContent(), 'Sign in');
  await page.clock.fastForward(250);
  assert.equal(await submit.textContent(), 'Signing in…');
  await page.evaluate(() => firebaseMock.rejectSignIn({code:'auth/too-many-requests'}));
  await page.waitForFunction(() => document.getElementById('li-err').textContent.includes('30 seconds'));
  assert.equal(await submit.isDisabled(), true);
  assert.equal(await page.locator('#li-email').inputValue(), 'user@example.org');
  await page.clock.fastForward(30030);
  assert.equal(await submit.isEnabled(), true);
});

test('volunteer sign-up waits for confirmation, survives a redraw and suppresses duplicate writes', async t => {
  const page = await livePage(t);
  await page.evaluate(initialRecords, "volunteer");
  await page.waitForSelector('.pv-recommendation');
  const signUp = page.locator('.pv-recommendation [data-act="signup"]').first();
  const eventId = Number(await signUp.getAttribute('data-id'));
  await signUp.focus(); await page.keyboard.press('Enter');
  const prompt = page.getByRole('dialog',{name:'Sign up for this shift?'});
  const confirm = prompt.locator('#confirm-action');
  assert.equal(await page.evaluate(() => document.activeElement.textContent),'Go back');
  await page.keyboard.press('Escape');
  assert.equal(await prompt.isVisible(),false);
  assert.equal(await page.evaluate(() => firebaseMock.batches.length),0);
  assert.equal(await signUp.evaluate(el=>el===document.activeElement),true);
  await signUp.click();
  await confirm.click();
  await confirm.dispatchEvent('click');
  await page.keyboard.press('Escape');
  await page.clock.fastForward(250);
  assert.equal(await confirm.textContent(), 'Saving your sign-up…');
  await page.evaluate(() => {
    const record = firebaseMock.batches[0].changes[0].record;
    firebaseMock.push('regs',[record],{pending:[record.id]});
  });
  await page.clock.fastForward(70);
  assert.equal(await page.evaluate(id => !!myReg(currentUser().id,id), eventId), false);
  assert.equal(await signUp.isDisabled(), true);
  assert.equal(await page.evaluate(() => firebaseMock.batches.length), 1);
  await page.evaluate(() => firebaseMock.batches[0].reject({code:'unavailable'}));
  await page.waitForFunction(() => document.querySelector('#confirmation-error').textContent.includes("Couldn't complete"));
  assert.equal(await confirm.isEnabled(), true);
  await confirm.click();
  await page.evaluate(() => {
    const batch = firebaseMock.batches[1];
    batch.resolve();
    firebaseMock.push('regs',[batch.changes[0].record]);
  });
  await page.waitForFunction(id => myReg(currentUser().id,id)?.status === 'registered', eventId);
  assert.match(await page.locator('#toast').textContent(), /You're signed up/);
});

test('coordinator check-in sends one batch and updates the roster only after confirmation', async t => {
  const page = await livePage(t);
  await page.evaluate(initialRecords, "coordinator");
  await page.waitForSelector('.rail a[data-v="events"]');
  await page.locator('.rail a[data-v="events"]').click();
  await page.locator('.subtabs a[data-v="checkin"]').click();
  await page.locator('#ci-ev').selectOption('902');
  const bulk = page.getByRole('button',{name:'Mark everyone else present'});
  await bulk.click();
  assert.equal(await page.evaluate(() => firebaseMock.batches.length),0);
  await page.getByRole('button',{name:'Confirm attendance'}).click();
  await page.clock.fastForward(250);
  assert.equal(await page.getByRole('button',{name:'Saving attendance…'}).isDisabled(), true);
  assert.ok(await page.locator('[data-act="mark"][data-v="attended"]').first().isDisabled());
  assert.equal(await page.evaluate(() => state.regs.filter(r => r.status === 'attended').length), 0);
  assert.equal(await page.evaluate(() => firebaseMock.batches.length), 1);
  assert.equal(await page.evaluate(() => firebaseMock.batches[0].changes.length), 2);
  await page.evaluate(() => firebaseMock.batches[0].resolve());
  await page.waitForFunction(() => state.regs.filter(r => r.status === 'attended').length === 2);
  assert.match(await page.locator('#toast').textContent(), /Marked 2 volunteers present/);
});

test('recurring events share one commit and a failed save keeps the event form intact', async t => {
  const page = await livePage(t, {viewport:{width:390,height:850}});
  await page.evaluate(initialRecords, "coordinator");
  await page.getByRole('button',{name:'New event',exact:true}).click();
  await page.locator('#ef-title').fill('Garden cleanup series');
  await page.locator('#ef-loc').fill('Community Garden');
  await page.locator('#ef-desc').fill('Remove litter and sort recyclables.');
  await page.locator('.event-form-options > summary').click();
  await page.locator('#ef-zip').fill('20001');
  await page.locator('#ef-repeat').selectOption('2');
  const submit = page.locator('#eventForm [type="submit"]');
  await submit.click();
  const prompt = page.getByRole('dialog',{name:'Create this event?'});
  assert.match(await prompt.textContent(),/Creates 3 weekly events/);
  assert.equal(await page.evaluate(() => firebaseMock.batches.length),0);
  await prompt.getByRole('button',{name:'Go back'}).click();
  assert.equal(await page.locator('#ef-repeat').inputValue(),'2');
  await submit.click();
  const confirm = prompt.locator('#confirm-action');
  await confirm.click();
  await page.clock.fastForward(250);
  assert.equal(await confirm.textContent(), 'Creating event…');
  assert.equal(await page.evaluate(() => firebaseMock.batches.length), 1);
  assert.equal(await page.evaluate(() => new Set(firebaseMock.batches[0].changes.map(c => c.path)).size), 3);
  assert.equal(await page.evaluate(() => state.events.some(e => e.title === 'Garden cleanup series')), false);
  await page.evaluate(() => firebaseMock.batches[0].reject({code:'permission-denied'}));
  assert.match(await prompt.locator('#confirmation-error').textContent(), /Couldn't save the event/);
  assert.equal(await page.locator('#ef-title').inputValue(), 'Garden cleanup series');
  assert.equal(await confirm.isEnabled(), true);
  await confirm.click();
  await page.evaluate(() => firebaseMock.batches[1].resolve());
  await page.waitForFunction(() => state.events.filter(e => e.title === 'Garden cleanup series').length === 3);
  assert.equal(await page.locator('#eventForm').count(), 0);
  assert.match(await page.locator('#toast').textContent(), /was created for 3 weeks/);
});


test('a signed-in volunteer sees example shifts while verification protects shared records', async t => {
  const page = await livePage(t);
  await page.evaluate(() => {
    firebaseMock.user("pending-volunteer", false);
    firebaseMock.doc("users/pending-volunteer", {...seed().users[1],id:"pending-volunteer"});
  });
  assert.equal(await page.locator('h1').textContent(),'Volunteer workspace');
  assert.equal(await page.evaluate(() => firebaseMock.singleReads),1);
  assert.ok(await page.locator('.activity-row').count() > 0);
  await page.getByRole('heading', {name:'Verify your email'}).waitFor();
  assert.equal(await page.locator('.pv-sidebar').count(), 0);
  await page.getByRole('button', {name:'Check verification'}).click();
  assert.match(await page.locator('#toast').textContent(), /still unverified/);
  await page.evaluate(() => { firebaseMock.emailVerified = true; });
  await page.getByRole('button', {name:'Check verification'}).click();
  await page.waitForFunction(() => Cloud.loadPhase === "profile" && !Cloud.verificationUser);
});

test('text remains literal in the event list and exported spreadsheet fields', async t => {
  const page = await helper.page(t);
  await helper.signIn(page, 2);
  const results = await page.evaluate(() => {
    const title = 'Service <strong>Workshop</strong>';
    const node = document.createElement("div");
    const event = {...state.events[0], title};
    node.innerHTML = eventMini(event);
    return {title:node.querySelector('h3').textContent, markup:node.querySelector('h3 strong') !== null,
      csv:toCSV([['+Community Centre','Line one\rLine two',-12,'O’Connor']])};
  });
  assert.equal(results.title, 'Service <strong>Workshop</strong>');
  assert.equal(results.markup, false);
  assert.equal(results.csv, `"'+Community Centre","Line one\rLine two",-12,O’Connor`);
});
