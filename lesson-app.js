import { PythonRunner } from './shared/runner.js';
import { completedCount, loadProgress, markComplete } from './shared/progress.js';
import * as gacha from './lessons/gacha.js';
import * as robot from './lessons/robot.js';
import * as art from './lessons/art.js';

const lessons = { gacha, robot, art };
const id = new URLSearchParams(location.search).get('lesson');
const lesson = lessons[id];
if (!lesson) location.replace('index.html');
else start();

function start() {
  const $ = (id) => document.getElementById(id);
  const runner = new PythonRunner();
  let state = lesson.initialState();
  let mission = 1;
  let hintStep = 0;
  let running = false;
  let codeEdited = false;
  const settings = $('settings');
  const output = $('output');
  const code = $('lesson-code');
  const runButton = $('run');
  const stopButton = $('stop');

  document.title = `${lesson.title} | Python ブロック練習`;
  $('lesson-title').textContent = lesson.title;
  $('lesson-kicker').textContent = lesson.kicker;
  $('lesson-heading').textContent = lesson.title;
  $('lesson-description').textContent = lesson.description;
  $('learning-note').textContent = lesson.learning;
  $('run').textContent = lesson.runLabel || '▶ Pythonで実行';

  function status(text, kind = '') {
    $('run-status').textContent = text;
    $('run-status').className = `status ${kind}`;
  }

  function busy(value) {
    running = value;
    runButton.disabled = value;
    stopButton.hidden = !value;
  }

  function cancel() {
    if (!running) return;
    runner.cancel();
    busy(false);
    status('実行を停止しました', 'error');
  }

  function generate() {
    cancel();
    code.value = lesson.generateCode(state);
    codeEdited = false;
    status('準備できました');
  }

  function renderSettings() {
    settings.replaceChildren();
    lesson.renderSettings(settings, state, {
      change: () => { generate(); lesson.refreshOutput?.(output, state); },
      execute: (payload) => execute(payload),
    });
  }

  function renderMissions() {
    $('lesson-progress').textContent = `${completedCount(id)} / 3 達成`;
    const done = loadProgress()[id];
    const holder = $('lesson-missions');
    holder.replaceChildren();
    lesson.missions.forEach((item, index) => {
      const number = index + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mission-button${number === mission ? ' active' : ''}${done.includes(number) ? ' done' : ''}`;
      button.setAttribute('aria-pressed', String(number === mission));
      const label = document.createElement('span');
      label.textContent = `MISSION 0${number}`;
      const title = document.createElement('strong');
      title.textContent = item.title;
      const detail = document.createElement('small');
      detail.textContent = done.includes(number) ? '✓ 達成済み' : item.detail;
      button.append(label, title, detail);
      button.addEventListener('click', () => {
        cancel();
        mission = number;
        hintStep = 0;
        $('hint-text').textContent = '';
        lesson.selectMission?.(state, mission);
        renderSettings();
        generate();
        lesson.renderOutput(output, null, state, { execute });
        renderMissions();
      });
      holder.append(button);
    });
  }

  function showRaw(message) {
    if (id === 'robot') lesson.renderOutput(output, null, state, { execute });
    else output.replaceChildren();
    const pre = document.createElement('pre');
    pre.className = 'raw-output';
    pre.textContent = [message.stdout, message.value].filter(Boolean).join('\n') || '出力はありません。print() を使うか、最後に値を書いてみてください。';
    output.append(pre);
  }

  async function execute(payload = {}) {
    if (running) return;
    const validation = lesson.validate(state, payload);
    if (validation) { status(validation, 'error'); return; }
    busy(true);
    status('Pythonで実行中…');
    const source = code.value;
    try {
      const message = await runner.run(id, source, lesson.data(state, payload));
      busy(false);
      let result;
      try { result = JSON.parse(message.value); } catch { /* 自由編集の結果はテキスト表示 */ }
      if (!result || !lesson.isResult(result)) showRaw(message);
      else {
        lesson.renderOutput(output, result, state, { execute, payload });
        if (lesson.passes(mission, state, result, payload, codeEdited)) {
          markComplete(id, mission);
          renderMissions();
          status('ミッション達成！', 'success');
          return;
        }
      }
      status('実行できました', 'success');
    } catch (error) {
      busy(false);
      if (error.name === 'AbortError') return;
      status(error.message, 'error');
      if (id === 'robot') lesson.renderOutput(output, null, state, { execute });
      else output.replaceChildren();
      const pre = document.createElement('pre');
      pre.className = 'raw-output';
      pre.textContent = error.message;
      output.append(pre);
    }
  }

  $('hint').addEventListener('click', () => {
    const hints = lesson.missions[mission - 1].hints;
    $('hint-text').textContent = hints[Math.min(hintStep++, hints.length - 1)];
  });
  $('reset').addEventListener('click', () => {
    cancel();
    lesson.dispose?.(state);
    state = lesson.initialState();
    mission = 1;
    hintStep = 0;
    $('hint-text').textContent = '';
    renderSettings();
    generate();
    lesson.renderOutput(output, null, state, { execute });
    renderMissions();
  });
  $('reset-code').addEventListener('click', generate);
  code.addEventListener('input', () => { cancel(); codeEdited = true; });
  runButton.addEventListener('click', () => execute());
  stopButton.addEventListener('click', cancel);
  window.addEventListener('pagehide', () => { runner.dispose(); lesson.dispose?.(state); });

  renderSettings();
  generate();
  lesson.renderOutput(output, null, state, { execute });
  renderMissions();
}
