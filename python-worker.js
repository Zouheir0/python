// Classic dedicated worker for Python Path.
// importScripts avoids cross-origin ES-module worker loading issues.
// Keep the Pyodide runtime script and indexURL on the same pinned release.
const PYODIDE_VERSION = "v314.0.7";
const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/" + PYODIDE_VERSION + "/full/";
const PYODIDE_SCRIPT_URL = PYODIDE_INDEX_URL + "pyodide.js";

try {
  importScripts(PYODIDE_SCRIPT_URL);
} catch (error) {
  self.postMessage({ id: 1, type: "result", result: { output: "", error: "Could not download the Python engine from " + PYODIDE_SCRIPT_URL + ". Check that the browser or school network allows cdn.jsdelivr.net. Details: " + String(error && (error.message || error)) } });
}

self.addEventListener("message", async (event) => {
  const { id, code, inputs } = event.data || {};
  if (!Number.isInteger(id)) return;
  if (typeof self.loadPyodide !== "function") {
    self.postMessage({ id, type: "result", result: { output: "", error: "The Python engine script did not load. Refresh the page and try again." } });
    return;
  }
  try {
    self.postMessage({ id, type: "status", stage: "loading" });
    const pyodide = await self.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
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
