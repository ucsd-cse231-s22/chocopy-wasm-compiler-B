import { Type, SourceLocation } from "./ast"
import { Value } from "./ir"
import { GlobalEnv } from "./compiler"

export function isBaseName(name: string, env: GlobalEnv): boolean {
    var flag = false;
    env.base_names.forEach(base => {
      if(name.includes(base)){
        flag = true;
      }
    });
    return flag;
  }

/** Helper function for memory management: whether a type is a pointer.
 */
 export function typeIsPointer(type: Type) : boolean {
    switch (type.tag) {
        case "class":
        case "none":
        case "list":
        case "set":
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
        if(isBaseName(name, env)){
            return false;
        }
        const type: Type = (env.local_type.has(name)) ? env.local_type.get(name) : env.global_type.get(name);
        is_pointer = typeIsPointer(type);
    }
    return is_pointer;
}