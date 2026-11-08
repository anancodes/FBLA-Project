/* See tests/README.md for the optional Playwright setup. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
let axePath = process.env.AXE_CORE_PATH;
try { axePath ||= require.resolve('axe-core/axe.min.js'); } catch {}

const root = path.resolve(__dirname, '../volunteerhub-web/vh-web');
let server, browser, baseURL;
test.before(async () => {
  server = http.createServer((req, res) => {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      const types = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript'};
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.BROWSER_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({executablePath, headless:true, args:['--no-sandbox']});
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
async function newPage(t, options = {}){
  const page = await browser.newPage(options), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, [], 'No uncaught page errors'); });
  await page.goto(baseURL);
  return page;
}

for (const [id, role, destination] of [[2,'volunteer','hours'], [1,'coordinator','reports']]){
  test(`${role} tour supports back, navigation, completion, replay, and Escape`, async t => {
    const page = await newPage(t, {viewport:{width:390,height:844}});
    await page.locator(`[data-act="demo"][data-v="${id}"]`).click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tour-title');
    // A refresh before completion should still offer the first-login guide.
    await page.reload();
    assert.equal(await page.locator('.tour').count(), 1);
    const unreadBefore = await page.evaluate(() => unreadCount(currentUser()));
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.act), 'tourEnd');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tour-next');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tour-back');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tour-title');
    assert.equal(await page.locator('#tour-back').count(), 0);
    await page.locator(`.rail [data-v="${destination}"]`).click();
    assert.equal(await page.evaluate(() => TOURS[currentUser().role][ui.tour.i].view), destination);
    // Restart and visit every step without treating announcements as read.
    await page.evaluate(() => startTour());
    let visits = 0;
    while (await page.locator('.tour').count()){
      assert.equal(await page.evaluate(() => document.activeElement.id), 'tour-title');
      assert.equal(await page.evaluate(() => ui.view === TOURS[currentUser().role][ui.tour.i].view), true);
      await page.locator('#tour-next').click();
      visits++;
    }
    assert.equal(visits, 7);
    assert.equal(await page.evaluate(() => ui.view), destination);
    assert.equal(await page.evaluate(() => unreadCount(currentUser())), unreadBefore);
    await page.reload();
    assert.equal(await page.locator('.tour').count(), 0, 'Finished tours stay dismissed');
    await page.locator('.rail [data-v="help"]').click();
    await page.locator('#tour-start').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => ui.view), 'help');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tour-start');
    if (role === 'volunteer'){
      await page.locator('.rail [data-v="profile"]').click();
      await page.locator('#tour-start').click();
      await page.locator('[data-act="tourEnd"]').click();
      assert.equal(await page.evaluate(() => ui.view), 'profile');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'tour-start');
    }
  });
}

test('progress colors form a continuous accessible spectrum in both themes', async t => {
  const page = await newPage(t);
  for (const mode of ['light', 'dark']){
    await page.emulateMedia({colorScheme:mode});
    const result = await page.evaluate(() => {
      const canvas = document.createElement('canvas').getContext('2d');
      function rgb(color){ canvas.clearRect(0,0,1,1); canvas.fillStyle = color; canvas.fillRect(0,0,1,1); return [...canvas.getImageData(0,0,1,1).data].slice(0,3); }
      function luminance(color){ return color.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum,x,i) => sum + x * [.2126,.7152,.0722][i], 0); }
      const samples = [];
      for (let pct = 0; pct <= 100; pct++){
        const box = document.createElement('div');
        box.innerHTML = hourGoalTile(pct / 100 * HOUR_GOAL);
        document.body.append(box);
        const meter = box.querySelector('.meter'), bar = meter.firstElementChild;
        const computed = getComputedStyle(bar).backgroundColor;
        const [l,c,h] = computed.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/g).map(Number);
        const lab = [l, c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)];
        const color = rgb(computed), track = rgb(getComputedStyle(meter).backgroundColor);
        const [low,high] = [luminance(color),luminance(track)].sort((a,b) => a-b);
        samples.push({pct, color, lab, contrast:(high + .05)/(low + .05)});
        box.remove();
      }
      return samples;
    });
    assert.ok(Math.min(...result.map(x => x.contrast)) >= 3, `${mode}: filled bar contrasts with its track`);
    const low = result[0].color, mid = result[50].color, full = result[100].color;
    assert.ok(low[0] > low[1] && low[0] > low[2], 'Low progress is red');
    assert.ok(mid[0] > mid[2] * 3 && mid[1] > mid[2] * 3, 'Halfway is yellow');
    assert.ok(full[1] > full[0] && full[1] > full[2], 'Complete is green');
    const saturation = rgb => { const lo = Math.min(...rgb)/255, hi = Math.max(...rgb)/255; return (hi-lo)/(1-Math.abs(hi+lo-1)); };
    assert.ok(saturation(full) > saturation(low), 'High progress is more saturated');
    assert.equal(new Set(result.map(x => x.color.join(','))).size, 101, 'No color thresholds or plateaus');
    for (let i = 1; i < result.length; i++){
      const delta = Math.sqrt(result[i].lab.reduce((sum,v,k) => sum + (v - result[i-1].lab[k]) ** 2, 0));
      assert.ok(delta < .02, 'Adjacent percentages change smoothly in perceptual color space');
    }
  }
});

test('all role screens fit desktop, mobile dark mode, and maximum text size', async t => {
  const page = await newPage(t);
  for (const [width,height,theme,font,hc] of [[1440,1000,'light',15,false], [1024,768,'light',15,false], [768,1024,'light',15,false], [390,844,'dark',15,false], [320,740,'light',21,true]]){
    await page.setViewportSize({width,height});
    await page.emulateMedia({colorScheme:theme});
    for (const id of [2,1]){
      const views = await page.evaluate(({id,font,hc}) => {
        state.session.userId = id; state.prefs.font = font; state.prefs.hc = hc; ui.tour = null;
        return NAV[currentUser().role].map(x => x[0]);
      }, {id,font,hc});
      for (const view of views){
        await page.evaluate(view => handlers.nav(view), view);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px: ${id}/${view} fits`);
        if (view === 'hours' && width === 390){
          assert.ok(await page.locator('.hb-track').first().evaluate(el => el.getBoundingClientRect().width) > 80, 'Phone charts retain visible tracks');
          assert.equal((await page.locator('.hb-bar').evaluateAll(els => new Set(els.map(el => getComputedStyle(el).backgroundColor)).size)), 1);
        }
      }
      await page.evaluate(() => { handlers.nav(currentUser().role === 'volunteer' ? 'find' : 'events'); ui[currentUser().role === 'volunteer' ? 'find' : 'ev'].mode = 'calendar'; render(); });
      const chips = page.locator('.cal-chip');
      assert.ok(await chips.count() > 0);
      assert.ok((await chips.first().getAttribute('aria-label')).length > 15);
      if (width <= 640) assert.ok(await chips.first().evaluate(el => el.getBoundingClientRect().height) >= 24);
    }
  }
});

test('event pop-ups contain focus and restore it after signup redraws the page', async t => {
  const page = await newPage(t);
  await page.locator('[data-act="demo"][data-v="2"]').click();
  await page.locator('[data-act="tourEnd"]').click();
  await page.locator('.rail [data-v="find"]').click();
  const opener = page.locator('.ev').filter({has:page.locator('[data-act="signup"]')}).first().locator('[data-act="moreInfo"]');
  const eventId = await opener.getAttribute('data-id');
  await opener.click();
  assert.equal(await page.locator('#app').evaluate(el => el.inert), true);
  assert.equal(await page.locator('[role="dialog"]').getAttribute('aria-labelledby'), 'modal-title');
  await page.locator('#modal [data-act="close"]').focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.act), 'concern');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.act), 'close');
  await page.locator('#modal [data-act="signup"]').click();
  assert.ok(await page.evaluate(() => !!document.activeElement.closest('#modal')), 'Focus survives updated registration controls');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[role="dialog"]').count(), 0);
  assert.equal(await page.locator('#app').evaluate(el => el.inert), false);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.act), 'moreInfo');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.id), eventId);
});

test('saving an event restores focus to its recreated edit button', async t => {
  const page = await newPage(t);
  await page.locator('[data-act="demo"][data-v="1"]').click();
  await page.locator('[data-act="tourEnd"]').click();
  await page.locator('.rail [data-v="events"]').click();
  const opener = page.locator('[data-act="editEvent"]').first();
  const eventId = await opener.getAttribute('data-id');
  await opener.click();
  await page.locator('#ef-title').fill('Updated community event');
  await page.locator('#eventForm [type="submit"]').click();
  assert.equal(await page.locator('[role="dialog"]').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.act), 'editEvent');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.id), eventId);
});

test('axe reports no accessibility violations on role screens, tours, or sample dialogs', {skip:!axePath}, async t => {
  const page = await newPage(t);
  await page.addScriptTag({path:axePath});
  async function scan(label){
    const violations = await page.evaluate(async () => (await axe.run()).violations.map(v => ({id:v.id, targets:v.nodes.map(n => n.target)})));
    assert.deepEqual(violations, [], label);
  }
  for (const theme of ['light', 'dark']){
    await page.emulateMedia({colorScheme:theme});
    await page.evaluate(() => { state.session.userId = null; ui.tour = null; closeModal(false); render(); });
    await scan(`${theme}: login`);
    for (const id of [2,1]){
      const views = await page.evaluate(id => { state.session.userId = id; return NAV[currentUser().role].map(x => x[0]); }, id);
      for (const view of views){
        await page.evaluate(view => handlers.nav(view), view);
        await scan(`${theme}: ${id}/${view}`);
      }
      await page.evaluate(() => startTour());
      await scan(`${theme}: ${id}/tour`);
      await page.evaluate(() => { endTour(); showEventPopup(state.events.find(e => e.date >= TODAY).id); });
      await scan(`${theme}: ${id}/event details`);
      await page.evaluate(() => { closeModal(false); openModal(currentUser().role === 'volunteer' ? certificate(currentUser()) : eventForm(null)); });
      await scan(`${theme}: ${id}/certificate or event form`);
      await page.evaluate(() => closeModal(false));
    }
  }
});
