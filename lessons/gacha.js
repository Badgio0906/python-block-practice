export const title = '自分だけのガチャを作ろう';
export const kicker = '02 / RANDOM LAB';
export const description = 'アイテムと確率を決めたら、Pythonに抽選を任せてみよう。';
export const learning = '発見：確率が5%でも、100回引いたとき必ず5回出るわけではありません。random と for が抽選を動かしています。';
export const runLabel = '▶ ガチャを引く';
export const missions = [
  { title: 'はじめてガチャを引こう', detail: '1回引いて結果を見よう', hints: ['確率は最初から100%です。そのまま実行してみよう。', '「ガチャを引く」を押すと、Pythonのrandomが1つ選びます。'] },
  { title: 'レアの確率を変えよう', detail: '合計100%にして1回引こう', hints: ['レアを増やした分だけ、ノーマルを減らそう。', '例：ノーマル55%、レア40%、超レア5%。'] },
  { title: '100回引いて比べよう', detail: '設定と実際の割合を見よう', hints: ['「100回まとめて引く」を選んで実行しよう。', '設定した確率と実際の結果がぴったり同じか比べてみて。'] },
];

export function initialState() {
  return { items: [{ name: 'ノーマル', probability: 70 }, { name: 'レア', probability: 25 }, { name: '超レア', probability: 5 }], count: 1, changedProbability: false };
}

export function selectMission(state, mission) { state.count = mission === 3 ? 100 : 1; }

export function renderSettings(container, state, actions) {
  const intro = document.createElement('p');
  intro.className = 'mini-note';
  intro.textContent = 'アイテム名と出る確率を変えられます。合計を100%にしてください。';
  container.append(intro);
  const total = document.createElement('p');
  total.className = 'total-line';
  const refreshTotal = () => {
    const sum = state.items.reduce((value, item) => value + (Number(item.probability) || 0), 0);
    total.textContent = `確率の合計: ${sum}% ${sum === 100 ? '✓' : '（100%にしてね）'}`;
    total.className = `total-line ${sum === 100 ? 'good' : 'bad'}`;
  };
  state.items.forEach((item, index) => {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = ['①', '②', '③'][index] + ' アイテム';
    const grid = document.createElement('div');
    grid.className = 'setting-grid';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = '名前';
    const name = document.createElement('input');
    name.type = 'text'; name.maxLength = 24; name.value = item.name;
    name.setAttribute('aria-label', `${index + 1}番目のアイテム名`);
    name.addEventListener('input', () => { item.name = name.value; actions.change(); });
    const probabilityLabel = document.createElement('label');
    probabilityLabel.textContent = '確率 %';
    const probability = document.createElement('input');
    probability.type = 'number'; probability.min = '0'; probability.max = '100'; probability.step = '1'; probability.value = String(item.probability);
    probability.setAttribute('aria-label', `${index + 1}番目のアイテムの確率`);
    probability.addEventListener('input', () => { item.probability = probability.value === '' ? '' : Number(probability.value); state.changedProbability = true; refreshTotal(); actions.change(); });
    nameLabel.append(name); probabilityLabel.append(probability);
    grid.append(nameLabel, probabilityLabel); fieldset.append(legend, grid); container.append(fieldset);
  });
  container.append(total); refreshTotal();
  const choice = document.createElement('div');
  choice.className = 'run-choice';
  for (const [count, label] of [[1, '1回引く'], [100, '100回まとめて引く']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.classList.toggle('active', state.count === count);
    button.addEventListener('click', () => {
      state.count = count;
      choice.querySelectorAll('button').forEach((entry) => entry.classList.toggle('active', entry === button));
      actions.change();
      actions.execute();
    });
    choice.append(button);
  }
  container.append(choice);
  const jumps = document.createElement('div'); jumps.className = 'rule-actions';
  for (const [label, needle] of [['確率のコードを見る', 'weights = ['], ['くり返しを見る', 'results = [']]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.addEventListener('click', () => {
      const editor = document.getElementById('lesson-code');
      const start = editor.value.indexOf(needle);
      if (start < 0) return;
      const end = editor.value.indexOf('\n', start);
      editor.focus(); editor.setSelectionRange(start, end < 0 ? editor.value.length : end);
      editor.scrollTop = Math.max(0, editor.value.slice(0, start).split('\n').length * 19 - 80);
    });
    jumps.append(button);
  }
  container.append(jumps);
}

export function generateCode(state) {
  const weights = state.items.map((item) => Number.isInteger(item.probability) && item.probability >= 0 && item.probability <= 100 ? item.probability : 0);
  return `# 名前は設定から「データ」として安全に受け取ります\nimport json\nimport random\nsettings = json.loads(LESSON_DATA_JSON)\nnames = [item["name"] for item in settings["items"]]\nweights = [${weights.join(', ')}]  # 出る確率（%）\nDRAW_COUNT = ${state.count}\n\ndef draw_one():\n    return random.choices(names, weights=weights, k=1)[0]\n\nresults = [draw_one() for _ in range(DRAW_COUNT)]\ncounts = {name: results.count(name) for name in names}\njson.dumps({\n    "kind": "gacha", "results": results, "counts": counts,\n    "configured": [{"name": name, "probability": weight}\n                   for name, weight in zip(names, weights)]\n}, ensure_ascii=False)`;
}

export function validate(state) {
  const names = state.items.map((item) => item.name.trim());
  if (names.some((name) => !name)) return 'アイテム名を3つとも入力してください。';
  if (new Set(names).size !== names.length) return 'アイテム名は別々にしてください。';
  if (state.items.some((item) => !Number.isInteger(item.probability) || item.probability < 0 || item.probability > 100)) return '確率は0〜100の整数で入力してください。';
  if (state.items.reduce((sum, item) => sum + item.probability, 0) !== 100) return '確率の合計を100%にしてください。';
  return null;
}

export function data(state) { return { items: state.items.map((item) => ({ name: item.name.trim() })) }; }

export function isResult(value) {
  return value?.kind === 'gacha' && Array.isArray(value.results) && value.results.length >= 1 && value.results.length <= 100
    && value.results.every((item) => typeof item === 'string') && value.counts && typeof value.counts === 'object'
    && Array.isArray(value.configured) && value.configured.length === 3;
}

export function renderOutput(container, value) {
  container.replaceChildren();
  if (!value) {
    const empty = document.createElement('p'); empty.className = 'empty-output'; empty.textContent = 'どんなアイテムが出るかな？ガチャを引いてみよう。'; container.append(empty); return;
  }
  if (value.results.length === 1) {
    const index = value.configured.findIndex((item) => item.name === value.results[0]);
    const card = document.createElement('div');
    card.className = `prize ${index === 1 ? 'rare' : index === 2 ? 'super super-flash' : ''}`;
    const symbol = document.createElement('span'); symbol.className = 'symbol'; symbol.textContent = ['○', '★', '✦'][index] || '✦';
    const name = document.createElement('strong'); name.textContent = value.results[0];
    const note = document.createElement('p'); note.textContent = index === 2 ? '超レア！おめでとう！' : 'もう一度引くと違う結果かも？';
    card.append(symbol, name, note); container.append(card);
  } else {
    const heading = document.createElement('strong'); heading.textContent = '100回の結果'; container.append(heading);
    const bars = document.createElement('div'); bars.className = 'count-bars';
    value.configured.forEach(({ name, probability }) => {
      const count = Number(value.counts[name]) || 0;
      const row = document.createElement('div'); row.className = 'count-bar';
      const label = document.createElement('span'); label.textContent = name;
      const track = document.createElement('span'); track.className = 'track';
      const fill = document.createElement('span'); fill.className = 'fill'; fill.style.width = `${Math.max(0, Math.min(100, count))}%`; track.append(fill);
      const result = document.createElement('strong'); result.textContent = `${count}回 / 設定${probability}%`;
      row.append(label, track, result); bars.append(row);
    });
    container.append(bars);
    const note = document.createElement('p'); note.className = 'mini-note'; note.textContent = '100回では実際の割合と設定が違うこともあります。もう一度引いて比べてね。'; container.append(note);
  }
}

export function passes(mission, state, result) {
  const count = result.results.length;
  const total = Object.values(result.counts).reduce((sum, value) => sum + Number(value), 0);
  if (total !== count) return false;
  if (mission === 1) return count === 1;
  if (mission === 2) return count === 1 && state.changedProbability && state.items[1].probability !== 25;
  return count === 100;
}
