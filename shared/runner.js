export class PythonRunner {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.serial = 0;
    this.pending = null;
    this.timer = null;
  }

  run(lessonId, code, data = {}) {
    if (this.pending) return Promise.reject(new Error('Pythonは実行中です。'));
    if (code.length > 20000) return Promise.reject(new Error('コードは20,000文字以内にしてください。'));
    if (!this.worker) {
      this.worker = new Worker('python-worker.js');
      this.worker.onmessage = (event) => this.receive(event.data);
      this.worker.onerror = (event) => this.fail(new Error(event.message || 'Pythonを読み込めませんでした。'));
    }
    const requestId = ++this.serial;
    return new Promise((resolve, reject) => {
      this.pending = { lessonId, requestId, resolve, reject };
      this.worker.postMessage({ type: 'run', lessonId, requestId, code, data });
      this.arm(this.ready ? 8000 : 30000, this.ready ? '実行が8秒を超えました。無限ループがないか確認してください。' : 'Pythonの読み込みが30秒を超えました。通信を確認してください。');
    });
  }

  receive(message) {
    const pending = this.pending;
    if (!pending || message.lessonId !== pending.lessonId || message.requestId !== pending.requestId) return;
    if (message.phase === 'ready') {
      this.ready = true;
      this.arm(8000, '実行が8秒を超えました。無限ループがないか確認してください。');
      return;
    }
    if (message.phase !== 'result') return;
    clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    if (message.ok) pending.resolve(message);
    else {
      if (!this.ready) this.dispose();
      pending.reject(new Error(message.error || 'Pythonでエラーが出ました。'));
    }
  }

  arm(ms, message) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.fail(new Error(message)), ms);
  }

  fail(error) {
    const pending = this.pending;
    this.dispose();
    if (pending) pending.reject(error);
  }

  cancel() {
    const pending = this.pending;
    this.dispose();
    if (pending) pending.reject(new DOMException('実行を停止しました。', 'AbortError'));
  }

  dispose() {
    clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    this.ready = false;
    if (this.worker) this.worker.terminate();
    this.worker = null;
  }
}
