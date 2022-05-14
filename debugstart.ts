import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";


// entry point for debugging
async function debug() {
  var source = `
class Node(object):
  prev: Node = None
  next: Node = None
    
node0: Node = None
node1: Node = None
node2: Node = None
node0 = Node()
node1 = Node()
node2 = Node()
  
node0.prev = node2
node0.next = node1
node1.prev = node0
node1.next = node2
node2.prev = node1
node2.next = node0
`
  const ast = parse(source);
  
  const repl = new BasicREPL(await addLibs());
  const result = repl.run(source).then(result => {
    console.log(result);    
  })  
}

debug();

