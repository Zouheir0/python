// Python Path runs CPython through Pyodide in a disposable same-origin module worker.
// CDN imports are dynamic so network/CSP failures are returned as readable console errors.
const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";
const PYODIDE_SOURCES = [
  PYODIDE_INDEX_URL + "pyodide.mjs",
  "https://cdn.jsdelivr.net/npm/pyodide@314.0.7/pyodide.mjs",
  "https://unpkg.com/pyodide@314.0.7/pyodide.mjs"
];
let pyodidePromise;

async function loadPython() {
  const failures = [];
  let module;
  for (const url of PYODIDE_SOURCES) {
    try { module = await import(url); break; }
    catch (error) { failures.push(url + ": " + String(error?.message || error)); }
  }
  if (!module) throw new Error("Python runtime could not load from any supported CDN. " + failures.join(" | "));
  return await module.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
}
async function getPyodide() {
  if (!pyodidePromise) pyodidePromise = loadPython().catch(error => { pyodidePromise = null; throw error; });
  return pyodidePromise;
}
self.addEventListener("message", async (event) => {
  const { id, code, inputs } = event.data || {};
  if (!Number.isInteger(id)) return;
  try {
    self.postMessage({ id, type: "status", stage: "loading" });
    const pyodide = await getPyodide();
    self.postMessage({ id, type: "ready" });
    pyodide.globals.set("_pp_student_code", String(code ?? ""));
    const inputProxy = pyodide.toPy(String(inputs ?? "").split("\n"));
    pyodide.globals.set("_pp_user_inputs", inputProxy);
    const result = await pyodide.runPythonAsync(`import builtins, io, sys, traceback
_pp_old_stdout = sys.stdout
_pp_old_stderr = sys.stderr
_pp_old_input = builtins.input
_pp_console = io.StringIO()
_pp_error = None
_pp_lines = list(_pp_user_inputs)
def _pp_input(prompt=""):
    if prompt:
        _pp_console.write(str(prompt))
    if not _pp_lines:
        raise EOFError("No input line was provided. Add an answer in Input values.")
    _pp_value = _pp_lines.pop(0)
    _pp_console.write(_pp_value + "\\n")
    return _pp_value
try:
    builtins.input = _pp_input
    sys.stdout = _pp_console
    sys.stderr = _pp_console
    exec(compile(_pp_student_code, "<your code>", "exec"), {"__name__": "__main__"})
except BaseException:
    _pp_error = traceback.format_exc()
finally:
    sys.stdout = _pp_old_stdout
    sys.stderr = _pp_old_stderr
    builtins.input = _pp_old_input
{"output": _pp_console.getvalue(), "error": _pp_error}
`);
    const converted = result.toJs({ dict_converter: Object.fromEntries });
    result.destroy(); inputProxy.destroy();
    self.postMessage({ id, type: "result", result: converted });
  } catch (error) {
    self.postMessage({ id, type: "result", result: { output: "", error: String(error?.stack || error?.message || error) } });
  }
});
