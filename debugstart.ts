import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";


// entry point for debugging
async function debug() {
  var source = `
  class A(object):
    a:int = 0
  class B(A):
    b:int = 0
  def test(arg: A):
      pass
  x : B = None
  x = B()
  test(x)
  `

  const ast = parse(source);
  
  const repl = new BasicREPL(await addLibs());
  const result = repl.run(source).then(result => {
    console.log(result);    
  })  
}

try {
  debug();
} catch (err) {
  console.log(err);
}

