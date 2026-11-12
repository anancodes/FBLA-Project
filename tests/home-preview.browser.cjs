const test=require('node:test');
const assert=require('node:assert/strict');
const helper=require('./browser-helpers.cjs');
let axePath=process.env.AXE_CORE_PATH;
try{axePath ||= require.resolve('axe-core/axe.min.js')}catch{}
test.before(helper.start);test.after(helper.stop);

test('Home proposal keeps the five destinations and existing event records',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 assert.deepEqual(await p.locator('.rail button').evaluateAll(es=>es.map(e=>e.dataset.v)),['dashboard','find','shifts','hours','news']);
 assert.equal(await p.locator('#account-trigger,select').count(),0);
 const expected=await p.evaluate(()=>userStats(currentUser().id).upcoming.map(r=>eventById(r.eventId)).sort(byDate).slice(0,3).map(e=>String(e.id)));
 assert.deepEqual(await p.locator('.pv-shift [data-act="moreInfo"]').evaluateAll(es=>es.map(e=>e.dataset.id)),expected);
 assert.equal(await p.locator('.pv-hours-percent').textContent(),await p.evaluate(()=>`${Math.round(progressPercent(userStats(currentUser().id).hours,HOUR_GOAL))}% complete`));
});

test('View shift opens by keyboard, traps focus and returns to the same action after a redraw',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 const opener=p.locator('.pv-shift [data-act="moreInfo"]').first();const id=await opener.getAttribute('data-id');
 await opener.focus();await p.keyboard.press('Enter');
 assert.equal(await p.getByRole('dialog').getAttribute('aria-labelledby'),'modal-title');
 assert.equal(await p.locator('#app').evaluate(e=>e.inert),true);
 await p.evaluate(()=>render());
 const last=p.locator('#modal button').last();await last.focus();await p.keyboard.press('Tab');
 assert.equal(await p.evaluate(()=>document.activeElement===modalControls()[0]),true);
 await p.keyboard.press('Escape');
 assert.equal(await p.locator('#app').evaluate(e=>e.inert),false);
 assert.deepEqual(await p.evaluate(()=>[document.activeElement.dataset.act,document.activeElement.dataset.id]),['moreInfo',id]);
});

test('recommendation signup retains booking behavior and updates the Home count',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 const before=await p.evaluate(()=>userStats(currentUser().id).upcoming.length);
 const action=p.locator('.pv-recommendation [data-act="signup"]').first();const id=await action.getAttribute('data-id');await action.click();
 assert.equal(await p.evaluate(id=>myReg(currentUser().id,asId(id)).status,id),'registered');
 assert.equal(await p.evaluate(()=>userStats(currentUser().id).upcoming.length),before+1);
 assert.equal(await p.locator(`.pv-recommendation [data-act="signup"][data-id="${id}"]`).count(),0);
 assert.match(await p.locator('.pv-scheduled-total').textContent(),new RegExp(`^${before+1} upcoming`));
});

test('event distance names the saved city and is omitted without a location',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 await p.evaluate(()=>{currentUser().location=resolveCity('Washington, DC');currentUser().zip='';ui.find.location=null;render()});
 await p.locator('.pv-shift [data-act="moreInfo"]').first().click();
 assert.match(await p.getByRole('dialog').textContent(),/mi from Washington, DC/);await p.keyboard.press('Escape');
 await p.evaluate(()=>{currentUser().location=null;currentUser().zip='';render()});
 await p.locator('.pv-shift [data-act="moreInfo"]').first().click();
 assert.equal(await p.getByRole('dialog').getByText('Distance',{exact:true}).count(),0);
});

test('inline display preferences work by keyboard and survive redraws without a dropdown',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 const trigger=p.locator('#display-trigger');await trigger.focus();await p.keyboard.press('Enter');
 assert.equal(await trigger.getAttribute('aria-expanded'),'true');assert.equal(await p.locator('#home-display-panel').isVisible(),true);
 await p.locator('#home-display-panel [data-act="setTheme"][data-v="dark"]').click();
 assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');assert.equal(await trigger.getAttribute('aria-expanded'),'true');
 await p.locator('#home-display-panel [data-act="contrast"]').click();assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('hc')),true);
 const before=await p.evaluate(()=>state.prefs.font);await p.locator('#home-display-panel [data-act="font"][data-v="2"]').click();assert.equal(await p.evaluate(()=>state.prefs.font),before+2);
 await p.keyboard.press('Escape');assert.equal(await p.locator('#home-display-panel').isVisible(),false);assert.equal(await p.evaluate(()=>document.activeElement.id),'display-trigger');
});

test('preview styling is scoped to volunteer Home while profile, help and coordinator routes remain available',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 await p.locator('.pv-profile').click();assert.equal(await p.locator('#profileForm').count(),1);assert.equal(await p.locator('body.home-preview').count(),0);
 await p.locator('.rail [data-v="dashboard"]').click();assert.equal(await p.locator('body.home-preview').count(),1);
 await p.locator('.pv-utility-links [data-v="help"]').click();assert.equal(await p.locator('h1').textContent(),'Help');
 await p.evaluate(()=>{state.session.userId=1;ui.view='dashboard';render()});
 assert.equal(await p.locator('body.home-preview,.pv-shell').count(),0);assert.equal(await p.locator('h1').textContent(),'Overview');
});

test('empty Home states provide direct actions and preserve accurate zero-hour progress',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 await p.evaluate(()=>{const u=currentUser();u.skills=[];state.regs=state.regs.filter(r=>r.userId!==u.id);state.hourLogs=state.hourLogs.filter(l=>l.userId!==u.id);render()});
 assert.equal(await p.getByRole('heading',{name:'Your schedule is open'}).count(),1);
 assert.equal(await p.getByRole('button',{name:'Find your first shift'}).count(),1);
 await p.getByRole('button',{name:'Add my skills'}).click();assert.equal(await p.locator('#profileForm').count(),1);
 await p.evaluate(()=>handlers.nav('dashboard'));assert.equal(await p.getByRole('progressbar').getAttribute('aria-valuenow'),'0');
});

test('Home, inline settings and event dialogs fit small screens, large text and both themes',async t=>{
 const p=await helper.page(t);await helper.signIn(p);
 for(const[width,font,theme,hc]of[[1440,15,'light',false],[1415,15,'light',false],[1024,15,'light',false],[768,15,'light',false],[390,15,'dark',false],[320,21,'light',true]]){
  await p.setViewportSize({width,height:900});
  await p.evaluate(({font,theme,hc})=>{state.prefs={font,theme,hc};ui.view='dashboard';ui.homeDisplay=false;render()},{font,theme,hc});
  for(const expanded of[false,true]){
   if(expanded)await p.locator('#display-trigger').click();
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px preferences ${expanded}`);
   assert.ok(await p.locator('.rail').evaluate(nav=>{const r=nav.getBoundingClientRect();return [...nav.querySelectorAll('button')].every(b=>{const x=b.getBoundingClientRect();return x.left>=r.left-1&&x.right<=r.right+1&&x.top>=r.top-1&&x.bottom<=r.bottom+1})}),`${width}px all destinations are visible without horizontal scrolling`);
  }
  await p.keyboard.press('Escape');await p.locator('.pv-shift [data-act="moreInfo"]').first().click();
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px dialog`);await p.keyboard.press('Escape');
 }
});

test('the new font loads locally without Google Fonts',async t=>{
 const p=await helper.page(t);await p.route('**/fonts.googleapis.com/**',r=>r.abort());await p.reload();await helper.signIn(p);await p.evaluate(()=>document.fonts.ready);
 assert.ok(await p.evaluate(()=>[...document.fonts].some(f=>f.family==='Public Sans'&&f.status==='loaded')));
});

test('expanded Home states pass accessibility checks in light and dark themes',{skip:!axePath},async t=>{
 const p=await helper.page(t);await helper.signIn(p);await p.addScriptTag({path:axePath});
 const scan=async label=>assert.deepEqual(await p.evaluate(async()=>(await axe.run()).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))),[],label);
 for(const width of[1440,390,320])for(const theme of['light','dark']){
  await p.setViewportSize({width,height:1000});await p.evaluate(theme=>{state.prefs={font:15,theme,hc:false};ui.homeDisplay=false;render()},theme);
  await scan(`${width}px ${theme} Home`);await p.locator('#display-trigger').click();await scan(`${width}px ${theme} preferences`);await p.keyboard.press('Escape');
  await p.locator('.pv-shift [data-act="moreInfo"]').first().click();await scan(`${width}px ${theme} event dialog`);await p.keyboard.press('Escape');
 }
});
