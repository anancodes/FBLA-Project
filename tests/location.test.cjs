const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ctx = vm.createContext({orgPlace:() => 'Washington, DC'});
for (const name of ['utils.js','zipdata.js','geo.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../volunteerhub-web/vh-web/js',name),'utf8'),ctx);
const run = expression => vm.runInContext(expression,ctx);

test('city lookup accepts a city and state and stores only city-level coordinates',() => {
  assert.equal(run("placeName(resolveCity(' washington, dc '))"),'Washington, DC');
  assert.equal(run("Object.keys(resolveCity('Washington, DC')).sort().join(',')"),'city,lat,lon,st');
  assert.equal(run("Number.isFinite(resolveCity('Washington, DC').lat) && Number.isFinite(resolveCity('Washington, DC').lon)"),true);
});
test('ambiguous or unknown locations require a selection instead of silently guessing',() => {
  assert.equal(run("resolveCity('Springfield')"),null);
  assert.equal(run("resolveCity('Atlantis under the sea')"),null);
  assert.match(run("cityError('Atlantis under the sea')"),/Choose a city/);
});
test('location stays optional and absent profiles do not receive an inferred location',() => {
  assert.equal(run("cityError('')"),'');
  assert.equal(run('userLocation({})'),null);
  assert.equal(run("userLocation({location:null,zip:''})"),null);
});
test('previously supplied ZIP locations retain their city without requiring a data reset',() => {
  assert.equal(run("placeName(userLocation({zip:'20018'}))"),'Washington, DC');
  assert.equal(run("placeName(userLocation({zip:'20018',location:{city:'Arlington',st:'VA'}}))"),'Arlington, VA');
});
test('suggestions are bounded and HTML-safe',() => {
  assert.ok(run("(cityOptions('new').match(/<option /g)||[]).length") <= 16);
  assert.equal(run("cityOptions('<script>alert(1)</script>')"),'');
});
test('distance calculations use city centers and give zero for the same point',() => {
  assert.equal(run("distanceMiles(resolveCity('Washington, DC'),resolveCity('Washington, DC'))"),0);
  assert.ok(run("distanceMiles(resolveCity('Washington, DC'),resolveCity('Arlington, VA'))") > 0);
});
