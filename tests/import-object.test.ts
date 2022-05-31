import { readFileSync } from "fs";
import { BuiltinLib} from "../builtinlib";
import * as RUNTIME_ERROR from '../runtime_error'
import { BinOp } from '../ast';

enum Type { Num, Bool, None }

function stringify(typ: Type, arg: any): string {
  switch (typ) {
    case Type.Num:
      return (arg as number).toString();
    case Type.Bool:
      return (arg as boolean) ? "True" : "False";
    case Type.None:
      return "None";
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

  var constructedBigint = BigInt(0);
  for (let i = 1; i < digitNum + 1; i++) {
    constructedBigint += BigInt(load(arg, i)) * (base ** BigInt(i - 1));
  }
  return isNegative * constructedBigint;
}

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
      break
    case BinOp.Minus:
      bigInt3 = bigInt1 - bigInt2;
      break
    case BinOp.Mul:
      bigInt3 = bigInt1 * bigInt2;
      break
    case BinOp.IDiv:
      bigInt3 = bigInt1 / bigInt2;
      break
    case BinOp.Mod: 
      bigInt3 = bigInt1 % bigInt2;
      break
  }
  return deconstructBigint(bigInt3, alloc, store);
}

function comparisonOp(op : any, arg1 : number, arg2 : number, alloc : any, load : any, store : any) : any {
  var bigInt1 = reconstructBigint(arg1, load);
  var bigInt2 = reconstructBigint(arg2, load);
  switch (op) {
    case BinOp.Eq:
      case BinOp.Eq:
        return bigInt1 === bigInt2;
      case BinOp.Neq:
        return bigInt1 !== bigInt2;
      case BinOp.Lte:
        return bigInt1 <= bigInt2;
      case BinOp.Gte:
        return bigInt1 >= bigInt2;
      case BinOp.Lt: 
        return bigInt1 < bigInt2;
      case BinOp.Gt: 
        return bigInt1 > bigInt2;
    }
    throw Error("RUNTIME ERROR: Unknown bigint comparison operator");
}

function print(typ: Type, arg : number, load : any) : any {
  if (typ === Type.Num) {
    importObject.output += reconstructBigint(arg, load).toString() + "\n";
  } else {
    importObject.output += stringify(typ, arg) + "\n";
  }
  return arg;
}

function last_print(typ: Type, arg : number, load : any) : any {
  return arg;
}

function index_out_of_bounds(length: any, index: any): any {
  if (index < 0 || index >= length)
    throw new Error(`RUNTIME ERROR: Index ${index} out of bounds`);
  return index;
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

// This function is proposed by the string group.
function big_to_i32(arg : number, load : any) : any {
  var bigInt = reconstructBigint(arg, load);
  const min_value = -2147483648;
  const max_value = 2147483647;

  if (bigInt > BigInt(max_value) || bigInt < BigInt(min_value)) {
    throw Error("RUNTIME ERROR: Cannot convert bigint to i32");
  } else {
    return Number(bigInt);
  }
}

function assert_not_none(arg: any) : any {
  if (arg === 0)
    throw new Error("RUNTIME ERROR: cannot perform operation on none");
  return arg;
}


export async function addLibs() {
  const memory = new WebAssembly.Memory({initial:10, maximum:100});
  const bytes = readFileSync("build/memory.wasm");
  const setBytes = readFileSync("build/sets.wasm");
  const memoryModule = await WebAssembly.instantiate(bytes, { js: { mem: memory } })
  importObject.libmemory = memoryModule.instance.exports;
  const setModule = await WebAssembly.instantiate(setBytes, {...importObject, js: { mem: memory } })
  importObject.libset = setModule.instance.exports;
  importObject.memory_values = memory;
  importObject.js = {memory};

  var alloc = importObject.libmemory.alloc;
  var load = importObject.libmemory.load;
  var store = importObject.libmemory.store;
  
  // print functions
  importObject.print = (arg: any) => print(Type.Num, arg, load);
  importObject.imports.print_num = (arg: number) => print(Type.Num, arg, load);
  importObject.imports.print_last_num = (arg: number) => last_print(Type.Num, arg, load);
  importObject.imports.print_bool = (arg: number) => print(Type.Bool, arg, load);
  importObject.imports.print_none = (arg: number) => print(Type.None, arg, load);

  // arithmetic operators
  importObject.imports.plus = (arg1: number, arg2: number) => arithmeticOp(BinOp.Plus, arg1, arg2, alloc, load, store);
  importObject.imports.minus = (arg1: number, arg2: number) => arithmeticOp(BinOp.Minus, arg1, arg2, alloc, load, store);
  importObject.imports.mul = (arg1: number, arg2: number) => arithmeticOp(BinOp.Mul, arg1, arg2, alloc, load, store);
  importObject.imports.iDiv = (arg1: number, arg2: number) => arithmeticOp(BinOp.IDiv, arg1, arg2, alloc, load, store);
  importObject.imports.mod = (arg1: number, arg2: number) => arithmeticOp(BinOp.Mod, arg1, arg2, alloc, load, store);

  // comparison operators
  importObject.imports.eq = (arg1: number, arg2: number) => comparisonOp(BinOp.Eq,arg1, arg2, alloc, load, store);
  importObject.imports.neq = (arg1: number, arg2: number) => comparisonOp(BinOp.Neq,arg1, arg2, alloc, load, store); 
  importObject.imports.lte = (arg1: number, arg2: number) => comparisonOp(BinOp.Lte,arg1, arg2, alloc, load, store); 
  importObject.imports.gte = (arg1: number, arg2: number) => comparisonOp(BinOp.Gte,arg1, arg2, alloc, load, store); 
  importObject.imports.lt = (arg1: number, arg2: number) => comparisonOp(BinOp.Lt,arg1, arg2, alloc, load, store);
  importObject.imports.gt = (arg1: number, arg2: number) => comparisonOp(BinOp.Gt,arg1, arg2, alloc, load, store); 

  // builtin functions
  importObject.imports.abs = (arg: number) => abs_big(arg, alloc, load, store);
  importObject.imports.min = (arg1: number, arg2: number) => min_big(arg1, arg2, load);
  importObject.imports.max = (arg1: number, arg2: number) => max_big(arg1, arg2, load);
  importObject.imports.pow = (arg1: number, arg2 : number) => pow_big(arg1, arg2, alloc, load, store);

  // for string/list/set group
  importObject.imports.get_num = (arg: number) => big_to_i32(arg, load);

  // others
  importObject.imports.index_out_of_bounds = (length: any, index: any) => index_out_of_bounds(length, index);
  importObject.imports.division_by_zero = (arg: number, line: number, col: number) => RUNTIME_ERROR.division_by_zero(arg, line, col);
  importObject.imports.assert_not_none = (arg: any, line: number, col: number) => RUNTIME_ERROR.assert_not_none(arg, line, col);
  importObject.imports.stack_push = (line: number) => RUNTIME_ERROR.stack_push(line);
  importObject.imports.stack_clear = () => RUNTIME_ERROR.stack_clear();
  importObject.imports.assert_not_none = (arg: any) => assert_not_none(arg);

  return importObject;
}

export const importObject : any = {
  imports: {
    // we typically define print to mean logging to the console. To make testing
    // the compiler easier, we define print so it logs to a string object.
    //  We can then examine output to see what would have been printed in the
    //  console.
    ...BuiltinLib.reduce((o:Record<string, Function>, key)=>Object.assign(o, {[key.name]:key.body}), {}),
  },
  output: "",
};
