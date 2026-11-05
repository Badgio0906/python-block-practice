export const title = '自分だけの会話ロボット';
export const kicker = '03 / WORD LAB';
export const description = '言葉に合わせて返事をするロボットを育てよう。AIではなく、あなたが決めたルールで動きます。';
export const learning = '仕組み：入力 → 言葉を比べる → 返事を選ぶ。完全一致を先に調べ、次に部分一致を上から順に調べます。これはAIではなくルール型のロボットです。';
export const runLabel = '▶ もう一度返事を聞く';
export const missions = [
  { title: '挨拶してみよう', detail: '「こんにちは」と話しかける', hints: ['チャット欄に「こんにちは」と入れて送ってみよう。', 'Pythonが同じ言葉のルールを探して返事を選びます。'] },
  { title: '新しい言葉を覚えさせよう', detail: 'ルールを追加して試す', hints: ['「ルールを追加」で好きな言葉と返事を作ろう。', '追加した言葉をチャット欄に入れて、返事が変わるか試そう。'] },
  { title: '条件で返事を変えよう', detail: '部分一致を使ってみる', hints: ['ルールの「完全一致」を「部分一致」に変えよう。', 'キーワードより長い文章を送っても反応するか試してみよう。'] },
];

const defaults = [
  { keyword: 'こんにちは', response: 'こんにちは！今日は何をして遊ぶ？', match: 'exact' },
  { keyword: '疲れた', response: 'お疲れさま！少し休憩しよう！', match: 'exact' },
  { keyword: 'ありがとう', response: 'どういたしまして！', match: 'exact' },
];
export function initialState() {
  return { name: 'ことばロボ', face: '🤖', rules: defaults.map((rule) => ({ ...rule })), fallback: 'ごめんね、まだその言葉は覚えていないんだ', history: [], lastInput: '', addedRule: false };
}

function formRow(label, value, onInput, maxLength = 80) {
  const row = document.createElement('div'); row.className = 'form-row';
  const caption = document.createElement('label'); caption.textContent = label;
  const input = document.createElement('input'); input.type = 'text'; input.maxLength = maxLength; input.value = value;
  input.addEventListener('input', () => onInput(input.value));
  caption.append(input); row.append(caption); return row;
}

export function renderSettings(container, state, actions) {
  container.append(formRow('ロボットの名前', state.name, (value) => { state.name = value; actions.change(); }, 24));
  const faceRow = document.createElement('div'); faceRow.className = 'form-row';
  const faceLabel = document.createElement('label'); faceLabel.textContent = 'ロボットの顔';
  const face = document.createElement('select');
  for (const emoji of ['🤖', '🐱', '👻', '🦊']) { const option = document.createElement('option'); option.value = emoji; option.textContent = emoji; face.append(option); }
  face.value = state.face;
  face.addEventListener('change', () => { state.face = face.value; actions.change(); });
  faceLabel.append(face); faceRow.append(faceLabel); container.append(faceRow);
  const note = document.createElement('p'); note.className = 'mode-note'; note.textContent = '完全一致が先、次に部分一致。同じ種類のルールは上から順に判定します。文字の前後の空白と全角・半角の違いは整えます。'; container.append(note);
  const heading = document.createElement('strong'); heading.textContent = '覚えている言葉'; container.append(heading);
  state.rules.forEach((rule, index) => {
    const box = document.createElement('div'); box.className = 'rule-item';
    box.append(formRow(`キーワード ${index + 1}`, rule.keyword, (value) => { rule.keyword = value; actions.change(); }, 40));
    box.append(formRow('返事', rule.response, (value) => { rule.response = value; actions.change(); }, 120));
    const row = document.createElement('div'); row.className = 'form-row';
    const label = document.createElement('label'); label.textContent = 'どう比べる？';
    const select = document.createElement('select');
    for (const [value, text] of [['exact', '完全一致'], ['partial', '部分一致']]) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
    select.value = rule.match;
    select.addEventListener('change', () => { rule.match = select.value; actions.change(); });
    label.append(select); row.append(label); box.append(row);
    if (state.rules.length > 1) {
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'このルールを消す';
      remove.addEventListener('click', () => { state.rules.splice(index, 1); actions.change(); container.replaceChildren(); renderSettings(container, state, actions); });
      box.append(remove);
    }
    container.append(box);
  });
  const controls = document.createElement('div'); controls.className = 'rule-actions';
  const add = document.createElement('button'); add.type = 'button'; add.textContent = '＋ ルールを追加'; add.disabled = state.rules.length >= 8;
  add.addEventListener('click', () => { state.rules.push({ keyword: '', response: '', match: 'exact' }); state.addedRule = true; actions.change(); container.replaceChildren(); renderSettings(container, state, actions); });
  controls.append(add); container.append(controls);
}

export function generateCode(state) {
  const exact = state.rules.filter((rule) => rule.match === 'exact').length;
  const partial = state.rules.length - exact;
  const lengths = state.rules.map((rule) => rule.keyword.trim().length).join(', ');
  return `# ルールは文字列をコードに埋め込まず、データとして受け取ります\n# 完全一致 ${exact}件 / 部分一致 ${partial}件 / キーワードの文字数 [${lengths}]\nimport json\nimport unicodedata\nsettings = json.loads(LESSON_DATA_JSON)\n\ndef normalize(text):\n    return unicodedata.normalize("NFKC", text).strip().casefold()\n\ndef choose_reply(message):\n    message = normalize(message)\n    for mode in ("exact", "partial"):\n        for number, rule in enumerate(settings["rules"]):\n            if rule["match"] != mode:\n                continue\n            key = normalize(rule["keyword"])\n            if mode == "exact" and message == key:\n                return rule["response"], mode, number\n            elif mode == "partial" and key in message:\n                return rule["response"], mode, number\n    return settings["fallback"], "none", -1\n\nreply, match_type, rule_index = choose_reply(settings["message"])\njson.dumps({"kind": "robot", "reply": reply, "matchType": match_type,\n            "ruleIndex": rule_index}, ensure_ascii=False)`;
}

export function validate(state, payload) {
  const message = (payload.message ?? state.lastInput).trim();
  if (!message) return '話しかける言葉を入力してください。';
  if (message.length > 200) return 'メッセージは200文字以内にしてください。';
  if (!state.name.trim()) return 'ロボットの名前を入力してください。';
  if (state.rules.some((rule) => !rule.keyword.trim() || !rule.response.trim())) return 'すべてのルールの言葉と返事を入力してください。';
  return null;
}

export function data(state, payload) {
  return { message: (payload.message ?? state.lastInput).trim(), rules: state.rules.map((rule) => ({ ...rule, keyword: rule.keyword.trim(), response: rule.response.trim() })), fallback: state.fallback };
}

export function isResult(value) {
  return value?.kind === 'robot' && typeof value.reply === 'string' && value.reply.length <= 1000
    && ['exact', 'partial', 'none'].includes(value.matchType) && Number.isInteger(value.ruleIndex);
}

export function renderOutput(container, result, state, context) {
  if (result) {
    const message = (context.payload.message ?? state.lastInput).trim();
    state.lastInput = message;
    state.history.push({ type: 'user', text: message }, { type: 'bot', text: result.reply });
    state.history = state.history.slice(-24);
  }
  container.replaceChildren();
  const header = document.createElement('div'); header.className = 'chat-top';
  header.textContent = `${state.face} ${state.name.trim() || 'ロボット'}`;
  const log = document.createElement('div'); log.className = 'chat-log'; log.setAttribute('role', 'log');
  if (!state.history.length) { const empty = document.createElement('p'); empty.className = 'mini-note'; empty.textContent = '「こんにちは」と話しかけてみよう。'; log.append(empty); }
  for (const entry of state.history) {
    const bubble = document.createElement('div'); bubble.className = `chat-message ${entry.type}`; bubble.textContent = entry.text; log.append(bubble);
  }
  const form = document.createElement('form'); form.className = 'chat-form';
  const input = document.createElement('input'); input.type = 'text'; input.placeholder = '言葉を入力'; input.maxLength = 200; input.setAttribute('aria-label', 'ロボットに話しかける');
  const send = document.createElement('button'); send.type = 'submit'; send.className = 'primary-button'; send.textContent = '送る';
  form.append(input, send);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) { input.focus(); return; }
    state.lastInput = message;
    context.execute({ message });
  });
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'subtle-button'; reset.textContent = '会話をリセット';
  reset.addEventListener('click', () => { state.history = []; renderOutput(container, null, state, context); });
  container.append(header, log, form, reset);
  log.scrollTop = log.scrollHeight;
}

export function refreshOutput(container, state) {
  const header = container.querySelector('.chat-top');
  if (header) header.textContent = `${state.face} ${state.name.trim() || 'ロボット'}`;
}

export function passes(mission, state, result, payload) {
  const message = (payload.message ?? state.lastInput).normalize('NFKC').trim().toLocaleLowerCase();
  if (mission === 1) return message === 'こんにちは' && result.reply === defaults[0].response && result.matchType === 'exact';
  if (mission === 2) return state.addedRule && result.ruleIndex >= 3 && result.matchType !== 'none';
  if (mission === 3 && result.matchType === 'partial' && result.ruleIndex >= 0) {
    const keyword = state.rules[result.ruleIndex]?.keyword.normalize('NFKC').trim().toLocaleLowerCase();
    return keyword && message !== keyword && message.includes(keyword);
  }
  return false;
}
