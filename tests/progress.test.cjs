/* Run with: node --test tests/progress.test.cjs (no dependencies). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function app(){
  const context = vm.createContext({localStorage:{getItem:() => null, setItem:() => {}}});
  for (const file of ['utils.js', 'data.js', 'store.js', 'components.js']){
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../volunteerhub-web/vh-web/js', file), 'utf8'), context);
  }
  return expression => vm.runInContext(expression, context);
}

test('goal percentages cover empty, partial, complete, and exceeded goals', () => {
  const run = app();
  for (const [hours, percent] of [[0,0], [15,25], [30,50], [45,75], [60,100], [75,100]]){
    assert.equal(run(`progressPercent(${hours}, HOUR_GOAL)`), percent);
  }
});

test('invalid totals cannot produce negative, infinite, or oversized bars', () => {
  const run = app();
  for (const expression of ['progressPercent(-5, 60)', 'progressPercent(5, 0)', 'progressPercent(5, -1)', 'progressPercent(NaN, 60)', 'progressPercent(Infinity, 60)']){
    assert.equal(run(expression), 0);
  }
  assert.equal(run('progressPercent(1000, 60)'), 100);
});

test('fractional progress keeps its real value and does not complete early', () => {
  const run = app();
  const html = run('hourGoalTile(59.9)');
  assert.match(html, /class="val">99<small>%/);
  assert.doesNotMatch(html, /Goal complete/);
  assert.match(html, /aria-valuetext="59.9 of 60 verified hours"/);
});

test('completed goals keep actual earned hours while capping the bar', () => {
  const html = app()('hourGoalTile(75)');
  assert.match(html, /aria-valuenow="100"/);
  assert.match(html, /width:100%/);
  assert.match(html, /75 of 60 verified hours; goal complete/);
  assert.match(html, /Goal complete/);
});

test('staffing counts held spots and excludes waitlisted or cancelled registrations', () => {
  const run = app();
  const html = run(`
    state.regs = ['registered', 'attended', 'no-show', 'waitlist', 'cancelled'].map((status, i) => ({id:i, eventId:999, status}));
    fillMeter({id:999, title:'Community cleanup', slots:6});
  `);
  assert.match(html, /role="meter"/);
  assert.match(html, /aria-valuenow="50"/);
  assert.match(html, /aria-valuetext="3 of 6 spots filled"/);
});

test('goal bars expose an accessible task name and value', () => {
  const html = app()('hourGoalTile(30)');
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-label="Service hour goal"/);
  assert.match(html, /aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"/);
});

test('event names are escaped in meter labels', () => {
  const html = app()(`fillMeter({id:999, title:'Cleanup "crew" <park>', slots:4})`);
  assert.match(html, /Cleanup &quot;crew&quot; &lt;park&gt;/);
  assert.doesNotMatch(html, /<park>/);
});
