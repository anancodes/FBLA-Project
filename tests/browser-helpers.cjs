const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'../volunteerhub-web/vh-web');
let browser, server, url;
exports.start = async () => {
  server = http.createServer((req,res) => {
    const file = path.resolve(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1) || 'index.html');
    if (!file.startsWith(root+path.sep)) return res.writeHead(403).end();
    fs.readFile(file,(err,data) => {
      if (err) return res.writeHead(404).end();
      res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[path.extname(file)] || 'application/octet-stream'); res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  url = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),args:['--no-sandbox']});
};
exports.stop = async () => { if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); };
exports.page = async (t,options = {}) => {
  const page = await browser.newPage({viewport:{width:1440,height:1000},...options}), errors = [];
  page.on('pageerror',e => errors.push(e.message));
  // Tests use isolated sample data and never connect to the production database.
  await page.route('**/js/firebase-config.js',route => route.fulfill({contentType:'text/javascript',body:'window.FIREBASE_CONFIG = {};'}));
  t.after(async () => { await page.close(); assert.deepEqual(errors,[],'No uncaught app errors'); });
  await page.goto(url);
  return page;
};
exports.signIn = async (page,id = 2) => {
  await page.evaluate(() => state.users.forEach(u => u.toured = true));
  await page.locator(`[data-act="demo"][data-v="${id}"]`).click();
};
