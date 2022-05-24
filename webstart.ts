import { BasicREPL } from './repl';
import { Type, Value } from './ast';
import { defaultTypeEnv } from './type-check';
import { NUM, BOOL, NONE, CLASS } from './utils';

function stringify(typ: Type, arg: any): string {
  switch (typ.tag) {
    case "number":
      return (arg as number).toString();
    case "bool":
      return (arg as boolean) ? "True" : "False";
    case "none":
      return "None";
    case "class":
      return typ.name;
  }
}

function print(typ: Type, arg: number, mem?: WebAssembly.Memory): any {
  console.log("Logging from WASM: ", arg);
  if (typ.tag === "class") {
    switch (typ.name) {
      case "str":
        // let register_2 = ((lit.value.charCodeAt(i+1) & 0xFF) << 8)
        var bytes = new Uint8Array(mem.buffer, arg, 4);
        var length = ((bytes[0] & 0xFF) | (bytes[1] & 0xFF) << 8 | (bytes[2] & 0xFF) << 16 | (bytes[3] & 0xFF) << 24);
        console.log(length); // length is correct
        var char_bytes = new Uint8Array(mem.buffer, arg + 4, length);
        console.log(char_bytes[0]);
        var string = new TextDecoder('utf8').decode(char_bytes);

        const elt = document.createElement("pre");
        document.getElementById("output").appendChild(elt);
        elt.innerText = string;
    }
  }

  else {
    const elt = document.createElement("pre");
    document.getElementById("output").appendChild(elt);
    elt.innerText = stringify(typ, arg);
  }
  return arg;
}

function assert_not_none(arg: any): any {
  if (arg === 0)
    throw new Error("RUNTIME ERROR: cannot perform operation on none");
  return arg;
}

function index_out_of_bounds(length: any, index: any): any {
  if (index < 0 || index >= length)
    throw new Error(`RUNTIME ERROR: Index ${index} out of bounds`);
  return index;
}

function webStart() {
  document.addEventListener("DOMContentLoaded", async function () {

    // https://github.com/mdn/webassembly-examples/issues/5

    const memory = new WebAssembly.Memory({ initial: 10, maximum: 100 });
    const memoryModule = await fetch('memory.wasm').then(response =>
      response.arrayBuffer()
    ).then(bytes =>
      WebAssembly.instantiate(bytes, { js: { mem: memory } })
    );

    var importObject:any = {
      imports: {
        assert_not_none: (arg: any) => assert_not_none(arg),
        index_out_of_bounds: (arg1: any, arg2: any) => index_out_of_bounds(arg1, arg2),
        print_num: (arg: number) => print(NUM, arg),
        print_bool: (arg: number) => print(BOOL, arg),
        print_none: (arg: number) => print(NONE, arg),
        print_str: (arg: number) => print(CLASS("str"), arg, memory),
        abs: Math.abs,
        min: Math.min,
        max: Math.max,
        pow: Math.pow
      },
      libmemory: memoryModule.instance.exports,
      memory_values: memory,
      js: { memory: memory }
    };

    const stringModule = await fetch('string.wasm').then(response =>
      response.arrayBuffer()
    ).then(strings =>
      WebAssembly.instantiate(strings, {...importObject, js: { mem: memory } })
    );

    importObject.libstring = stringModule.instance.exports;

    var repl = new BasicREPL(importObject);

    function renderResult(result: Value): void {
      if (result === undefined) { console.log("skip"); return; }
      if (result.tag === "none") return;
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      switch (result.tag) {
        case "num":
          elt.innerText = String(result.value);
          break;
        case "bool":
          elt.innerHTML = (result.value) ? "True" : "False";
          break;
        case "object":
          elt.innerHTML = `<${result.name} object at ${result.address}`
          break
        default: throw new Error(`Could not render value: ${result}`);
      }
    }

    function renderError(result: any): void {
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.setAttribute("style", "color: red");
      elt.innerText = String(result);
    }

    function setupRepl() {
      document.getElementById("output").innerHTML = "";
      const replCodeElement = document.getElementById("next-code") as HTMLTextAreaElement;
      replCodeElement.addEventListener("keypress", (e) => {

        if (e.shiftKey && e.key === "Enter") {
        } else if (e.key === "Enter") {
          e.preventDefault();
          const output = document.createElement("div");
          const prompt = document.createElement("span");
          prompt.innerText = "»";
          output.appendChild(prompt);
          const elt = document.createElement("textarea");
          // elt.type = "text";
          elt.disabled = true;
          elt.className = "repl-code";
          output.appendChild(elt);
          document.getElementById("output").appendChild(output);
          const source = replCodeElement.value;
          elt.value = source;
          replCodeElement.value = "";
          repl.run(source).then((r) => { renderResult(r); console.log("run finished") })
            .catch((e) => { renderError(e); console.log("run failed", e) });;
        }
      });
    }

    function resetRepl() {
      document.getElementById("output").innerHTML = "";
    }

    document.getElementById("run").addEventListener("click", function (e) {
      repl = new BasicREPL(importObject);
      const source = document.getElementById("user-code") as HTMLTextAreaElement;
      resetRepl();
      repl.run(source.value).then((r) => { renderResult(r); console.log("run finished") })
        .catch((e) => { renderError(e); console.log("run failed", e) });;
    });
    setupRepl();
  });
}

webStart();
