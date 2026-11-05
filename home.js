import { completedCount } from './shared/progress.js';
document.querySelectorAll('[data-progress]').forEach((label) => {
  label.textContent = `${completedCount(label.dataset.progress)} / 3 ミッション達成`;
});
