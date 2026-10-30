// End-to-end check of the personaliser using Playwright.
// Usage: start the app (npm run dev), then: npm run test:e2e
// Env: APP_URL (default http://localhost:5173), SHOT_DIR (default ./test-results)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is not installed. Run `npm i -D playwright && npx playwright install chromium` first.');
  process.exit(1);
}

const URL = process.env.APP_URL ?? 'http://localhost:5173';
const OUT = path.resolve(process.env.SHOT_DIR ?? 'test-results');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [];

async function openPage(options) {
  const page = await browser.newPage(options);
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  await page.waitForFunction(() => window.__treeDebug?.names?.length === 3 && window.__viewerDebug, null, {
    timeout: 90_000,
  });
  await page.waitForTimeout(2500);
  return page;
}

const canvasShot = (page, file) =>
  page.locator('canvas').screenshot(file ? { path: path.join(OUT, file) } : {});
const names = (page) => page.evaluate(() => window.__treeDebug.names.map((n) => n.text));
const cam = (page) =>
  page.evaluate(() => ({
    azimuth: window.__viewerDebug.azimuth(),
    distance: window.__viewerDebug.distance(),
  }));
const settle = (page, ms = 1500) => page.waitForTimeout(ms);

// ---------------------------------------------------------------- desktop
const page = await openPage({ viewport: { width: 1440, height: 900 } });
await page.screenshot({ path: path.join(OUT, 'desktop-full.png') });
check('page loads with product title', (await page.locator('h1').innerText()).includes('Personalised Family Christmas Tree'));
check('3D tree renders default names', JSON.stringify(await names(page)) === JSON.stringify(['EMMA', 'NOAH', 'OLIVER']));
const viewerBox = await page.locator('canvas').boundingBox();
check('3D viewer takes ~65% of content width', viewerBox.width / 1440 > 0.55, `${Math.round(viewerBox.width)}px`);

const camBefore = await cam(page);
for (const [i, value] of [
  [1, 'Grandma'],
  [2, 'Isabella'],
  [3, 'Christabella'],
]) {
  const before = await canvasShot(page);
  await page.fill(`[data-testid=name-${i}]`, value);
  await settle(page, 800);
  const after = await canvasShot(page, `name-${i}-changed.png`);
  const rendered = (await names(page))[i - 1];
  check(`Name ${i} updates the 3D model`, rendered === value.toUpperCase() && !before.equals(after), rendered);
}
const camAfter = await cam(page);
check(
  'camera position kept while typing',
  Math.abs(camBefore.azimuth - camAfter.azimuth) < 1e-6 && Math.abs(camBefore.distance - camAfter.distance) < 1e-6,
);

const bottom = await page.evaluate(() => window.__treeDebug.names[2]);
check('12-character name fits the bottom banner', bottom.width <= 8.71, `width ${bottom.width.toFixed(2)} cm`);
const topBefore = await page.evaluate(() => window.__treeDebug.names[0]);
await page.fill('[data-testid=name-1]', 'Wilhelmina M');
await settle(page, 800);
const topAfter = await page.evaluate(() => window.__treeDebug.names[0]);
await canvasShot(page, 'long-names.png');
check(
  'long name auto-shrinks to fit the narrow top banner',
  topAfter.size < topBefore.size && topAfter.width <= 5.01,
  `size ${topBefore.size.toFixed(2)} → ${topAfter.size.toFixed(2)}, width ${topAfter.width.toFixed(2)} cm`,
);
await page.fill('[data-testid=name-3]', 'Christabellaxyz');
check('names are limited to 12 characters', (await page.inputValue('[data-testid=name-3]')).length === 12);

// rotation by mouse drag
const cx = viewerBox.x + viewerBox.width / 2;
const cy = viewerBox.y + viewerBox.height / 2;
const az0 = (await cam(page)).azimuth;
await page.mouse.move(cx, cy);
await page.mouse.down();
for (let s = 1; s <= 20; s++) await page.mouse.move(cx + s * 20, cy, { steps: 1 });
await page.mouse.up();
await settle(page);
const az1 = (await cam(page)).azimuth;
check('mouse drag rotates the tree', Math.abs(az1 - az0) > 0.3, `Δazimuth ${(az1 - az0).toFixed(2)} rad`);
await canvasShot(page, 'rotated-side.png');

// full 360° spin
await page.click('[data-testid=spin-360]');
await settle(page, 3500);
const az2 = (await cam(page)).azimuth;
check('360° spin turns a full revolution', Math.abs(az2 - az1 - Math.PI * 2) < 0.05, `Δ ${(az2 - az1).toFixed(2)} rad`);

// back view
await page.evaluate(() => window.__viewerDebug.rotateTo(Math.PI));
await settle(page, 1200);
await canvasShot(page, 'back-view.png');
check('back of the tree can be viewed', Math.abs(Math.cos((await cam(page)).azimuth) + 1) < 0.01);

// zoom via wheel and buttons
const d0 = (await cam(page)).distance;
await page.mouse.move(cx, cy);
await page.mouse.wheel(0, -600);
await settle(page);
const d1 = (await cam(page)).distance;
check('scroll wheel zooms in', d1 < d0 - 1, `${d0.toFixed(1)} → ${d1.toFixed(1)}`);
await page.getByRole('button', { name: 'Zoom out' }).click();
await settle(page);
const d2 = (await cam(page)).distance;
check('zoom-out button zooms out', d2 > d1 + 1, `${d1.toFixed(1)} → ${d2.toFixed(1)}`);
const pageScroll = await page.evaluate(() => window.scrollY);
check('wheel over viewer does not scroll the page', pageScroll === 0);

// reset view
await page.click('[data-testid=reset-view]');
await settle(page, 4000);
const reset = await cam(page);
check(
  'Reset View returns to the front',
  Math.abs(Math.sin(reset.azimuth)) < 0.01 && Math.cos(reset.azimuth) > 0.99 && Math.abs(reset.distance - camBefore.distance) < 0.2,
);

// colours: every main colour, plus each accent on green; matching pairs are blocked
const combos = [
  ['white', 'green'],
  ['red', 'white'],
  ['gold', 'red'],
  ['green', 'white'],
  ['green', 'gold'],
  ['green', 'red'],
];
for (const [tree, letters] of combos) {
  const before = await canvasShot(page);
  await page.click(`label:has([data-testid=tree-colour-${tree}])`);
  await page.click(`label:has([data-testid=letter-colour-${letters}])`);
  await settle(page, 700);
  const after = await canvasShot(page, `colour-${tree}-${letters}.png`);
  check(`colour ${tree} tree / ${letters} names applies`, !before.equals(after));
}
for (const tree of ['green', 'white', 'red', 'gold']) {
  await page.click(`label:has([data-testid=tree-colour-${tree}])`);
  const blocked = await page.isDisabled(`[data-testid=letter-colour-${tree}]`);
  const accent = await page.evaluate(() => document.querySelector('input[name=letter-colour]:checked').value);
  check(`only two distinct colours with ${tree} tree`, blocked && accent !== tree, `accent ${accent}`);
}
await page.click(`label:has([data-testid=tree-colour-green])`);
await page.click(`label:has([data-testid=letter-colour-red])`);
await settle(page, 500);

// design summary
await page.click('[data-testid=design-ready]');
const summary = await page.locator('[data-testid=design-summary]').innerText();
check('"Your Design Is Ready" shows names and colours', ['Wilhelmina M', 'Isabella', 'Christabella', 'Traditional green', 'Red'].every((s) => summary.includes(s)));
await page.screenshot({ path: path.join(OUT, 'design-summary.png') });
await page.keyboard.press('Escape');

await page.click('[data-testid=reset-personalisation]');
await settle(page, 800);
check('Reset Personalisation restores defaults', JSON.stringify(await names(page)) === JSON.stringify(['EMMA', 'NOAH', 'OLIVER']));
await canvasShot(page, 'desktop-viewer.png');
await page.close();

// ---------------------------------------------------------------- mobile
const mobile = await openPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await mobile.screenshot({ path: path.join(OUT, 'mobile.png') });
const mViewer = await mobile.locator('canvas').boundingBox();
const mInput = await mobile.locator('[data-testid=name-1]').boundingBox();
check('mobile: viewer is shown above the inputs', mViewer.y + mViewer.height <= mInput.y);
check('mobile: viewer is large enough to inspect', mViewer.width >= 350 && mViewer.height >= 380, `${Math.round(mViewer.width)}×${Math.round(mViewer.height)}`);
const noHScroll = await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
check('mobile: no horizontal page scroll', noHScroll);
const touchAction = await mobile.evaluate(() => getComputedStyle(document.querySelector('.viewer-surface')).touchAction);
check('mobile: viewer blocks page scrolling during gestures', touchAction === 'none');

// one-finger touch drag through CDP so the browser produces genuine touch pointer events
const cdp = await mobile.context().newCDPSession(mobile);
const mx = mViewer.x + mViewer.width / 2;
const my = mViewer.y + mViewer.height / 2;
const azm0 = (await cam(mobile)).azimuth;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: mx, y: my }] });
for (let s = 1; s <= 15; s++) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: mx - s * 10, y: my }] });
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await settle(mobile);
const azm1 = (await cam(mobile)).azimuth;
check('mobile: touch drag rotates the tree', Math.abs(azm1 - azm0) > 0.2, `Δ ${(azm1 - azm0).toFixed(2)} rad`);
check('mobile: touch drag did not scroll the page', (await mobile.evaluate(() => window.scrollY)) === 0);
await mobile.locator('canvas').screenshot({ path: path.join(OUT, 'mobile-rotated.png') });
await mobile.close();

await browser.close();

const relevantErrors = errors.filter((e) => !/Download the React DevTools/.test(e));
check('no runtime errors in the console', relevantErrors.length === 0, relevantErrors.slice(0, 3).join(' | '));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in ${OUT}`);
process.exit(failed.length ? 1 : 0);
