const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const helper=require('./browser-helpers.cjs');
test.before(helper.start);test.after(helper.stop);

test('public account links preserve browser history, refresh and new-tab behavior',async t=>{
  const p=await helper.page(t);
  assert.match(await p.locator('h1').textContent(),/Show up for your community/);
  await p.locator('.landing-actions a[href="#login"]').click();
  assert.equal(new URL(p.url()).hash,'#login');
  assert.equal(await p.locator('h1').textContent(),'Sign in');
  assert.equal(await p.locator('h1').evaluate(e=>e===document.activeElement),true);
  await p.getByRole('link',{name:'Create an account',exact:true}).click();
  assert.equal(new URL(p.url()).hash,'#signup');
  await p.reload();assert.equal(await p.locator('h1').textContent(),'Create an account');
  await p.goBack();await p.waitForFunction(()=>ui.authMode==='login');
  await p.goBack();await p.waitForFunction(()=>ui.authMode==='landing');
  await p.goForward();await p.waitForFunction(()=>ui.authMode==='login');
  await p.context().route('**/js/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.FIREBASE_CONFIG={};'}));
  const popup=p.context().waitForEvent('page');
  await p.getByRole('link',{name:'Create an account',exact:true}).click({modifiers:['Control']});
  const tab=await popup;t.after(()=>tab.close());
  await tab.waitForURL('**/#signup');await tab.waitForFunction(()=>typeof ui!=='undefined'&&ui.authMode==='signup');
  assert.equal(await tab.locator('h1').textContent(),'Create an account');
  assert.equal(await p.locator('h1').textContent(),'Sign in');
});

test('the landing page offers both demo roles and preserves their permissions',async t=>{
  const p=await helper.page(t);
  await p.locator('.landing-actions a[href="#demo"]').click();
  assert.equal(new URL(p.url()).hash,'#demo');
  await helper.signIn(p,2);assert.equal(await p.evaluate(()=>currentUser().role),'volunteer');
  assert.equal(await p.locator('.rail a[data-v="events"]').count(),0);
  await p.locator('[data-act="logout"]').click();assert.equal(await p.locator('h1').textContent(),'Sign in');
  await helper.signIn(p,1);assert.equal(await p.evaluate(()=>currentUser().role),'coordinator');
  assert.equal(await p.locator('.rail a[data-v="events"]').count(),1);
});

test('keyboard users can skip navigation, enter sign-in and recover from missing credentials',async t=>{
  const p=await helper.page(t);
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'Skip to content');
  await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.id),'main');
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('href')),'#login');
  await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.id),'page-title');
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'li-email');
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'li-pass');
  await p.keyboard.press('Tab');await p.keyboard.press('Enter');
  assert.match(await p.locator('#li-err').textContent(),/Enter your email and password/);
  await p.locator('#li-email').fill('volunteer@demo.org');await p.locator('#li-pass').fill('demo1234');
  await p.locator('#loginForm [type="submit"]').click();
  assert.equal(await p.evaluate(()=>currentUser().role),'volunteer');
});

test('live account forms wait for connection and password reset returns to the sign-in URL',async t=>{
  const p=await helper.page(t);
  await p.evaluate(()=>{Cloud.enabled=true;Cloud.ready=false;navigatePublic('login')});
  assert.equal(await p.locator('#loginForm [type="submit"]').isDisabled(),true);
  await p.evaluate(()=>{Cloud.ready=true;Cloud.resetPassword=async email=>{window.resetRecipient=email};navigatePublic('reset')});
  await p.locator('#rs-email').fill('not-an-email');await p.locator('#resetForm [type="submit"]').click();
  assert.equal(await p.locator('#rs-email').getAttribute('aria-invalid'),'true');
  await p.locator('#rs-email').fill('person@example.org');await p.locator('#resetForm [type="submit"]').click();
  await p.waitForFunction(()=>ui.authMode==='login');
  assert.equal(new URL(p.url()).hash,'#login');assert.equal(await p.evaluate(()=>window.resetRecipient),'person@example.org');
});

test('public pages remain readable across sizes, themes and a missing hero image',async t=>{
  const p=await helper.page(t),axePath=process.env.AXE_CORE_PATH;
  for(const theme of ['light','dark']){
    for(const width of [320,390,768,1024,1440]){
      await p.setViewportSize({width,height:1000});
      for(const mode of ['landing','login','signup']){
        await p.evaluate(({theme,mode})=>{state.prefs.theme=theme;ui.authMode=mode;render()},{theme,mode});
        await p.evaluate(()=>document.fonts.ready);
        assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${mode} ${theme} ${width}px`);
        if(axePath&&width===390){
          assert.ok(fs.existsSync(axePath));await helper.loadAxe(p,axePath);
          const violations=await p.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations);
          assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${mode} ${theme}`);
        }
      }
    }
  }
  await p.evaluate(()=>{ui.authMode='landing';state.prefs.font=21;state.prefs.hc=true;render()});
  await p.setViewportSize({width:320,height:1000});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Enlarged text and high contrast');
  assert.equal(await p.locator('main img').count(),1,'One photographic scene');
  await p.route('**/images/community-garden.webp',r=>r.abort());
  await p.goto(p.url().split('#')[0]+'#home');await p.reload();
  assert.equal(await p.locator('.landing-actions a[href="#login"]').isVisible(),true);
  await p.locator('.landing-actions a[href="#login"]').click();assert.equal(await p.locator('#li-email').isVisible(),true);
});
