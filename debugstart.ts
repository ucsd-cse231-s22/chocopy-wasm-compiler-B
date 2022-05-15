import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";


// entry point for debugging
async function debug() {
  var source = `
class C(object):
  i: int = 0
 
  def foo(self: C) -> C:
    c0: C = None
    c1: C = None
    c0 = C()
    c1 = C()
    print(get_refcount(c0))
    return c0

v: C = None
v = C().foo()
print(get_refcount(C().foo()))
print(get_refcount(v))
`
  const ast = parse(source);
  
  const repl = new BasicREPL(await addLibs());
  const result = repl.run(source).then(result => {
    // console.log(result);
    console.log(importObject.output.trim().split("\n"));    
  })  
}

debug();

