import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";
import { stringifyTree } from './treeprinter'
import {parser} from 'lezer-python'



// entry point for debugging
async function debug() {
  var source = `
  325325342234 + 54353482962`

  const t = parser.parse(source);
  console.log(stringifyTree(t.cursor(), source, 0));

  const ast = parse(source);
  console.log(ast)
  
  const repl = new BasicREPL(await addLibs());
  const result = repl.run(source).then(result => {
    console.log(result);    
  })  
}

debug();

