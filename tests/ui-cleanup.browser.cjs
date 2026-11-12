const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const helper = require('./browser-helpers.cjs');
let axePath = process.env.AXE_CORE_PATH;
try { axePath ||= require.resolve('axe-core/axe.min.js'); } catch {}
test.before(helper.start);
test.after(helper.stop);

test('Home prioritizes upcoming shifts and recommendations without duplicate attention content',async t => {
  const p = await helper.page(t); await helper.signIn(p);
  assert.equal(await p.locator('.attention,.banner').count(),0);
  assert.equal(await p.getByText('Events attended',{exact:true}).count(),0);
  assert.equal(await p.getByRole('heading',{name:'Your next shifts'}).count(),1);
  assert.equal(await p.getByRole('heading',{name:'Recommended for you'}).count(),1);
  assert.equal(await p.locator('.pv-shifts > li').count(),3);
  const goal = p.getByRole('progressbar',{name:'Service hour goal'});
  assert.equal(await goal.getAttribute('aria-valuetext'),await p.evaluate(() => `${fmtH(userStats(currentUser().id).hours)} of ${HOUR_GOAL} hours`));
  assert.equal(await p.locator('.rail [data-v="manage"]').count(),0);
});

test('signup can omit location; discovery then requires a manual search',async t => {
  const p = await helper.page(t);
  await p.locator('[data-act="authmode"][data-v="signup"]').click();
  await p.locator('#su-name').fill('Alex Service'); await p.locator('#su-email').fill('alex@example.org');
  await p.locator('#su-pass').fill('demo1234'); await p.locator('#su-pass2').fill('demo1234'); await p.locator('#su-waiver').check();
  await p.locator('#signupForm [type="submit"]').click();
  await p.locator('[data-act="tourEnd"]').click();
  assert.equal(await p.evaluate(() => currentUser().location),null);
  await p.locator('.rail [data-v="find"]').click();
  assert.equal(await p.locator('#f-location,#f-radius,.ev').count(),0);
  await p.locator('#findForm [type="submit"]').click();
  assert.match(await p.locator('#e-q').textContent(),/Enter an event/);
  await p.locator('#f-q').fill('food'); await p.locator('#findForm [type="submit"]').click();
  assert.ok(await p.locator('.ev').count() > 0);
  assert.equal(await p.locator('#f-location,#f-radius').count(),0);
  await p.locator('#f-q').fill(''); await p.locator('#f-cat').selectOption('Food Pantry'); await p.locator('#findForm [type="submit"]').click();
  assert.ok(await p.locator('.ev').count() > 0,'Choosing a cause is also a manual search');
});

test('city selection validates input, enables nearby filters, and can be removed',async t => {
  const p = await helper.page(t); await helper.signIn(p);
  await p.evaluate(() => handlers.nav('profile'));
  await p.locator('#p-location').fill('Atlantis under the sea'); await p.locator('#profileForm [type="submit"]').click();
  assert.match(await p.locator('#e-location').textContent(),/Choose a city/);
  await p.locator('#p-location').fill('Washington, DC'); await p.locator('#profileForm [type="submit"]').click();
  assert.equal(await p.evaluate(() => currentUser().location.city),'Washington');
  assert.equal(await p.evaluate(() => currentUser().zip),'');
  await p.locator('.rail [data-v="find"]').click(); await p.locator('#f-radius').selectOption('5'); await p.locator('#findForm [type="submit"]').click();
  assert.ok(await p.locator('.ev').count() > 0);
  assert.equal(await p.evaluate(() => [...document.querySelectorAll('.ev-title')].every(el => milesTo(eventById(asId(el.dataset.id)),searchOrigin()) <= 5)),true);
  await p.evaluate(() => handlers.nav('profile')); await p.locator('#p-location').fill(''); await p.locator('#profileForm [type="submit"]').click();
  await p.locator('.rail [data-v="find"]').click();
  assert.equal(await p.locator('#f-location,#f-radius').count(),0);
  assert.equal(await p.evaluate(() => userLocation(currentUser())),null);
});

test('live signup receives the optional city without changing role or verification defaults',async t => {
  const p = await helper.page(t); await p.locator('[data-act="authmode"][data-v="signup"]').click();
  await p.locator('#su-name').fill('Casey Student'); await p.locator('#su-email').fill('casey.student@example.org');
  await p.locator('#su-pass').fill('demo1234'); await p.locator('#su-pass2').fill('demo1234'); await p.locator('#su-waiver').check();
  await p.locator('#su-location').fill('Washington, DC');
  await p.evaluate(() => { Cloud.enabled = true; Cloud.signup = async profile => { window.capturedSignup = profile; }; });
  await p.locator('#signupForm [type="submit"]').click();
  const result = await p.evaluate(() => window.capturedSignup);
  assert.equal(result.location.city,'Washington'); assert.equal(result.location.st,'DC');
  assert.equal(result.role,'volunteer'); assert.equal(result.verified,false); assert.equal(result.zip,''); assert.equal('admin' in result,false);
});

test('schedule previews three attended events and keeps full history behind a keyboard disclosure',async t => {
  const p = await helper.page(t); await helper.signIn(p); await p.locator('.rail [data-v="shifts"]').click();
  assert.equal(await p.locator('.service-preview li').count(),3);
  assert.equal(await p.locator('#schedule-history').evaluate(el => el.open),false);
  assert.ok(await p.locator('#schedule-history tbody tr').count() > 3);
  await p.locator('#schedule-history > summary').focus(); await p.keyboard.press('Enter');
  assert.equal(await p.locator('#schedule-history').evaluate(el => el.open),true);
  await p.evaluate(() => render());
  assert.equal(await p.locator('#schedule-history').evaluate(el => el.open),true,'Live redraw preserves disclosure state');
  await p.keyboard.press('Escape'); assert.equal(await p.locator('#schedule-history').evaluate(el => el.open),false);
  assert.equal(await p.evaluate(() => document.activeElement.tagName),'SUMMARY');
});

test('hours preview three attended events while overflow CSV exports the complete service record',async t => {
  const p = await helper.page(t); await helper.signIn(p); await p.locator('.rail [data-v="hours"]').click();
  assert.equal(await p.locator('.hb-row:visible').count(),3);
  assert.equal(await p.locator('#hours-record').evaluate(el => el.open),false);
  assert.equal(await p.locator('[data-act="cert"],[data-act="print"],[data-act="csv"]').count(),0);
  assert.equal(await p.locator('[data-act="csvDownload"]').isVisible(),false);
  await p.locator('#hours-actions > summary').click();
  const downloadEvent = p.waitForEvent('download'); await p.locator('[data-act="csvDownload"]').click();
  const download = await downloadEvent, csv = await fs.readFile(await download.path(),'utf8');
  const expected = await p.evaluate(() => state.regs.filter(r => r.userId === currentUser().id && r.status === 'attended').length + outsideRows(currentUser().id).length);
  assert.equal(csv.split('\n').length,expected+2);
  assert.match(csv,/outside service/); assert.match(csv,/Total/);
  assert.equal(await p.locator('#hours-actions').evaluate(el => el.open),false);
  assert.equal(await p.evaluate(() => document.activeElement.parentElement.id),'hours-actions');
});

test('officer approvals are embedded in My clubs and persist through updates',async t => {
  const p = await helper.page(t); await helper.signIn(p); await p.locator('.rail [data-v="hours"]').click(); await p.locator('.subtabs [data-v="clubs"]').click();
  assert.equal(await p.locator('.rail [data-v="manage"],.subtabs [data-v="checkin"]').count(),0);
  assert.equal(await p.locator('#club-tools-1').count(),0); assert.equal(await p.locator('#club-tools-2').count(),1);
  await p.locator('#club-tools-2 > summary').click();
  const action = p.locator('#club-tools-2 [data-act="approveLog"]').first(), id = await action.getAttribute('data-id');
  await action.click();
  assert.equal(await p.evaluate(id => state.hourLogs.find(l => l.id === asId(id)).status,id),'approved');
  assert.equal(await p.locator('#club-tools-2').evaluate(el => el.open),true);
  await p.evaluate(() => { state.hourLogs.push({id:999,clubId:2,userId:2,name:currentUser().name,date:TODAY,hours:2,place:'Library',activity:'Helping readers',supervisor:'Test person',contact:'test@example.org',status:'pending'}); render(); });
  assert.equal(await p.locator('#club-tools-2 [data-act="approveLog"][data-id="999"]').count(),0);
  await p.evaluate(() => reviewLog(999,'approved'));
  assert.equal(await p.evaluate(() => state.hourLogs.find(l => l.id === 999).status),'pending');
});

test('ordinary members cannot see club management controls',async t => {
  const p = await helper.page(t); await helper.signIn(p);
  await p.evaluate(() => { state.session.userId = 3; ui.view = 'clubs'; ui.tour = null; render(); });
  assert.equal(await p.locator('.club-tools,[data-act="newClubEvent"],[data-act="approveLog"]').count(),0);
  assert.equal(await p.locator('.rail [data-v="manage"]').count(),0);
});

test('coordinators share People and clubs while attendance stays under Events',async t => {
  const p = await helper.page(t); await helper.signIn(p,1);
  assert.equal(await p.locator('.rail [data-v="manage"]').count(),0);
  await p.locator('.rail [data-v="volunteers"]').click(); await p.locator('.subtabs [data-v="manage"]').click();
  assert.equal(await p.locator('.rail [aria-current="page"]').getAttribute('data-v'),'volunteers');
  assert.equal(await p.locator('.subtabs [data-v="organizers"]').count(),1);
  assert.equal(await p.locator('main [data-act="goCheckin"]').count(),0);
  await p.locator('.rail [data-v="events"]').click(); await p.locator('.subtabs [data-v="checkin"]').click();
  const eventId = await p.evaluate(() => state.events.find(e => e.date === TODAY).id);
  await p.locator('#ci-ev').selectOption(String(eventId));
  const present = p.locator('[data-act="mark"][data-v="attended"]').first(), regId = await present.getAttribute('data-id'); await present.click();
  assert.equal(await p.evaluate(id => state.regs.find(r => r.id === asId(id)).status,regId),'attended');
});

test('settings and organizer controls follow permissions and contain actual organization fields',async t => {
  const p = await helper.page(t); await helper.signIn(p);
  await p.evaluate(() => { state.session.userId = state.users.find(u => u.role === 'coordinator' && !u.verified).id; ui.view = 'dashboard'; ui.tour = null; render(); });
  assert.equal(await p.locator('.rail [data-v="settings"]').count(),0);
  await p.evaluate(() => handlers.nav('settings')); assert.equal(await p.locator('h1').textContent(),'Overview');
  await p.evaluate(() => { currentUser().verified = true; handlers.nav('settings'); });
  assert.equal(await p.locator('#org-name,#org-waiver,#org-zip').count(),3);
  await p.locator('.rail [data-v="volunteers"]').click(); assert.equal(await p.locator('.subtabs [data-v="organizers"]').count(),0);
});

test('Inbox combines shift updates with announcements and expands messages without cards',async t => {
  const p = await helper.page(t,{viewport:{width:390,height:844}}); await helper.signIn(p);
  await p.locator('.rail [data-v="news"]').click();
  assert.ok((await p.locator('.rail').boundingBox()).height <= 56,'Mobile navigation retains its natural height on short pages');
  await p.evaluate(() => { state.notices.push({id:999,userId:2,text:'Your shift was updated.',at:new Date().toISOString(),read:false}); handlers.nav('news'); });
  assert.equal(await p.locator('.message').count(),4); assert.equal(await p.locator('.message.card').count(),0);
  const message = p.locator('#message-update-999'); await message.locator('summary').focus(); await p.keyboard.press('Enter');
  assert.equal(await message.evaluate(el => el.open),true); assert.equal(await message.locator('.message-body').textContent(),'Your shift was updated.');
  await p.evaluate(() => render()); assert.equal(await message.evaluate(el => el.open),true);
});

test('coordinator composition posts exactly one announcement and preserves delete confirmation',async t => {
  const p = await helper.page(t); await helper.signIn(p,1); await p.locator('.rail [data-v="news"]').click();
  const before = await p.evaluate(() => state.announcements.length);
  await p.locator('#inbox-compose > summary').click(); await p.locator('#an-title').fill('Library service update'); await p.locator('#an-body').fill('Please arrive at the side entrance.\nBring a water bottle.'); await p.locator('#annForm [type="submit"]').click();
  assert.equal(await p.evaluate(() => state.announcements.length),before+1);
  const id = await p.evaluate(() => state.announcements[state.announcements.length-1].id), message = p.locator(`#message-announcement-${id}`);
  await message.locator('summary').click(); await message.locator('[data-act="arm"]').click();
  assert.equal(await message.evaluate(el => el.open),true); await message.locator('[data-act="confirm"]').click();
  assert.equal(await p.evaluate(() => state.announcements.length),before);
});

test('all role screens and expanded content fit phone, tablet, desktop, and large text',async t => {
  const p = await helper.page(t);
  for (const [width,height,font,theme,hc] of [[1440,1000,15,'light',false],[1024,768,15,'light',false],[768,1024,15,'light',false],[390,844,15,'dark',false],[320,740,21,'light',true]]){
    await p.setViewportSize({width,height});
    for (const id of [2,1,15]){
      const views = await p.evaluate(({id,font,theme,hc}) => { state.session.userId = id; ui.view = 'dashboard'; ui.tour = null; state.prefs = {font,theme,hc}; render(); return Object.keys(VIEWS[currentUser().role]); },{id,font,theme,hc});
      for (const view of views){
        await p.evaluate(view => { handlers.nav(view); document.querySelectorAll('details.disclosure').forEach(el => el.open = true); },view);
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),`${width}px, user ${id}, ${view}`);
      }
    }
  }
});

test('tutorial follows the revised routes and keyboard focus without marking Inbox read',async t => {
  const p = await helper.page(t); await helper.signIn(p);
  const before = await p.evaluate(() => unreadCount(currentUser())); await p.evaluate(() => startTour());
  let visits = 0;
  while (await p.locator('.tour').count()){
    assert.equal(await p.evaluate(() => document.activeElement.id),'tour-title');
    await p.locator('#tour-next').click(); assert.ok(++visits < 12);
  }
  assert.equal(await p.evaluate(() => unreadCount(currentUser())),before);
  await p.locator('.pv-utility-links [data-act="tour"]').click(); await p.keyboard.press('Escape');
  assert.equal(await p.locator('.tour').count(),0);
});

test('axe finds no accessibility violations across role screens and account forms', {skip:!axePath},async t => {
  const p = await helper.page(t); await p.addScriptTag({path:axePath});
  const scan = async label => assert.deepEqual(await p.evaluate(async () => (await axe.run()).violations.map(v => ({id:v.id,targets:v.nodes.map(n => n.target)}))),[],label);
  for (const [width,theme] of [[1440,'light'],[390,'light'],[1440,'dark'],[390,'dark']]){
    await p.setViewportSize({width,height:1000});
    await p.evaluate(theme => { state.prefs.theme = theme; applyPrefs(); },theme);
    for (const id of [null,2,1]){
      const views = await p.evaluate(id => { state.session.userId = id; ui.view = 'dashboard'; ui.tour = null; render(); return id ? Object.keys(VIEWS[currentUser().role]) : ['login','signup']; },id);
      for (const view of views){
        await p.evaluate(({view,id}) => { if (id) handlers.nav(view); else { ui.authMode = view === 'signup' ? 'signup' : 'login'; render(); } },{view,id});
        await scan(`${width}px ${theme} user ${id}: ${view}`);
      }
    }
  }
});

test('a new member can join, log outside service, and receive approved hours through the merged club workflow',async t => {
  const p = await helper.page(t);
  await p.locator('[data-act="authmode"][data-v="signup"]').click();
  await p.locator('#su-name').fill('Jamie Volunteer'); await p.locator('#su-email').fill('jamie@example.org');
  await p.locator('#su-pass').fill('demo1234'); await p.locator('#su-pass2').fill('demo1234'); await p.locator('#su-waiver').check();
  await p.locator('#signupForm [type="submit"]').click(); await p.locator('[data-act="tourEnd"]').click();
  const userId = await p.evaluate(() => currentUser().id);
  await p.locator('.rail [data-v="hours"]').click(); await p.locator('.subtabs [data-v="clubs"]').click();
  await p.locator('#jc-code').fill('HOSA-7K2PQM'); await p.locator('#joinForm [type="submit"]').click();
  assert.equal(await p.locator('.club-entry').count(),1);
  await p.locator('[data-act="logHours"]').click(); await p.locator('#lg-hours').fill('2.5');
  await p.locator('#lg-place').fill('Community library'); await p.locator('#lg-activity').fill('Helped children select books and practice reading.');
  await p.locator('#lg-sup').fill('Morgan Reader'); await p.locator('#lg-contact').fill('morgan@example.org');
  await p.locator('#logForm [type="submit"]').click();
  const logId = await p.evaluate(() => state.hourLogs[state.hourLogs.length-1].id);
  assert.equal(await p.evaluate(id => state.hourLogs.find(l => l.id === id).status,logId),'pending');
  await p.evaluate(() => handlers.logout()); await helper.signIn(p,1);
  await p.locator('.rail [data-v="volunteers"]').click(); await p.locator('.subtabs [data-v="manage"]').click();
  await p.locator('[data-act="approveLog"][data-id="'+logId+'"]').click();
  assert.equal(await p.evaluate(id => clubHours(1,id).approved,userId),2.5);
  await p.evaluate(() => handlers.logout()); await p.locator('#li-email').fill('jamie@example.org'); await p.locator('#li-pass').fill('demo1234');
  await p.locator('#loginForm [type="submit"]').click(); await p.locator('.rail [data-v="hours"]').click();
  assert.equal(await p.locator('.summary-strip dd').first().textContent(),'2.5');
  await p.locator('.subtabs [data-v="clubs"]').click();
  assert.match(await p.locator('.club-entry').textContent(),/2.5 of 10 hours/);
});

test('club event creation retains protected membership and modal keyboard focus',async t => {
  const p = await helper.page(t); await helper.signIn(p); await p.locator('.rail [data-v="hours"]').click(); await p.locator('.subtabs [data-v="clubs"]').click();
  await p.locator('#club-tools-2 > summary').click(); await p.locator('#club-tools-2 [data-act="newClubEvent"]').click();
  assert.equal(await p.locator('#app').evaluate(el => el.inert),true);
  await p.locator('#modal [data-act="close"]').first().focus(); await p.keyboard.press('Shift+Tab');
  assert.equal(await p.evaluate(() => document.activeElement.type),'submit'); await p.keyboard.press('Tab');
  assert.equal(await p.evaluate(() => document.activeElement.dataset.act),'close');
  await p.locator('#ef-title').fill('Community reading afternoon');
  const venue = await p.evaluate(() => VENUES[0].name); await p.locator('#ef-loc').fill(venue);
  await p.locator('#eventForm [type="submit"]').click();
  assert.equal(await p.locator('#eventForm').count(),0);
  assert.equal(await p.evaluate(() => state.events[state.events.length-1].clubId),2);
  assert.equal(await p.evaluate(() => document.activeElement.dataset.act),'newClubEvent');
  assert.equal(await p.locator('#club-tools-2').evaluate(el => el.open),true);
});

test('calendar controls keep dates, times, status names, and usable phone targets',async t => {
  const p = await helper.page(t);
  for (const id of [2,1]){
    await p.evaluate(id => { state.session.userId = id; ui.view = id === 2 ? 'find' : 'events'; ui.tour = null; ui.find.mode = ui.ev.mode = 'calendar'; render(); },id);
    for (const width of [1440,768,320]){
      await p.setViewportSize({width,height:900});
      const chip = p.locator('.cal-chip').first();
      assert.ok(await chip.count()); assert.match(await chip.getAttribute('aria-label'),/AM|PM/);
      assert.match(await chip.getAttribute('aria-label'),id === 2 ? /Signed up|On waitlist|Spots open|Full/ : /spots filled/);
      if (width === 320) assert.ok(await chip.evaluate(el => el.getBoundingClientRect().height) >= 24);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1));
    }
  }
});
