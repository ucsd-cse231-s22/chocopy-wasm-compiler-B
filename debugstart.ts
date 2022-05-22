import { TreeCursor } from "lezer-tree";
import { parser } from "lezer-python";
import { parse } from "./parser";
import { tc } from "./type-check";
import { BasicREPL } from "./repl";
import { importObject, addLibs } from "./tests/string-import-object.test";
import { augmentEnv, Config } from "./runner";
import { lowerProgram } from "./lower";
import { compile } from "./compiler";


export function stringifyTree(t: TreeCursor, source: string, d: number) {
  var str = "";
  var spaces = " ".repeat(d * 2);
  str += spaces + t.type.name;
  if (["Number", "CallExpression", "BinaryExpression", "UnaryExpression"].includes(t.type.name)) {
    str += "-->" + source.substring(t.from, t.to);
  }
  str += "\n";
  if (t.firstChild()) {
    do {
      str += stringifyTree(t, source, d + 1);


    } while (t.nextSibling());
    t.parent();
  }
  return str;
}

// entry point for debugging
async function debug() {
  var source =
  `
  c[0] = 1
  `
  // var source = 
  // `
  // class C(object):
  //   i: int = 0
  //   def printVal(self: C) -> None:
  //     print(self.i)
  //     return None
  
  // c: C = None
  // c = C()
  // c.printVal()
  // `

  const t = parser.parse(source);
  console.log(stringifyTree(t.cursor(), source, null))
  // const ast = parse(source);
  // console.log(JSON.stringify((ast), null, 2));

  // const repl = new BasicREPL(await addLibs());
  // const config: Config = { importObject: repl.importObject, env: repl.currentEnv, typeEnv: repl.currentTypeEnv, functions: repl.functions };
  // const parsed = parse(source);
  // console.log(JSON.stringify(parsed, null, 2))
  // const [tprogram, tenv] = tc(config.typeEnv, parsed);
  // console.log(JSON.stringify(tprogram, null, 2))
  // const globalEnv = augmentEnv(config.env, tprogram);
  // const irprogram = lowerProgram(tprogram, globalEnv);
  // console.log(JSON.stringify(irprogram, null,2))
  // const compiled = compile(irprogram, globalEnv);
  // console.log(compiled)
  // const result = repl.run(source).then(result => {
  //   console.log("hello")
  //   console.log(result);
  // })
}

debug();
