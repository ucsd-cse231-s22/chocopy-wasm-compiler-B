import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";

// entry point for debugging
async function debug() {
  var source = `
  class A(object):
       
       def __init__(self:A):
           pass
       def show(self:A):
           print(1)
  class B(A):
       def __init__(self:B):
           pass
       def show(self:B):
           super().show()
       
  `
  const ast = parse(source);
  console.log(`AST: \n ${ast}`)
  
  const repl = new BasicREPL(await addLibs());
  //const result = repl.tc(source);
  // console.log(result);
  const result = repl.run(source).then(result => {
    console.log(result);
  })
}

debug();
