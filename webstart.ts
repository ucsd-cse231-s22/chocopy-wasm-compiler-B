import {BasicREPL} from './repl';
import { Type, Value, BinOp } from './ast';
import { defaultTypeEnv } from './type-check';
import { NUM, BOOL, NONE } from './utils';
import { table } from 'console';

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

  var isNegative = BigInt(1);
  if (digitNum < 0) {
    isNegative = BigInt(-1);
    digitNum *= -1;
  }

  var consturctedBigint = BigInt(0);
  for (let i = 1; i < digitNum + 1; i++) {
    consturctedBigint += BigInt(load(arg, i)) * (base ** BigInt(i - 1));
  }
  return isNegative * consturctedBigint;
}

// allocate the bigint
function deconstructBigint(bigInt : bigint, alloc : any, store : any) : number {
  var isNegative = 1;
  if (bigInt < 0) {
    isNegative = -1;
    bigInt *= BigInt(-1);
  }

  var i = 1; // the first field is preserved for the size
  const base = BigInt(2 ** 31);
  var curAddress = alloc(0);

  // use a do-while loop to address the edge case of initial curVal == 0
  do {
    var remainder = bigInt % base;
    store(curAddress, i, Number(remainder)); // call the store function with address, offset, and val

    i += 1; // next iteration
    bigInt /= base; // default to use floor() 
  } while (bigInt > 0);

  alloc(i); // alllocate spaces for the fields
  store(curAddress, 0, isNegative * (i - 1)); // store the number of digits in the first field
  return curAddress;
}

function arithmeticOp(op : any, arg1 : number, arg2 : number, alloc : any, load : any, store : any) : any {
  var bigInt1 = reconstructBigint(arg1, load);
  var bigInt2 = reconstructBigint(arg2, load);
  var bigInt3 = BigInt(0);

  switch (op) {
    case BinOp.Plus:
      bigInt3 = bigInt1 + bigInt2;
      break;
    case BinOp.Minus:
      bigInt3 = bigInt1 - bigInt2;
      break;
    case BinOp.Mul:
      bigInt3 = bigInt1 * bigInt2;
      break;
    case BinOp.IDiv:
      bigInt3 = bigInt1 / bigInt2;
      break;
    case BinOp.Mod: 
      bigInt3 = bigInt1 % bigInt2;
      break;
  }
  return deconstructBigint(bigInt3, alloc, store);
}

function comparisonOp(op : any, arg1 : number, arg2 : number, alloc : any, load : any, store : any) : any {
  var bigInt1 = reconstructBigint(arg1, load);
  var bigInt2 = reconstructBigint(arg2, load);
  switch (op) {
    case BinOp.Eq:
      return bigInt1 === bigInt2 
    case BinOp.Neq:
      return bigInt1 !== bigInt2
    case BinOp.Lte:
      return bigInt1 <= bigInt2
    case BinOp.Gte:
      return bigInt1 >= bigInt2
    case BinOp.Lt: 
      return bigInt1 < bigInt2
    case BinOp.Gt: 
      return bigInt1 > bigInt2
  }
  throw Error("unknown comparison operator")
}

function print(typ : Type, arg : number, load : any) : any {
  console.log("Logging from WASM: ", arg);
  const elt = document.createElement("pre");
  document.getElementById("output").appendChild(elt);
  elt.innerText = stringify(typ, arg);

  if (typ.tag === "number") {
    elt.innerText = reconstructBigint(arg, load).toString();
  }
  return arg;
}

function abs_big(arg : number, alloc : any, load : any, store : any) : any {
  var bigInt = reconstructBigint(arg, load);
  if (bigInt >= BigInt(0)) {
    return arg;
  }
  return deconstructBigint(-bigInt, alloc, store);
}

function min_big(arg1 : number, arg2 : number, load : any) : any {
  var bigInt1 = reconstructBigint(arg1, load);
  var bigInt2 = reconstructBigint(arg2, load);
  if (bigInt1 > bigInt2) {
    return arg2;
  }
  return arg1;
}

function max_big(arg1 : number, arg2 : number, load : any) : any {
  var bigInt1 = reconstructBigint(arg1, load);
  var bigInt2 = reconstructBigint(arg2, load);
  if (bigInt1 > bigInt2) {
    return arg1;
  }
  return arg2;
}

function pow_big(arg1 : number, arg2 : number, alloc : any, load : any, store : any) : any {
  var bigInt1 = reconstructBigint(arg1, load);
  var bigInt2 = reconstructBigint(arg2, load);

  // "**"" returns the result of raising the first operand to the power of the second operand. 
  // It is equivalent to Math. pow , except it also accepts BigInts as operands.
  var bigInt3 = bigInt1 ** bigInt2;
  return deconstructBigint(bigInt3, alloc, store);
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

    var alloc = memoryModule.instance.exports.alloc;
    var load = memoryModule.instance.exports.load;
    var store = memoryModule.instance.exports.store;

    var importObject = {
      imports: {
        assert_not_none: (arg: any) => assert_not_none(arg),
        print_num: (arg: number) => print(NUM, arg, load),
        print_last_num: (arg: number) => print(NUM, arg, load),
        print_bool: (arg: number) => print(BOOL, arg, load),
        print_none: (arg: number) => print(NONE, arg, load),
        plus: (arg1: number, arg2: number) => arithmeticOp(BinOp.Plus, arg1, arg2, alloc, load, store),
        minus: (arg1: number, arg2: number) => arithmeticOp(BinOp.Minus, arg1, arg2, alloc, load, store),
        mul: (arg1: number, arg2: number) => arithmeticOp(BinOp.Mul, arg1, arg2, alloc, load, store),
        iDiv: (arg1: number, arg2: number) => arithmeticOp(BinOp.IDiv, arg1, arg2, alloc, load, store),
        mod: (arg1: number, arg2: number) => arithmeticOp(BinOp.Mod, arg1, arg2, alloc, load, store),
        eq: (arg1: number, arg2: number) => comparisonOp(BinOp.Eq,arg1, arg2, alloc, load, store), 
        neq: (arg1: number, arg2: number) => comparisonOp(BinOp.Neq,arg1, arg2, alloc, load, store), 
        lte: (arg1: number, arg2: number) => comparisonOp(BinOp.Lte,arg1, arg2, alloc, load, store), 
        gte: (arg1: number, arg2: number) => comparisonOp(BinOp.Gte,arg1, arg2, alloc, load, store), 
        lt: (arg1: number, arg2: number) => comparisonOp(BinOp.Lt,arg1, arg2, alloc, load, store),
        gt: (arg1: number, arg2: number) => comparisonOp(BinOp.Gt,arg1, arg2, alloc, load, store), 
        abs: (arg: number) => abs_big(arg, alloc, load, store),
        min: (arg1: number, arg2: number) => min_big(arg1, arg2, load),
        max: (arg1: number, arg2: number) => max_big(arg1, arg2, load),
        pow: (arg1: number, arg2 : number) => pow_big(arg1, arg2, alloc, load, store)
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
