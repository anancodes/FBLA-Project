const test=require('node:test');
const assert=require('node:assert/strict');
const helper=require('./browser-helpers.cjs');
test.before(helper.start);test.after(helper.stop);

test('website links retain the page through browser Back, Forward and refresh',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 await p.locator('.rail a[data-v="shifts"]').click();assert.equal(new URL(p.url()).hash,'#shifts');
 await p.locator('.rail a[data-v="hours"]').click();assert.equal(new URL(p.url()).hash,'#hours');
 await p.goBack();await p.waitForFunction(()=>ui.view==='shifts');assert.equal(await p.locator('h1').textContent(),'My schedule');
 await p.goForward();await p.waitForFunction(()=>ui.view==='hours');assert.equal(await p.locator('h1').textContent(),'My hours');
 await p.reload();assert.equal(await p.locator('h1').textContent(),'My hours');assert.match(await p.title(),/My hours/);
});

test('modified link clicks open the selected page in a new tab without navigating the original',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 await p.context().route('**/js/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.FIREBASE_CONFIG={}; window.VH_OFFLINE_WORKBOOK=true;'}));
 const opened=p.context().waitForEvent('page');await p.locator('.rail a[data-v="hours"]').click({modifiers:['Control']});
 const tab=await opened;t.after(()=>tab.close());await tab.waitForURL('**/#hours');
 await tab.waitForFunction(()=>typeof currentUser==='function'&&currentUser()&&ui.view==='hours');
 assert.equal(new URL(tab.url()).hash,'#hours');assert.equal(await tab.locator('h1').textContent(),'My hours');
 assert.equal(await p.evaluate(()=>ui.view),'dashboard');
});

test('direct URLs enforce the same role restrictions and keep display settings available',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 await p.evaluate(()=>{state.session.userId=state.users.find(u=>u.role==='coordinator'&&!u.verified).id;save();location.hash='settings'});
 await p.waitForFunction(()=>ui.view==='dashboard');await p.reload();
 assert.equal(await p.locator('h1').textContent(),'Overview');assert.equal(new URL(p.url()).hash,'#dashboard');
 assert.equal(await p.locator('.rail [data-v="settings"]').count(),0);
 await p.locator('#display-trigger').click();assert.equal(await p.locator('#display-settings-panel').isVisible(),true);
 await p.keyboard.press('Escape');assert.equal(await p.locator('#display-trigger').getAttribute('aria-expanded'),'false');
});

test('website form fields retain focused and invalid borders with their error messages',async t=>{
 const p=await helper.page(t);await helper.signIn(p);await p.locator('.pv-profile').click();
 const input=p.locator('#p-location');await input.fill('Atlantis under the sea');await p.locator('#profileForm [type="submit"]').click();
 assert.equal(await input.getAttribute('aria-invalid'),'true');assert.match(await p.locator('#e-location').textContent(),/Choose a city/);
 assert.equal(await input.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(166, 62, 56)');
 await input.fill('Washington, DC');await p.locator('#profileForm [type="submit"]').click();await input.focus();
 assert.notEqual(await input.getAttribute('aria-invalid'),'true');assert.equal(await input.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(34, 98, 77)');
});
