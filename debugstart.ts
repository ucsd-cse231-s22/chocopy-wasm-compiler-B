import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";


// entry point for debugging
async function debug() {
  var source = `
class C(object):
  def f(self: C) -> int:
    if True:
      return 0
    else:
      return`
  const ast = parse({main:source});
  
  const repl = new BasicREPL(await addLibs());
  const result = repl.run({main:source}).then(result => {
    console.log(result);    
  })  
}

debug();

