export const title = '数行のコードで不思議なアート';
export const kicker = '04 / ART LAB';
export const description = '数字を少し変えるだけで模様が変わる。座標はPythonが計算し、画面に線を描きます。';
export const learning = '発見：同じ「前へ進む」と「曲がる」を繰り返すだけで、星・花・渦巻きになります。下準備のペンもPythonで座標を計算しています。';
export const runLabel = '▶ アートを描く';
export const missions = [
  { title: '星を描こう', detail: 'まずは星を完成させる', hints: ['作品は「星」のままで実行してみよう。', '5回、144度ずつ曲がると星の形になります。'] },
  { title: '花を咲かせよう', detail: '数字を変えて花を描く', hints: ['「花」を選び、繰り返し回数を変えてみよう。', '花びらを描く円を、少しずつ回転させて重ねます。'] },
  { title: '自分だけの模様', detail: '色や角度を変えて完成', hints: ['「ぐるぐる」を選び、角度や色を変えてみよう。', '実行後はPNG保存で作品を持ち帰れます。'] },
];
const presets = {
  star: { length: 130, angle: 144, repeats: 5 },
  flower: { length: 110, angle: 30, repeats: 12 },
  spiral: { length: 155, angle: 91, repeats: 90 },
};
export function initialState() { return { work: 'star', ...presets.star, color: '#dd714c', background: '#fff9ed', changedArt: false, renderer: null }; }
export function selectMission(state, mission) {
  const work = ['star', 'flower', 'spiral'][mission - 1];
  Object.assign(state, presets[work], { work, changedArt: false });
}

function row(labelText, type, value, change, options = {}) {
  const holder = document.createElement('div'); holder.className = 'form-row';
  const label = document.createElement('label'); label.textContent = labelText;
  const input = document.createElement('input'); input.type = type; input.value = String(value);
  if (type === 'number') { input.min = String(options.min); input.max = String(options.max); input.step = '1'; }
  input.addEventListener('input', () => change(type === 'number' ? (input.value === '' ? NaN : Number(input.value)) : input.value));
  label.append(input); holder.append(label); return holder;
}

export function renderSettings(container, state, actions) {
  const workRow = document.createElement('div'); workRow.className = 'form-row';
  const label = document.createElement('label'); label.textContent = '作品を選ぶ';
  const select = document.createElement('select');
  for (const [value, text] of [['star', '★ 星を描こう'], ['flower', '✿ 花を描こう'], ['spiral', '◌ ぐるぐるアート']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
  }
  select.value = state.work;
  select.addEventListener('change', () => { state.work = select.value; Object.assign(state, presets[state.work]); state.changedArt = true; actions.change(); container.replaceChildren(); renderSettings(container, state, actions); });
  label.append(select); workRow.append(label); container.append(workRow);
  for (const [key, titleText, min, max] of [['length', '線の長さ', 10, 180], ['angle', '回転する角度', 1, 179], ['repeats', '繰り返す回数', 1, 150]]) {
    container.append(row(titleText, 'number', state[key], (value) => { state[key] = value; state.changedArt = true; actions.change(); }, { min, max }));
  }
  container.append(row('線の色', 'color', state.color, (value) => { state.color = value; state.changedArt = true; actions.change(); }));
  container.append(row('背景の色', 'color', state.background, (value) => { state.background = value; state.changedArt = true; actions.change(); }));
  const note = document.createElement('p'); note.className = 'mini-note'; note.textContent = state.work === 'flower' ? '花は小さな線をつないで花びらを描きます。' : state.work === 'spiral' ? 'ぐるぐるは少しずつ線が長くなります。' : '星は「進む→曲がる」を繰り返します。'; container.append(note);
}

export function generateCode(state) {
  const value = (key, fallback) => Number.isInteger(state[key]) ? state[key] : fallback;
  const work = ['star', 'flower', 'spiral'].includes(state.work) ? state.work : 'star';
  return `# 線の座標はPythonが計算します\nimport json\nimport math\nsettings = json.loads(LESSON_DATA_JSON)\nLENGTH = ${value('length', 100)}\nANGLE = ${value('angle', 90)}\nREPEATS = ${value('repeats', 5)}\nWORK = "${work}"\nCOLOR = settings["color"]\n\nclass Pen:\n    def __init__(self):\n        self.x, self.y, self.heading = 0.0, 0.0, -90.0\n        self.lines = []\n\n    def forward(self, distance):\n        x = self.x + math.cos(math.radians(self.heading)) * distance\n        y = self.y + math.sin(math.radians(self.heading)) * distance\n        if not math.isfinite(x) or not math.isfinite(y) or abs(x) > 5000 or abs(y) > 5000:\n            raise ValueError("線が画面の外へ出すぎました。角度や回数を小さくしてね。")\n        self.lines.append([self.x, self.y, x, y, COLOR, 2])\n        if len(self.lines) > 4000:\n            raise ValueError("線が多すぎます。繰り返し回数を減らしてね。")\n        self.x, self.y = x, y\n\n    def right(self, degrees):\n        self.heading += degrees\n\npen = Pen()\n# ここからが作品の数行！\nif WORK == "star":\n    for _ in range(REPEATS):\n        pen.forward(LENGTH)\n        pen.right(ANGLE)\nelif WORK == "flower":\n    for _ in range(REPEATS):\n        for _ in range(24):\n            pen.forward(LENGTH / 12)\n            pen.right(15)\n        pen.right(ANGLE)\nelse:  # ぐるぐる\n    for step in range(REPEATS):\n        pen.forward(LENGTH * (step + 1) / REPEATS)\n        pen.right(ANGLE)\n\njson.dumps({"kind": "art", "work": WORK, "segments": pen.lines}, ensure_ascii=False)`;
}

export function validate(state) {
  if (!['star', 'flower', 'spiral'].includes(state.work)) return '作品を選んでください。';
  for (const [key, min, max] of [['length', 10, 180], ['angle', 1, 179], ['repeats', 1, 150]]) {
    if (!Number.isInteger(state[key]) || state[key] < min || state[key] > max) return `線の長さは10〜180、角度は1〜179、回数は1〜150の整数にしてください。`;
  }
  if (!/^#[0-9a-f]{6}$/i.test(state.color) || !/^#[0-9a-f]{6}$/i.test(state.background)) return '色を選び直してください。';
  return null;
}

export function data(state) { return { color: state.color }; }
export function isResult(value) {
  return value?.kind === 'art' && ['star', 'flower', 'spiral'].includes(value.work)
    && Array.isArray(value.segments) && value.segments.length > 0 && value.segments.length <= 4000
    && value.segments.every((segment) => Array.isArray(segment) && segment.length === 6
      && segment.slice(0, 4).every((coord) => Number.isFinite(coord) && Math.abs(coord) <= 5000)
      && /^#[0-9a-f]{6}$/i.test(segment[4]) && Number.isFinite(segment[5]) && segment[5] >= 1 && segment[5] <= 20);
}

function makeRenderer(canvas, state, buttons, counter) {
  const ctx = canvas.getContext('2d');
  let segments = [];
  let frame = null;
  let index = 0;
  let paused = false;
  let transform;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size() {
    const width = Math.max(200, canvas.clientWidth);
    const dpr = Math.min(3, devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(width * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return width;
  }
  function background() { const width = size(); ctx.fillStyle = state.background; ctx.fillRect(0, 0, width, width); }
  function position() {
    const points = segments.flatMap((line) => [[line[0], line[1]], [line[2], line[3]]]);
    const xs = points.map((point) => point[0]); const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const width = canvas.clientWidth;
    const scale = Math.min((width - 42) / Math.max(maxX - minX, 1), (width - 42) / Math.max(maxY - minY, 1), 5);
    transform = { scale, ox: width / 2 - (minX + maxX) / 2 * scale, oy: width / 2 - (minY + maxY) / 2 * scale };
  }
  function line(segment) {
    ctx.strokeStyle = segment[4]; ctx.lineWidth = segment[5]; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(transform.ox + segment[0] * transform.scale, transform.oy + segment[1] * transform.scale);
    ctx.lineTo(transform.ox + segment[2] * transform.scale, transform.oy + segment[3] * transform.scale); ctx.stroke();
  }
  function tick() {
    frame = null;
    if (paused) return;
    for (let n = 0; n < 12 && index < segments.length; n++, index++) line(segments[index]);
    counter.textContent = `${index} / ${segments.length} 本の線`;
    if (index < segments.length) frame = requestAnimationFrame(tick);
    else { buttons.pause.disabled = true; buttons.pause.textContent = '一時停止'; }
  }
  function stopFrame() { if (frame != null) cancelAnimationFrame(frame); frame = null; }
  function repaint() {
    stopFrame(); background();
    if (!segments.length) return;
    position();
    for (let n = 0; n < index; n++) line(segments[n]);
    if (!paused && index < segments.length) frame = requestAnimationFrame(tick);
  }
  function show(lines) {
    stopFrame(); segments = lines; index = 0; paused = false; background(); position();
    buttons.pause.disabled = false; buttons.pause.textContent = '一時停止'; buttons.replay.disabled = false; buttons.save.disabled = false;
    if (reducedMotion) { for (const segment of segments) line(segment); index = segments.length; counter.textContent = `${index} 本の線`; buttons.pause.disabled = true; }
    else frame = requestAnimationFrame(tick);
  }
  function clear() { stopFrame(); segments = []; index = 0; background(); counter.textContent = 'まだ線はありません'; buttons.pause.disabled = true; buttons.replay.disabled = true; buttons.save.disabled = true; }
  function pause() { if (index >= segments.length) return; paused = !paused; buttons.pause.textContent = paused ? '再開' : '一時停止'; if (!paused && frame == null) frame = requestAnimationFrame(tick); }
  function replay() { if (!segments.length) return; show(segments); }
  function save() {
    if (!segments.length) return;
    stopFrame(); paused = true; index = segments.length; repaint(); counter.textContent = `${index} 本の線`; buttons.pause.disabled = true;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'python-art.png'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }
  background();
  const observer = new ResizeObserver(() => { if (canvas.isConnected) repaint(); });
  observer.observe(canvas);
  return { canvas, show, clear, pause, replay, save, repaint, dispose: () => { stopFrame(); observer.disconnect(); } };
}

export function renderOutput(container, result, state) {
  if (result && state.renderer && container.contains(state.renderer.canvas)) { state.renderer.show(result.segments); return; }
  state.renderer?.dispose();
  container.replaceChildren();
  const canvas = document.createElement('canvas'); canvas.className = 'art-canvas'; canvas.setAttribute('aria-label', 'Pythonが計算したアート');
  const actions = document.createElement('div'); actions.className = 'art-actions';
  const buttons = {};
  for (const [key, text] of [['pause', '一時停止'], ['replay', '最初から再生'], ['save', 'PNG保存']]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.disabled = true; buttons[key] = button; actions.append(button);
  }
  const counter = document.createElement('p'); counter.className = 'art-count'; counter.textContent = 'まだ線はありません';
  container.append(canvas, actions, counter);
  state.renderer = makeRenderer(canvas, state, buttons, counter);
  buttons.pause.addEventListener('click', () => state.renderer.pause());
  buttons.replay.addEventListener('click', () => state.renderer.replay());
  buttons.save.addEventListener('click', () => state.renderer.save());
  if (result) state.renderer.show(result.segments);
}

export function refreshOutput(_container, state) { state.renderer?.clear(); }
export function dispose(state) { state.renderer?.dispose(); }
export function passes(mission, state, result) {
  if (mission === 1) return result.work === 'star' && result.segments.length === state.repeats;
  if (mission === 2) return result.work === 'flower' && state.changedArt && result.segments.length === state.repeats * 24;
  return state.changedArt && result.segments.length > 0;
}
