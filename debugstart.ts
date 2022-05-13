import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";


// entry point for debugging
async function debug() {
  var source = `
class C(object):
  i: int = 0
    
c: C = None
d: C = None
c = C()
test_refcount(c, 1)
d = c
test_refcount(c, 2)
d = None
test_refcount(c, 1)
c = None`
  const ast = parse(source);
  
  const repl = new BasicREPL(await addLibs());
  const result = repl.run(source).then(result => {
    console.log(result);    
  })  
}

debug();

