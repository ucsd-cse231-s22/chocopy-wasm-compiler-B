import {BasicREPL} from './repl';
import { Type, Value, BinOp } from './ast';
import { defaultTypeEnv } from './type-check';
import { NUM, BOOL, NONE } from './utils';
import { table } from 'console';
import { electron } from 'webpack';

function stringify(typ: Type, arg: any) : string {
  switch(typ.tag) {
    case "number":
      return (arg as number).toString();
    case "bool":
      return (arg as boolean)? "True" : "False";
    case "none":
      return "None";
    case "class":
      return typ.name;
  }
}

function reconstructBigint(arg : number, load : any) : bigint {
  var base = BigInt(2 ** 31);
  var digitNum = load(arg, 0);
  var consturctedBigint = BigInt(0);
  for (let i = 1; i < digitNum + 1; i++) {
    consturctedBigint += BigInt(load(arg, i)) * (base ** BigInt(i - 1));
  }
  return consturctedBigint;
}

function print(typ: Type, arg : number, load : any) : any {
  console.log("Logging from WASM: ", arg);
  const elt = document.createElement("pre");
  document.getElementById("output").appendChild(elt);
  elt.innerText = stringify(typ, arg);

  if (typ.tag === "number") {
    elt.innerText = reconstructBigint(arg, load).toString();
  }
  return arg;
}

function binop(op: BinOp, type:Type, arg1: number, arg2: number, load:any, alloc:any) : any {
  const arg1val = reconstructBigint(arg1,load); 
  const arg2val = reconstructBigint(arg2,load);
  var newval:bigint = BigInt(0)
  switch(op) {
    case(BinOp.Plus):
      newval = arg1val + arg2val
  }
  var generatedString = ``
  var i = 1 
  const base = BigInt(2**32) 

  do {
    var remainder = newval % base;

    generatedString += `(i32.const ${i})\n(i32.const ${remainder})\n(call $store)`; // call the store function with address, offset, and val

    i += 1; // next iteration
    newval /= base; // default to use floor() 
  } while (newval > 0);

  // "i" represents the number of fields
  var prefix = ``;
  var allocation = `(i32.const ${i})\n(call $alloc)\n`; // allocate spaces for the number
  var storeSize = `(i32.const 0)\n(i32.const ${i})\n(call $store)\n`; // store the size of the number at the first field
  while (i > 0) {
    prefix += `(i32.const 0)\n(call $alloc)\n`; // prepare the addresses for the store calls
    i -= 1;
  }
  prefix += allocation + storeSize;
  return [prefix + generatedString]; 
}

function assert_not_none(arg: any) : any {
  if (arg === 0)
    throw new Error("RUNTIME ERROR: cannot perform operation on none");
  return arg;
}

function webStart() {
  document.addEventListener("DOMContentLoaded", async function() {

    // https://github.com/mdn/webassembly-examples/issues/5

    const memory = new WebAssembly.Memory({initial:10, maximum:100});
    const memoryModule = await fetch('memory.wasm').then(response => 
      response.arrayBuffer()
    ).then(bytes => 
      WebAssembly.instantiate(bytes, { js: { mem: memory } })
    );

    var importObject = {
      imports: {
        assert_not_none: (arg: any) => assert_not_none(arg),
        print_num: (arg: number) => print(NUM, arg, memoryModule.instance.exports.load),
        print_bool: (arg: number) => print(BOOL, arg, memoryModule.instance.exports.load),
        print_none: (arg: number) => print(NONE, arg, memoryModule.instance.exports.load),
        binop: (arg1:number, arg2:number) => binop(BinOp.Plus,NUM, arg1,arg2, memoryModule.instance.exports.load,memoryModule.instance.exports.alloc),
        abs: Math.abs,
        min: Math.min,
        max: Math.max,
        pow: Math.pow, 
      },
      libmemory: memoryModule.instance.exports,
      memory_values: memory,
      js: {memory: memory}
    };
    var repl = new BasicREPL(importObject);

    function renderResult(result : Value) : void {
      if(result === undefined) { console.log("skip"); return; }
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

    function renderError(result : any) : void {
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.setAttribute("style", "color: red");
      elt.innerText = String(result);
    }

    function setupRepl() {
      document.getElementById("output").innerHTML = "";
      const replCodeElement = document.getElementById("next-code") as HTMLTextAreaElement;
      replCodeElement.addEventListener("keypress", (e) => {

        if(e.shiftKey && e.key === "Enter") {
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
          repl.run(source).then((r) => { renderResult(r); console.log ("run finished") })
              .catch((e) => { renderError(e); console.log("run failed", e) });;
        }
      });
    }

    function resetRepl() {
      document.getElementById("output").innerHTML = "";
    }

    document.getElementById("run").addEventListener("click", function(e) {
      repl = new BasicREPL(importObject);
      const source = document.getElementById("user-code") as HTMLTextAreaElement;
      resetRepl();
      repl.run(source.value).then((r) => { renderResult(r); console.log ("run finished") })
          .catch((e) => { renderError(e); console.log("run failed", e) });;
    });
    setupRepl();
  });
}

webStart();
