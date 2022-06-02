import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";

// entry point for debugging
async function debug() {
  var source = `
a:bool = True
b:bool = False
b = a and False
print(a)
print(b)
  `
  const ast = parse(source);
  console.log(`AST: \n ${ast}`)
  
  const repl = new BasicREPL(await addLibs());
  // const result = repl.tc(source);
  // console.log(result);
  const result = repl.run(source, true, true).then(result => {
    console.log(result);
  })
}

debug();

