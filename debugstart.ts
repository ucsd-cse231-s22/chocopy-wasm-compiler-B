import { TreeCursor } from "lezer-tree";
import {parser} from "lezer-python";
import { parse } from "./parser";
import { tc } from "./type-check";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";


export function stringifyTree(t:TreeCursor, source: string, d:number){
  var str = "";
  var spaces = " ".repeat(d*2);
  str += spaces + t.type.name;
  if(["Number","CallExpression","BinaryExpression","UnaryExpression"].includes(t.type.name)){
      str += "-->" + source.substring(t.from, t.to); 
  }
  str += "\n";
  if(t.firstChild()){
      do{
          str += stringifyTree(t, source, d + 1);
          
      
      }while(t.nextSibling());
      t.parent(); 
  }
  return str; 
}

// entry point for debugging
async function debug() {
  var source = `class C(object):
      x: int = 1`
  // const t = parser.parse(source);
  // console.log(stringifyTree(t.cursor(),source,0));
  
  // const ast = parse(source);
  // console.log(JSON.stringify((ast), null,2));


  // const repl = new BasicREPL(await addLibs());
  // const result = repl.run(source).then(result => {
  //   console.log(result);    
  // })
  
  const ast = parse(source);
  console.log(ast);
  const repl = new BasicREPL(await addLibs());
  const result = repl.run(source).then(result => {
    console.log(result);    
  }) 
}

debug();

