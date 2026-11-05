import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as gacha from '../lessons/gacha.js';
import * as robot from '../lessons/robot.js';
import * as art from '../lessons/art.js';
import { loadProgress, markComplete } from '../shared/progress.js';

function evaluate(code, data, seed = '') {
  const prelude = `LESSON_DATA_JSON = ${JSON.stringify(JSON.stringify(data))}\n`;
  const source = prelude + seed + code;
  const runner = `import ast\nsource = ${JSON.stringify(source)}\ntree = ast.parse(source)\nlast = tree.body.pop()\nspace = {}\nexec(compile(tree, '<lesson>', 'exec'), space)\nprint(eval(compile(ast.Expression(last.value), '<lesson>', 'eval'), space))`;
  const process = spawnSync('python3', ['-c', runner], { encoding: 'utf8', timeout: 5000 });
  assert.equal(process.status, 0, process.stderr);
  return JSON.parse(process.stdout.trim().split('\n').at(-1));
}

test('ガチャ: 固定シードで再現し、100回集計と0%が正しい', () => {
  const state = gacha.initialState(); state.count = 100; state.items[2].probability = 0; state.items[0].probability = 75;
  assert.equal(gacha.validate(state), null);
  const code = gacha.generateCode(state), data = gacha.data(state);
  const first = evaluate(code, data, 'import random\nrandom.seed(42)\n');
  const second = evaluate(code, data, 'import random\nrandom.seed(42)\n');
  assert.deepEqual(first, second);
  assert.equal(first.results.length, 100);
  assert.equal(Object.values(first.counts).reduce((sum, count) => sum + count, 0), 100);
  assert.equal(first.counts['超レア'], 0);
  state.items[0].probability = 40;
  assert.match(gacha.validate(state), /100%/);
  state.items[0].probability = -1;
  assert.match(gacha.validate(state), /0〜100/);
  state.items[0].probability = 75; state.items[0].name = '';
  assert.match(gacha.validate(state), /アイテム名/);
});

test('会話ロボット: 正規化、完全一致優先、部分一致、未登録語', () => {
  const state = robot.initialState();
  state.rules.push({ keyword: 'こんにちは', response: '部分の返事', match: 'partial' });
  const ask = (message) => evaluate(robot.generateCode(state), robot.data(state, { message }));
  assert.equal(ask('  こんにちは  ').reply, 'こんにちは！今日は何をして遊ぶ？');
  assert.equal(ask('今日はこんにちは！').reply, '部分の返事');
  state.rules.push({ keyword: 'ＡＢＣ', response: '全角もOK', match: 'exact' });
  assert.equal(ask('abc').reply, '全角もOK');
  assert.equal(ask('<script>alert(1)</script>').matchType, 'none');
  assert.match(robot.validate(state, { message: '' }), /入力/);
});

test('アート: 3作品の線分をPythonが計算し、安全な範囲に収まる', () => {
  const state = art.initialState();
  for (const [work, count] of [['star', 5], ['flower', 288], ['spiral', 90]]) {
    state.work = work; Object.assign(state, { star: { length: 130, angle: 144, repeats: 5 }, flower: { length: 110, angle: 30, repeats: 12 }, spiral: { length: 155, angle: 91, repeats: 90 } }[work]);
    const result = evaluate(art.generateCode(state), art.data(state));
    assert.equal(result.segments.length, count);
    assert.ok(art.isResult(result));
  }
  state.repeats = 151;
  assert.match(art.validate(state), /1〜150/);
  assert.equal(art.isResult({ kind: 'art', work: 'star', segments: [[Infinity, 0, 1, 1, '#000000', 2]] }), false);
});

test('進捗: バージョン付き保存と破損データの復旧', () => {
  const memory = new Map();
  globalThis.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  assert.deepEqual(loadProgress().gacha, []);
  assert.equal(markComplete('gacha', 1), true);
  assert.equal(markComplete('gacha', 1), false);
  assert.deepEqual(loadProgress().gacha, [1]);
  memory.set('python-block-practice:progress', '{broken');
  assert.deepEqual(loadProgress().gacha, []);
  delete globalThis.localStorage;
});
