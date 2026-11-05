const KEY = 'python-block-practice:progress';
const VERSION = 1;
const IDS = new Set(['data', 'gacha', 'robot', 'art']);

export function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.version !== VERSION || !saved.completed || typeof saved.completed !== 'object') throw new Error('invalid progress');
    const completed = {};
    for (const id of IDS) completed[id] = Array.isArray(saved.completed[id]) ? [...new Set(saved.completed[id].filter((value) => Number.isInteger(value) && value >= 1 && value <= 3))] : [];
    return completed;
  } catch {
    return { data: [], gacha: [], robot: [], art: [] };
  }
}

export function markComplete(lessonId, mission) {
  if (!IDS.has(lessonId) || !Number.isInteger(mission) || mission < 1 || mission > 3) return false;
  const completed = loadProgress();
  if (completed[lessonId].includes(mission)) return false;
  completed[lessonId].push(mission);
  try { localStorage.setItem(KEY, JSON.stringify({ version: VERSION, completed })); } catch { /* 保存できないブラウザでも教材は動かす */ }
  return true;
}

export function completedCount(lessonId) {
  return loadProgress()[lessonId]?.length ?? 0;
}
