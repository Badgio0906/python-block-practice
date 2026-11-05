/* Pyodide を Worker に保持し、各実行は独立した Python の globals で処理する。 */
let enginePromise;

function engine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
      return loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/' });
    })();
  }
  return enginePromise;
}

self.onmessage = async ({ data: request }) => {
  if (request.type !== 'run') return;
  const { lessonId, requestId, code, data } = request;
  let globals;
  try {
    const pyodide = await engine();
    self.postMessage({ phase: 'ready', lessonId, requestId });
    const stdout = [];
    let outputSize = 0;
    pyodide.setStdout({ batched: (line) => {
      outputSize += line.length;
      if (outputSize < 200000) stdout.push(line);
    } });
    globals = pyodide.toPy({
      CSV_TEXT: typeof data?.csvText === 'string' ? data.csvText : '',
      LESSON_DATA_JSON: JSON.stringify(data ?? {}),
    });
    const result = await pyodide.runPythonAsync(code, { globals });
    const value = result == null ? '' : String(result);
    if (result && typeof result.destroy === 'function') result.destroy();
    if (value.length > 1000000) throw new Error('結果が大きすぎます。出力を減らしてください。');
    self.postMessage({ phase: 'result', lessonId, requestId, ok: true, value, stdout: stdout.join('\n') });
  } catch (error) {
    self.postMessage({ phase: 'result', lessonId, requestId, ok: false, error: String(error) });
  } finally {
    if (globals && typeof globals.destroy === 'function') globals.destroy();
  }
};
