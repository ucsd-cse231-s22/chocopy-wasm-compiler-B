import { readFileSync } from "fs";
import { BOOL, CLASS, NONE, NUM } from "../utils";
import { Type } from "../ast";

//enum Type { Num, Bool, None }

function stringify(typ: Type, arg: any): string {
  switch (typ) {
    case NUM:
      return (arg as number).toString();
    case BOOL:
      return (arg as boolean) ? "True" : "False";
    case NONE:
      return "None";
  }
}

function print(typ: Type, arg: any, mem?: WebAssembly.Memory): any {
  importObject.output += stringify(typ, arg);
  importObject.output += "\n";
  return arg;
}

function assert_not_none(arg: any): any {
  if (arg === 0)
    throw new Error("RUNTIME ERROR: cannot perform operation on none");
  return arg;
}

function assert_in_range(length: any, index: any): any {
  if (index < 0) {
    throw new Error("RUNTIME ERROR: index less than 0");
  }
  if (length <= index) {
    throw new Error("RUNTIME ERROR: index not in range");
  }
  return index;
}
const memory = new WebAssembly.Memory({ initial: 10, maximum: 100 });
export async function addLibs() {
  const bytes = readFileSync("build/memory.wasm");
  const strings = readFileSync("build/string.wasm");
  //const memory = new WebAssembly.Memory({ initial: 10, maximum: 100 });
  const memoryModule = await WebAssembly.instantiate(bytes, { js: { mem: memory } })
  importObject.libmemory = memoryModule.instance.exports;
  const stringModule = await WebAssembly.instantiate(strings, {...importObject, js: { mem: memory } })
  importObject.libstring = stringModule.instance.exports;
  importObject.memory_values = memory;
  importObject.js = { memory };
  return importObject;
}

export const importObject: any = {
  imports: {
    // we typically define print to mean logging to the console. To make testing
    // the compiler easier, we define print so it logs to a string object.
    //  We can then examine output to see what would have been printed in the
    //  console.
    assert_not_none: (arg: any) => assert_not_none(arg),
    assert_in_range: (arg1: any, arg2: any) => assert_in_range(arg1, arg2),
    print: (arg: any) => print(NUM, arg),
    print_num: (arg: number) => print(NUM, arg),
    print_bool: (arg: number) => print(BOOL, arg),
    print_none: (arg: number) => print(NONE, arg),
    print_str: (arg: number) => print(CLASS("str"), arg, memory),
    abs: Math.abs,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
  },

  output: "",
};