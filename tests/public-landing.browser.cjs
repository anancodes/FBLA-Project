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
  await p.context().route('**/js/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.FIREBASE_CONFIG={}; window.VH_OFFLINE_WORKBOOK=true;'}));
  const popup=p.context().waitForEvent('page');
  await p.getByRole('link',{name:'Create an account',exact:true}).click({modifiers:['Control']});
  const tab=await popup;t.after(()=>tab.close());
  await tab.waitForURL('**/#signup');await tab.waitForFunction(()=>typeof ui!=='undefined'&&ui.authMode==='signup');
  assert.equal(await tab.locator('h1').textContent(),'Create an account');
  assert.equal(await p.locator('h1').textContent(),'Sign in');
});

test('public entry requires sign-in and each account opens only its own role',async t=>{
  const p=await helper.page(t);
  assert.equal(await p.locator('[data-act="demo"],[href="#demo"]').count(),0);
  for(const role of ['volunteer','coordinator']){
    await helper.signIn(p,role==='volunteer'?2:1);
    assert.equal(await p.evaluate(()=>currentUser().role),role);
    assert.equal(await p.locator('.rail a[data-v="events"]').count(),role==='coordinator'?1:0);
    assert.equal(await p.locator('footer .account-disclaimer').count(),1);
    await p.locator('[data-act="logout"]').click();
    assert.equal(await p.locator('h1').textContent(),'Sign in');
  }
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
  await p.locator('#li-email').fill('maya.chen@example.org');await p.locator('#li-pass').fill('demo1234');
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


test('public pages confine the disclaimer to the footer and offer both roles at registration',async t=>{
  const p=await helper.page(t);
  for (const mode of ['landing','login','signup']){
    await p.evaluate(mode=>navigatePublic(mode),mode);
    assert.equal(await p.locator('main, header').allTextContents().then(parts=>/demo/i.test(parts.join(' '))),false);
    assert.equal(await p.locator('footer small').textContent(),'(Demo activity is fictional.)');
  }
  await p.locator('#signupForm [type="submit"]').click();
  assert.match(await p.locator('#e-role').textContent(),/Choose a role/);
  await p.getByRole('radio',{name:/Volunteer/}).check();
  assert.equal(await p.locator('#su-waiver').isVisible(),true);
  await p.getByRole('radio',{name:/Coordinator/}).check();
  assert.equal(await p.locator('#su-waiver').isVisible(),false);
});

test('public display settings dismiss outside and keep saved preferences',async t=>{
  const p=await helper.page(t,{viewport:{width:390,height:844}});
  await p.locator('.landing-actions a[href="#login"]').click();
  const trigger=p.getByRole('button',{name:'Display settings',exact:true});
  const panel=p.locator('#display-settings-panel');
  await trigger.click();
  await panel.getByRole('button',{name:'Dark',exact:true}).click();
  assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');
  assert.equal(await trigger.getAttribute('aria-expanded'),'true');
  await p.mouse.click(4,4);
  assert.equal(await panel.isVisible(),false);
  await p.reload();
  assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');
});

test('a hosted page with unavailable Firebase keeps old browser sessions signed out',async t=>{
  const p=await helper.page(t);
  await p.evaluate(()=>{const old=seed();old.session.userId=1;localStorage.setItem(KEY,JSON.stringify(old));});
  await p.route('**/js/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.FIREBASE_CONFIG = {};'}));
  await p.goto(p.url().split('#')[0]+'#reports');await p.reload();
  await p.getByRole('heading',{name:'Sign in'}).waitFor();
  assert.equal(await p.evaluate(()=>currentUser()),null);
  assert.equal(await p.locator('#loginForm [type="submit"]').isDisabled(),true);
  assert.match(await p.locator('.load-status').textContent(),/Sign-in is unavailable/);
  assert.equal(await p.locator('.rail,[data-act="demo"]').count(),0);
});
