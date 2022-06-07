import { parser } from "@lezer/python";
import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";
import { stringifyTree } from "./treeprinter";

// entry point for debugging
async function debug() {
  var source = `
  a: [int] = None
  a = [1, 2, 3]
  a.insert(1, 6)
  `

  const ast = parse(source);
  console.log(`AST: \n ${ast}`)
  
  const repl = new BasicREPL(await addLibs());
  // const result = repl.tc(source);
  // console.log(result);
  const result = repl.run(source).then(result => {
    console.log(result);
  })
}

debug();

