const el = (id) => document.getElementById(id);
const weather = el('weather');
const metric = el('metric');
const limit = el('limit');
const code = el('code');
const runButton = el('run');
const stopButton = el('stop');
const resultContent = el('result-content');
const resultStatus = el('result-status');
const missions = [...document.querySelectorAll('[data-mission]')];
const missionSettings = {
  popular: { weather: 'all', metric: 'quantity', limit: '3' },
  rain: { weather: 'rain', metric: 'quantity', limit: '3' },
  sales: { weather: 'all', metric: 'sales', limit: '3' },
};
let csvText = '';
let worker = null;
let timeout = null;
let requestId = 0;
let running = false;

function generatedCode() {
  const filter = weather.value;
  const measure = metric.value;
  const top = Number(limit.value);
  const filterLine = filter === 'all' ? '    # すべての日を対象にする' : `    if row["weather"] != "${filter}":\n        continue  # 条件に合わない注文は飛ばす`;
  const amountLine = measure === 'sales'
    ? '    amount = int(row["price"]) * int(row["quantity"])'
    : '    amount = int(row["quantity"])';
  return `# カフェの注文をPythonで調査！
import csv
import json
from io import StringIO

# CSV_TEXT は読み込んだ注文データ
orders = list(csv.DictReader(StringIO(CSV_TEXT)))
totals = {}
matched = 0

for row in orders:
${filterLine}
    matched += 1
    item = row["item"]
${amountLine}
    totals[item] = totals.get(item, 0) + amount

# 数が大きい順に並べ、上位だけ取り出す
ranking = sorted(totals.items(), key=lambda pair: pair[1], reverse=True)[:${top}]

# 最後の値を画面に渡す
json.dumps({
    "rows": len(orders),
    "matched": matched,
    "ranking": ranking,
    "metric": "${measure}",
    "weather": "${filter}"
}, ensure_ascii=False)`;
}

function setStatus(message, kind = '') {
  resultStatus.textContent = message;
  resultStatus.className = `status-pill ${kind}`;
}

function showPlaceholder(title, detail) {
  resultContent.replaceChildren();
  const box = document.createElement('div');
  box.className = 'empty-state';
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '✳';
  const heading = document.createElement('strong');
  heading.textContent = title;
  const paragraph = document.createElement('p');
  paragraph.textContent = detail;
  box.append(icon, heading, paragraph);
  resultContent.append(box);
}

function resetCode() {
  code.value = generatedCode();
  el('code-help').textContent = '設定を変えるとコードが再生成されます。';
  setStatus('実行を待っています');
  showPlaceholder('何が見つかるかな？', '「Pythonで調べる」を押すと、ここに結果が表示されます。');
}

function selectMission(name) {
  const settings = missionSettings[name];
  weather.value = settings.weather;
  metric.value = settings.metric;
  limit.value = settings.limit;
  missions.forEach((button) => {
    const active = button.dataset.mission === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  resetCode();
}

function markCustom() {
  missions.forEach((button) => {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  });
}

function setRunning(value) {
  running = value;
  runButton.disabled = value || !csvText;
  stopButton.hidden = !value;
}

function discardWorker() {
  clearTimeout(timeout);
  timeout = null;
  if (worker) worker.terminate();
  worker = null;
}

function stopRun(reason = '実行を停止しました。もう一度実行できます。') {
  requestId += 1;
  discardWorker();
  setRunning(false);
  setStatus('停止しました', 'error');
  showPlaceholder('調査を中止しました', reason);
}

function showTextOutput(value, stdout) {
  resultContent.replaceChildren();
  const output = [stdout, value].filter(Boolean).join('\n');
  const pre = document.createElement('pre');
  pre.className = 'raw-output';
  pre.textContent = output || 'コードは実行されましたが、出力はありません。print() を使うか、最後に値を書いてみてください。';
  resultContent.append(pre);
}

function showRanking(data) {
  const ranking = data.ranking;
  if (!Array.isArray(ranking) || !ranking.every((row) => Array.isArray(row) && row.length === 2 && typeof row[0] === 'string' && Number.isFinite(row[1]))) return false;
  const matched = Number(data.matched);
  if (!Number.isFinite(matched)) return false;
  resultContent.replaceChildren();
  if (!ranking.length) {
    showPlaceholder('該当する注文がありません', '条件やCSVの内容を変えて、もう一度調べてみてください。');
    return true;
  }
  const grid = document.createElement('div');
  grid.className = 'answer-grid';
  const card = document.createElement('div');
  card.className = 'answer-card';
  const kicker = document.createElement('span');
  kicker.className = 'answer-kicker';
  kicker.textContent = '今回の 1 位';
  const winner = document.createElement('strong');
  winner.textContent = ranking[0][0];
  const summary = document.createElement('p');
  summary.textContent = `${matched} 件の注文を調べました。`;
  card.append(kicker, winner, summary);
  const chart = document.createElement('div');
  const title = document.createElement('p');
  title.className = 'chart-title';
  title.textContent = data.metric === 'sales' ? '商品別の売上金額' : '商品別の販売個数';
  chart.append(title);
  const max = Math.max(...ranking.map((row) => row[1]), 1);
  ranking.forEach(([name, number]) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const label = document.createElement('span');
    label.className = 'bar-name';
    label.textContent = name;
    label.title = name;
    const track = document.createElement('span');
    track.className = 'bar-track';
    const fill = document.createElement('span');
    fill.className = 'bar-fill';
    fill.style.width = `${Math.max(0, Math.min(100, number / max * 100))}%`;
    track.append(fill);
    const value = document.createElement('span');
    value.className = 'bar-value';
    value.textContent = data.metric === 'sales' ? `¥${number.toLocaleString('ja-JP')}` : `${number.toLocaleString('ja-JP')} 個`;
    row.append(label, track, value);
    chart.append(row);
  });
  const insight = document.createElement('p');
  insight.className = 'insight';
  insight.textContent = `${data.weather === 'rain' ? '雨の日' : data.weather === 'sun' ? '晴れの日' : 'すべての日'}の注文を、Pythonが一件ずつ調べました。条件を変えて結果を比べてみよう。`;
  chart.append(insight);
  grid.append(card, chart);
  resultContent.append(grid);
  return true;
}

function showExecution(message) {
  setRunning(false);
  if (!message.ok) {
    setStatus('エラーが出ました', 'error');
    resultContent.replaceChildren();
    const heading = document.createElement('p');
    heading.className = 'error-message';
    heading.textContent = 'コードを確認して、もう一度試してみよう。';
    const detail = document.createElement('pre');
    detail.className = 'raw-output';
    detail.textContent = message.error || '不明なエラー';
    resultContent.append(heading, detail);
    return;
  }
  setStatus('調査完了', 'success');
  let data;
  try { data = JSON.parse(message.value); } catch { /* 自由編集の結果はそのまま表示 */ }
  if (!data || !showRanking(data)) showTextOutput(message.value, message.stdout);
}

function run() {
  if (running || !csvText) return;
  if (code.value.length > 20000) {
    setStatus('コードが長すぎます', 'error');
    showPlaceholder('20,000文字以内にしてください', 'コードを短くしてから、もう一度実行してください。');
    return;
  }
  discardWorker();
  worker = new Worker('python-worker.js');
  const thisRequest = ++requestId;
  setRunning(true);
  setStatus('Pythonを読み込み、調査中…');
  showPlaceholder('調査しています…', '初回はPythonの読み込みに時間がかかることがあります。');
  worker.onmessage = (event) => {
    if (thisRequest !== requestId) return;
    if (event.data.phase === 'ready') {
      clearTimeout(timeout);
      setStatus('Pythonで計算中…');
      timeout = setTimeout(() => {
        if (thisRequest === requestId) stopRun('8秒以内に終わりませんでした。無限ループなどがないか確認してください。');
      }, 8000);
      return;
    }
    discardWorker();
    showExecution(event.data);
  };
  worker.onerror = (event) => {
    if (thisRequest !== requestId) return;
    discardWorker();
    showExecution({ ok: false, error: event.message || 'Python実行環境を読み込めませんでした。通信を確認してください。' });
  };
  worker.postMessage({ code: code.value, csvText });
  timeout = setTimeout(() => {
    if (thisRequest === requestId) stopRun('Pythonの読み込みが間に合いませんでした。通信を確認して再実行してください。');
  }, 30000);
}

function validateCSV(text) {
  if (new Blob([text]).size > 1024 * 1024) throw new Error('CSVは1 MB以内にしてください。');
  const normalized = text.replace(/^\uFEFF/, '');
  const firstLine = normalized.split(/\r?\n/, 1)[0];
  const columns = firstLine.split(',').map((column) => column.trim());
  if (!['date', 'weather', 'item', 'price', 'quantity'].every((column) => columns.includes(column))) {
    throw new Error('CSVの1行目に date, weather, item, price, quantity が必要です。');
  }
  return normalized;
}

function loadData(text, name) {
  csvText = validateCSV(text);
  el('data-name').textContent = name;
  el('data-count').textContent = `${Math.max(0, csvText.trimEnd().split(/\r?\n/).length - 1)} 件の注文データ`;
  setRunning(false);
  setStatus('実行を待っています');
  showPlaceholder('何が見つかるかな？', '「Pythonで調べる」を押すと、ここに結果が表示されます。');
}

missions.forEach((button) => button.addEventListener('click', () => selectMission(button.dataset.mission)));
[weather, metric, limit].forEach((select) => select.addEventListener('change', () => { markCustom(); resetCode(); }));
code.addEventListener('input', () => { el('code-help').textContent = 'コードを編集中です。設定を変えると再生成されます。'; });
el('reset-code').addEventListener('click', resetCode);
runButton.addEventListener('click', run);
stopButton.addEventListener('click', () => stopRun());
el('csv-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('CSVは1 MB以内にしてください。');
    if (running) stopRun();
    loadData(await file.text(), file.name);
  } catch (error) {
    setStatus('CSVを読めませんでした', 'error');
    showPlaceholder('CSVを確認してください', error.message);
  }
  event.target.value = '';
});

resetCode();
fetch('sample.csv').then((response) => {
  if (!response.ok) throw new Error('sample.csv を読み込めませんでした。');
  return response.text();
}).then((text) => loadData(text, 'sample.csv')).catch((error) => {
  setStatus('データを読めませんでした', 'error');
  showPlaceholder('サンプルを読み込めませんでした', `${error.message} ローカルサーバーから開いてください。`);
});
