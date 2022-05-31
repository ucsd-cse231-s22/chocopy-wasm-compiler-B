import { readFileSync } from "fs";
import { FreeList } from "../allocator";

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

function assert_not_none(arg: any) : any {
  if (arg === 0)
    throw new Error("RUNTIME ERROR: cannot perform operation on none");
  return arg;
}

export async function addLibs() {
  const bytes = readFileSync("build/memory.wasm");
  const memory = new WebAssembly.Memory({initial:10, maximum:100});
  const mem_allocator = new FreeList(100);
  const memoryModule = await WebAssembly.instantiate(bytes, { js: { mem: memory }, 
    console: {
      log: function(arg: any) {
        console.log(arg);
      }
    }, 
    memory_management: {
      alloc_memory: function(size: any){
        var addr = mem_allocator.alloc(size);
        console.log(`Alloc ${size} byte + 3 byte for the header: ${addr}-${addr+(12+size*4)}`);
        return addr;
      },
      free_memory: function(addr: any, size: any) {
        mem_allocator.free(addr, size);
        console.log(`Free ${size} byte + 3 byte for the header: ${addr}-${addr+(12+size*4)}`);
      }
    }
  })
  importObject.libmemory = memoryModule.instance.exports,
  importObject.memory_values = memory;
  importObject.memory_allocator = mem_allocator;
  importObject.js = {memory};
  return importObject;
}

export const importObject : any = {
  imports: {
    // we typically define print to mean logging to the console. To make testing
    // the compiler easier, we define print so it logs to a string object.
    //  We can then examine output to see what would have been printed in the
    //  console.
    assert_not_none: (arg: any) => assert_not_none(arg),
    print: (arg: any) => print(Type.Num, arg),
    print_num: (arg: number) => print(Type.Num, arg),
    print_bool: (arg: number) => print(Type.Bool, arg),
    print_none: (arg: number) => print(Type.None, arg),
    abs: Math.abs,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
  },

  output: "",
};
