import { Type, SourceLocation } from "./ast"
import { Value } from "./ir"
import { GlobalEnv } from "./compiler"

export enum TypeBits {
    CLASS = 0x1,
}

export function getTypeBits(type: Type): any {
    switch(type.tag){
        case "class":
            return TypeBits.CLASS;
        default:
            throw new Error(`Internal error: unhandled type in getTypeBits ${type.tag}`);
    }
}

/** Helper function for memory management: whether a type is a pointer.
 */
 export function typeIsPointer(type: Type) : boolean {
    switch (type.tag) {
        case "class":
        case "none":
            return true;

        case "number":
        case "bool":
            return false;

        default:
            // FIXME (memory management): I don't know what an "either" is
            throw new Error(`Internal error: unhandled type ${type.tag}`);
    }
}

/** Helper function for memory management: whether a type is a pointer.
 */
 export function valueIsPointer(val: Value<[Type, SourceLocation]>, env: GlobalEnv) : boolean {
    var is_pointer: boolean = false;
    if(val.tag == "none"){
        is_pointer = true;
    } else if(val.tag == "id"){
        const name = val.name;
        const type: Type = (env.local_type.has(name)) ? env.local_type.get(name) : env.global_type.get(name);
        is_pointer = typeIsPointer(type);
    }
    return is_pointer;
}

/** Generate code to decrease the refcount, if that variable is a pointer
 * (and don't do anything, if it's not a pointer)
 * This will get called when values are overwritten, and on local variables at
 * the end of a function
 */
export function decRefcount(name: string, env: GlobalEnv): Array<string> {
    if(name.includes("newObj") || name.includes("valname")){
      return [];
    }
    const type = (env.local_type.has(name)) ? env.local_type.get(name) : env.global_type.get(name);
    if(!typeIsPointer(type)){
      return [];
    }
    return [
      `${(env.locals.has(name)) ? `local` : `global`}.get $${name}`,
      `call $dec_refcount`,
      `drop`
    ]
  }
  
  /** Generate code to increase the refcount, if that variable is a pointer
   * (and don't do anything, if it's not a pointer)
   * This will get called when values are loaded from fields or variables
   */
export function incRefcount(name: string, env: GlobalEnv): Array<string> {
    if(name.includes("newObj") || name.includes("valname")){
      return [];
    }
    const type = (env.local_type.has(name)) ? env.local_type.get(name) : env.global_type.get(name);
    if(!typeIsPointer(type)){
      return [];
    }
    return [
      `${(env.locals.has(name)) ? `local` : `global`}.get $${name}`,
      `call $inc_refcount`,
      `drop`
    ]
  }