import { readFileSync } from "fs";
import { BuiltinLib} from "../builtinlib";
import { RunTimeError } from "../error_reporting";
import * as RUNTIME_ERROR from '../runtime_error'

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

function print(typ: Type, arg: any): any {
  importObject.output += stringify(typ, arg);
  importObject.output += "\n";
  return arg;
}

function index_out_of_bounds(length: any, index: any): any {
  if (index < 0 || index >= length)
    throw new Error(`RUNTIME ERROR: Index ${index} out of bounds`);
  return index;
}


var IntBuffer:any;

export async function addLibs() {
  const memory = new WebAssembly.Memory({initial:10, maximum:100});
  IntBuffer = new Int32Array(memory.buffer)
  const bytes = readFileSync("build/memory.wasm");
  const setBytes = readFileSync("build/sets.wasm");
  const memoryModule = await WebAssembly.instantiate(bytes, { js: { mem: memory } })
  importObject.libmemory = memoryModule.instance.exports;
  const setModule = await WebAssembly.instantiate(setBytes, {...importObject, js: { mem: memory } })
  importObject.libset = setModule.instance.exports;
  importObject.memory_values = memory;
  importObject.js = {memory};
  return importObject;
}

export const importObject : any = {
  imports: {
    // we typically define print to mean logging to the console. To make testing
    // the compiler easier, we define print so it logs to a string object.
    //  We can then examine output to see what would have been printed in the
    //  console.
    index_out_of_bounds: (length: any, index: any) => index_out_of_bounds(length, index),
    division_by_zero: (arg: number, line: number, col: number) => RUNTIME_ERROR.division_by_zero(arg, line, col),
    assert_not_none: (arg: any, line: number, col: number) => RUNTIME_ERROR.assert_not_none(arg, line, col),
    stack_push: (line: number) => RUNTIME_ERROR.stack_push(line),
    stack_clear: () => RUNTIME_ERROR.stack_clear(),
    print: (arg: any) => print(Type.Num, arg),
    print_num: (arg: number) => print(Type.Num, arg),
    print_bool: (arg: number) => print(Type.Bool, arg),
    print_none: (arg: number) => print(Type.None, arg),
    ...BuiltinLib.reduce((o:Record<string, Function>, key)=>Object.assign(o, {[key.name]:key.body}), {}),
    len: (arg:number)=>IntBuffer[Math.floor(arg/4)],
    print_shallow_list: (arg:number, typeIndex:number)=>{
      const length = IntBuffer[Math.floor(arg/4)];
      if(typeIndex>2)
        throw new RunTimeError("print list now only supports [ int | bool | none ]")
      const funcForPrint = [importObject.imports.print_num, importObject.imports.print_bool, importObject.imports.print_none][typeIndex]
      for(let i=1;i<=length;i++)
        funcForPrint(IntBuffer[Math.floor(arg/4 + i)]);
      return 0;
    }
  },

  output: "",
};
