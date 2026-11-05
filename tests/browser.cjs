const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { readFile } = require('node:fs/promises');
const { chromium } = require('playwright');

const base = 'http://127.0.0.1:8765';
const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore' });
let browser;
const errors = [];

async function ready() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(base)).ok) return; } catch { /* 起動待ち */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('テスト用サーバーが起動しませんでした。');
}

async function lessonDone(page) {
  await page.waitForFunction(() => ['ミッション達成！', '実行できました'].includes(document.querySelector('#run-status')?.textContent) || document.querySelector('#run-status')?.classList.contains('error'), { timeout: 45000 });
  const status = await page.locator('#run-status').textContent();
  assert.ok(!await page.locator('#run-status').evaluate((element) => element.classList.contains('error')), status);
  return status;
}

(async () => {
  await ready();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(base);
  assert.equal(await page.locator('.course-card').count(), 4);
  assert.equal(await page.locator('.course-switch-links a').count(), 2);
  await page.goto(`${base}/html/index.html`);
  assert.match(await page.title(), /HTML/);
  assert.equal(await page.locator('#app').count(), 1);

  await page.goto(`${base}/data.html`);
  await page.waitForFunction(() => !document.querySelector('#run').disabled);
  const firstLoadStart = performance.now();
  await page.locator('#run').click();
  await page.waitForFunction(() => document.querySelector('#result-status').textContent === '調査完了', { timeout: 45000 });
  const firstLoadMs = Math.round(performance.now() - firstLoadStart);
  assert.equal(await page.locator('.answer-card strong').textContent(), 'カフェラテ');
  await page.locator('[data-mission="rain"]').click();
  await page.locator('#run').click();
  await page.waitForFunction(() => document.querySelector('#result-status').textContent === '調査完了', { timeout: 45000 });
  assert.equal(await page.locator('.answer-card strong').textContent(), 'ココア');
  assert.equal(await page.locator('.mission-done').count(), 2);
  await page.locator('#csv-file').setInputFiles({ name: 'small.csv', mimeType: 'text/csv', buffer: Buffer.from('date,weather,item,price,quantity\n2026-01-01,rain,りんご,100,2\n') });
  assert.match(await page.locator('#data-count').textContent(), /1 件/);
  await page.locator('#run').click();
  await page.waitForFunction(() => document.querySelector('#result-status').textContent === '調査完了', { timeout: 45000 });
  assert.equal(await page.locator('.answer-card strong').textContent(), 'りんご');

  await page.goto(`${base}/lesson.html?lesson=gacha`);
  await page.locator('#run').click(); await lessonDone(page);
  await page.locator('.mission-button').nth(1).click();
  const probability = page.locator('input[type=number]');
  await probability.nth(0).fill('55'); await probability.nth(1).fill('40');
  await page.locator('#run').click(); await lessonDone(page);
  await page.locator('.mission-button').nth(2).click();
  const start = performance.now();
  await page.locator('#run').click();
  assert.equal(await page.locator('#run').isDisabled(), true);
  await lessonDone(page);
  const repeatMs = Math.round(performance.now() - start);
  assert.match(await page.locator('#output').innerText(), /100回の結果/);
  assert.equal(await page.locator('.count-bar').count(), 3);
  await probability.nth(2).fill('0'); await probability.nth(0).fill('60');
  await page.locator('#run').click(); await lessonDone(page);
  assert.match(await page.locator('.count-bar').nth(2).innerText(), /0回/);
  await probability.nth(0).fill('20');
  await page.locator('#run').click();
  assert.match(await page.locator('#run-status').textContent(), /100%/);
  assert.ok(repeatMs < 3000, `ガチャ100回が遅い: ${repeatMs} ms`);
  console.log('初回Pythonロード込み', `${firstLoadMs} ms`, 'ガチャ100回の再実行', `${repeatMs} ms`);

  await page.goto(`${base}/lesson.html?lesson=robot`);
  await page.locator('.chat-form input').fill('こんにちは'); await page.locator('.chat-form button').click(); await lessonDone(page);
  assert.match(await page.locator('.chat-log').innerText(), /今日は何をして遊ぶ/);
  await page.locator('.mission-button').nth(1).click();
  await page.getByRole('button', { name: '＋ ルールを追加' }).click();
  const rules = page.locator('.rule-item');
  await rules.last().locator('input').nth(0).fill('おやつ');
  await rules.last().locator('input').nth(1).fill('クッキーにしよう！');
  await page.locator('.chat-form input').fill('おやつ'); await page.locator('.chat-form button').click(); await lessonDone(page);
  assert.match(await page.locator('.chat-log').innerText(), /クッキーにしよう/);
  await page.locator('.mission-button').nth(2).click();
  await rules.last().locator('select').selectOption('partial');
  await page.locator('.chat-form input').fill('今日はおやつを食べたい'); await page.locator('.chat-form button').click(); await lessonDone(page);
  assert.match(await page.locator('.chat-log').innerText(), /クッキーにしよう/);
  await page.locator('.chat-form input').fill('<img src=x onerror=alert(1)>'); await page.locator('.chat-form button').click(); await lessonDone(page);
  assert.equal(await page.locator('.chat-log img').count(), 0);
  assert.equal(await page.locator('.mission-button.done').count(), 3);
  const oldMessages = await page.locator('.chat-message').count();
  await page.locator('.chat-form input').fill('');
  await page.locator('.chat-form button').click();
  assert.equal(await page.locator('.chat-message').count(), oldMessages);

  await page.goto(`${base}/lesson.html?lesson=art`);
  await page.locator('#run').click(); await lessonDone(page);
  assert.match(await page.locator('.art-count').textContent(), /5/);
  await page.locator('.mission-button').nth(1).click();
  await page.locator('input[type=number]').nth(2).fill('10');
  const artStart = performance.now();
  await page.locator('#run').click(); await lessonDone(page);
  const artMs = Math.round(performance.now() - artStart);
  assert.ok(artMs < 3000, `アートが遅い: ${artMs} ms`);
  await page.waitForFunction(() => document.querySelector('.art-count').textContent.includes('240 / 240'), { timeout: 10000 });
  assert.equal(await page.locator('.mission-button.done').count(), 2);
  const paintedPixels = await page.locator('canvas').evaluate((canvas) => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) if (pixels[index] !== 255 || pixels[index + 1] !== 249 || pixels[index + 2] !== 237) count++;
    return count;
  });
  assert.ok(paintedPixels > 200, `描画ピクセルが少ない: ${paintedPixels}`);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG保存' }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'python-art.png');
  const png = await readFile(await download.path());
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(png.length > 1000);
  await page.locator('#lesson-code').fill('import json\njson.dumps({"kind":"art","work":"star","segments":[[999999,0,1,1,"#000000",2]]})');
  await page.locator('#run').click(); await lessonDone(page);
  assert.equal(await page.locator('canvas').count(), 0);
  await page.locator('#reset-code').click();
  await page.locator('#run').click(); await lessonDone(page);
  assert.equal(await page.locator('canvas').count(), 1);
  await page.locator('#lesson-code').fill('def broken(:');
  await page.locator('#run').click();
  await page.waitForFunction(() => document.querySelector('#run-status').classList.contains('error'), { timeout: 45000 });
  assert.match(await page.locator('#output').innerText(), /SyntaxError/);
  await page.locator('#reset-code').click();
  await page.locator('#lesson-code').fill('while True:\n    pass');
  await page.locator('#run').click();
  await page.locator('#stop').click();
  assert.match(await page.locator('#run-status').textContent(), /停止/);
  await page.locator('#reset-code').click();
  await page.locator('#run').click(); await lessonDone(page);
  await page.locator('#lesson-code').fill('while True:\n    pass');
  await page.locator('#run').click();
  await page.goto(`${base}/lesson.html?lesson=gacha`);
  await page.locator('#run').click(); await lessonDone(page);
  console.log('花アートの再実行', `${artMs} ms`);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/data.html', '/lesson.html?lesson=gacha', '/lesson.html?lesson=robot', '/lesson.html?lesson=art']) {
    await page.goto(base + path);
    const sizes = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, view: innerWidth }));
    assert.ok(sizes.page <= sizes.view + 1, `${path}: 横スクロール ${sizes.page} > ${sizes.view}`);
  }
  await page.goto(base);
  assert.match(await page.locator('[data-progress=gacha]').textContent(), /3 \/ 3/);
  const blocked = await browser.newContext();
  await blocked.route('https://cdn.jsdelivr.net/pyodide/**', (route) => route.abort());
  const offlinePage = await blocked.newPage();
  await offlinePage.goto(`${base}/lesson.html?lesson=gacha`);
  await offlinePage.locator('#run').click();
  await offlinePage.waitForFunction(() => document.querySelector('#run-status').classList.contains('error'), { timeout: 45000 });
  await blocked.unroute('https://cdn.jsdelivr.net/pyodide/**');
  await offlinePage.locator('#run').click();
  await lessonDone(offlinePage);
  await blocked.close();
  assert.deepEqual(errors, []);
  console.log('実ブラウザ検証: 4教材、HTML導線、3ミッション、PNG、停止、390px幅 OK');
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server.kill(); });
