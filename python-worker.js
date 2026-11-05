/* Python はこの Worker 内で実行し、停止時には Worker ごと破棄する。 */
self.onmessage = async (event) => {
  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
    const pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/' });
    self.postMessage({ phase: 'ready' });
    const stdout = [];
    pyodide.setStdout({ batched: (line) => stdout.push(line) });
    pyodide.globals.set('CSV_TEXT', event.data.csvText);
    const result = await pyodide.runPythonAsync(event.data.code);
    const value = result == null ? '' : String(result);
    if (result && typeof result.destroy === 'function') result.destroy();
    self.postMessage({ ok: true, value, stdout: stdout.join('\n') });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error) });
  }
};
