import { readFileSync } from "fs";
import { BuiltinLib } from "../builtinlib";
import * as RUNTIME_ERROR from '../runtime_error';
import { PrintType } from '../utils';


function stringify(typ: PrintType, arg: any, mem?: WebAssembly.Memory, typeNum?: number) : string {
  switch(PrintType[typ]) {
    case "number":
      return (arg as number).toString();
    case "bool":
      return (arg as boolean)? "True" : "False";
    case "none":
      return "None";
    // case "class":
    //   return typ.name;
    // case "set":
    //   return "Set";
    // case "dict":
    //   return "Dict";
    // case "str":
    //   return (arg as string);
    case "list":
      var bytes = new Uint8Array(mem.buffer, arg, 4);
      var length = ((bytes[0] & 0xFF) | (bytes[1] & 0xFF) << 8 | (bytes[2] & 0xFF) << 16 | (bytes[3] & 0xFF) << 24);
      bytes = new Uint8Array(mem.buffer, arg + 4, 4);
      var address = ((bytes[0] & 0xFF) | (bytes[1] & 0xFF) << 8 | (bytes[2] & 0xFF) << 16 | (bytes[3] & 0xFF) << 24);
      var elementArray = new Int32Array(mem.buffer, address, length);
      console.log(elementArray[0]);
      var string = "[";
      for (let i = 0; i < length; i++) {
        if (typeNum > PrintType.list) {
          string += stringify(typ, elementArray[i], mem, typeNum - PrintType.list);
        }
        else {
          string += stringify(typeNum, elementArray[i], mem);
        }
        if (i < length - 1) {
          string += ", ";
        }
      }
      string += "]";
      return string;
  }
}

function print(typ: PrintType, arg: any, mem?: WebAssembly.Memory, typeNum?: number): any {
  importObject.output += stringify(typ, arg, mem, typeNum);
  importObject.output += "\n";
  return arg;
}

export async function addLibs() {
  const memory = new WebAssembly.Memory({initial:10, maximum:100});
  const bytes = readFileSync("build/memory.wasm");
  const setBytes = readFileSync("build/sets.wasm");
  const listBytes = readFileSync("build/list.wasm");
  const memoryModule = await WebAssembly.instantiate(bytes, { js: { mem: memory } })
  importObject.libmemory = memoryModule.instance.exports;
  const setModule = await WebAssembly.instantiate(setBytes, {...importObject, js: { mem: memory } })
  importObject.libset = setModule.instance.exports;
  const listModule = await WebAssembly.instantiate(listBytes, {...importObject, js: {mem: memory}});
  importObject.liblist = listModule.instance.exports;
  importObject.imports.print_list = (arg: number, typeNum: number) => print(PrintType.list, arg, memory, typeNum);
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
    assert_not_none: (arg: any, line: number, col: number) => RUNTIME_ERROR.assert_not_none(arg, line, col),
    division_by_zero: (arg: number, line: number, col: number) => RUNTIME_ERROR.division_by_zero(arg, line, col),
    index_out_of_bounds: (length: any, index: any, line: number, col: number) => RUNTIME_ERROR.index_out_of_bounds(length, index, line, col),
    stack_clear: () => RUNTIME_ERROR.stack_clear(),
    stack_push: (line: number) => RUNTIME_ERROR.stack_push(line),
    print_num: (arg: number) => print(PrintType.number, arg),
    print_bool: (arg: number) => print(PrintType.bool, arg),
    print_none: (arg: number) => print(PrintType.none, arg),
    ...BuiltinLib.reduce((o:Record<string, Function>, key)=>Object.assign(o, {[key.name]:key.body}), {}),
  },

  output: "",
};
