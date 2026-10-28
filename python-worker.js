// Python Path runs CPython through Pyodide in a disposable same-origin module worker.
// input() requests are sent to the page and awaited, so learners type directly into the console.
const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";
const PYODIDE_SOURCES = [
  PYODIDE_INDEX_URL + "pyodide.mjs",
  "https://cdn.jsdelivr.net/npm/pyodide@314.0.7/pyodide.mjs",
  "https://unpkg.com/pyodide@314.0.7/pyodide.mjs"
];
let pyodidePromise;
let nextInputRequestId = 1;
const pendingInputs = new Map();

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
  const message = event.data || {};

  // This branch must remain responsive while runPythonAsync is awaiting input.
  if (message.type === "stdin") {
    const resolveInput = pendingInputs.get(message.requestId);
    if (resolveInput) {
      pendingInputs.delete(message.requestId);
      resolveInput(String(message.value ?? ""));
    }
    return;
  }

  const { id, code } = message;
  if (!Number.isInteger(id)) return;
  try {
    self.postMessage({ id, type: "status", stage: "loading" });
    const pyodide = await getPyodide();
    self.postMessage({ id, type: "ready" });

    let outputCharacters = 0;
    const outputLimit = 100000;
    let outputWasTruncated = false;
    const writeOutput = (chunk) => {
      const text = String(chunk ?? "");
      if (outputCharacters >= outputLimit) return;
      const part = text.slice(0, outputLimit - outputCharacters);
      if (part) {
        outputCharacters += part.length;
        self.postMessage({ id, type: "output", chunk: part });
      }
      if (part.length < text.length && !outputWasTruncated) {
        outputWasTruncated = true;
        self.postMessage({ id, type: "output", chunk: "\n[Output truncated after 100,000 characters]\n" });
      }
    };
    const requestInput = (_prompt) => new Promise((resolveInput) => {
      const requestId = nextInputRequestId++;
      pendingInputs.set(requestId, resolveInput);
      self.postMessage({ id, type: "input-request", requestId });
    });
    pyodide.globals.set("_pp_write", writeOutput);
    pyodide.globals.set("_pp_request_input", requestInput);
    pyodide.globals.set("_pp_student_code", String(code ?? ""));

    const result = await pyodide.runPythonAsync(`import ast, io, sys, traceback

_pp_old_stdout = sys.stdout
_pp_old_stderr = sys.stderr
_pp_console = io.StringIO()
_pp_error = None
_pp_output_chars = 0
_pp_output_limit = 100000
_pp_output_truncated = False

def _pp_write_console(value):
    global _pp_output_chars, _pp_output_truncated
    text = str(value)
    if _pp_output_chars < _pp_output_limit:
        part = text[:_pp_output_limit - _pp_output_chars]
        if part:
            _pp_console.write(part)
            _pp_write(part)
            _pp_output_chars += len(part)
    else:
        part = ""
    if len(part) < len(text) and not _pp_output_truncated:
        marker = "\\n[Output truncated after 100,000 characters]\\n"
        _pp_console.write(marker)
        _pp_write(marker)
        _pp_output_truncated = True
    return len(text)

class _PPStream:
    def write(self, value):
        return _pp_write_console(value)
    def flush(self):
        return None
    def isatty(self):
        return True

async def _pp_input_async(*args, **kwargs):
    if kwargs:
        raise TypeError("input() takes no keyword arguments")
    if len(args) > 1:
        raise TypeError("input expected at most 1 argument, got " + str(len(args)))
    prompt = str(args[0]) if args else ""
    if prompt:
        _pp_write_console(prompt)
    value = await _pp_request_input(prompt)
    _pp_write_console(value + "\\n")
    return value

class _PPFunctionAnalyzer(ast.NodeVisitor):
    def __init__(self):
        self.has_input = False
        self.calls = set()
    def visit_FunctionDef(self, node):
        return
    def visit_AsyncFunctionDef(self, node):
        return
    def visit_Lambda(self, node):
        return
    def visit_ClassDef(self, node):
        return
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id == "input":
                self.has_input = True
            else:
                self.calls.add(node.func.id)
        elif isinstance(node.func, ast.Attribute):
            self.calls.add(node.func.attr)
        self.generic_visit(node)

_pp_tree = ast.parse(_pp_student_code, filename="<your code>", mode="exec")
_pp_functions = [node for node in ast.walk(_pp_tree)
                 if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
_pp_async_names = set()
for _pp_function in _pp_functions:
    if _pp_function.name == "__init__":
        continue
    _pp_analyzer = _PPFunctionAnalyzer()
    for _pp_statement in _pp_function.body:
        _pp_analyzer.visit(_pp_statement)
    if _pp_analyzer.has_input:
        _pp_async_names.add(_pp_function.name)

_pp_changed = True
while _pp_changed:
    _pp_changed = False
    for _pp_function in _pp_functions:
        if _pp_function.name == "__init__" or _pp_function.name in _pp_async_names:
            continue
        _pp_analyzer = _PPFunctionAnalyzer()
        for _pp_statement in _pp_function.body:
            _pp_analyzer.visit(_pp_statement)
        if _pp_analyzer.calls.intersection(_pp_async_names):
            _pp_async_names.add(_pp_function.name)
            _pp_changed = True

class _PPInputTransformer(ast.NodeTransformer):
    def visit_FunctionDef(self, node):
        if node.name == "__init__":
            return node
        self.generic_visit(node)
        if node.name in _pp_async_names:
            return ast.copy_location(ast.AsyncFunctionDef(
                name=node.name, args=node.args, body=node.body,
                decorator_list=node.decorator_list, returns=node.returns,
                type_comment=node.type_comment,
                type_params=getattr(node, "type_params", [])), node)
        return node
    def visit_Await(self, node):
        self.generic_visit(node)
        if isinstance(node.value, ast.Await):
            return node.value
        return node
    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id == "input":
            return ast.copy_location(ast.Await(value=ast.Call(
                func=ast.Name(id="_pp_input_async", ctx=ast.Load()),
                args=node.args, keywords=node.keywords)), node)
        if isinstance(node.func, ast.Name) and node.func.id in _pp_async_names:
            return ast.copy_location(ast.Await(value=node), node)
        if isinstance(node.func, ast.Attribute) and node.func.attr in _pp_async_names:
            return ast.copy_location(ast.Await(value=node), node)
        return node

try:
    sys.stdout = _PPStream()
    sys.stderr = _PPStream()
    _pp_tree = _PPInputTransformer().visit(_pp_tree)
    ast.fix_missing_locations(_pp_tree)
    _pp_code_object = compile(
        _pp_tree, "<your code>", "exec",
        flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True)
        _pp_student_globals = {"__name__": "__main__", "_pp_input_async": _pp_input_async}
    _pp_top_level = eval(_pp_code_object, _pp_student_globals)
    if _pp_top_level is not None:
        await _pp_top_level
except BaseException:
    _pp_error = traceback.format_exc()
finally:
    sys.stdout = _pp_old_stdout
    sys.stderr = _pp_old_stderr
{"output": _pp_console.getvalue(), "error": _pp_error}
`);
    const converted = result.toJs({ dict_converter: Object.fromEntries });
    result.destroy();
    self.postMessage({ id, type: "result", result: converted });
  } catch (error) {
    self.postMessage({ id, type: "result", result: { output: "", error: String(error?.stack || error?.message || error) } });
  }
});
