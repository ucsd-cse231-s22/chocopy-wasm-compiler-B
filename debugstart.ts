import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";

// entry point for debugging
async function debug() {
  var source = `
class SetIteratorInt(object): 
  set : set[int] = None
  currElement : int = 0
  def new(self :  SetIteratorInt, initVal :  set[int]) -> SetIteratorInt : 
      self.set = initVal
      self.currElement = self.set.firstItem()
      return self
  def next(self :  SetIteratorInt) -> int : 
      ret : int = 0
      ret = self.currElement
      if(self.hasnext() == True):
         self.currElement = self.set.next(self.currElement)
      return ret
  def hasnext(self :  SetIteratorInt) -> bool : 
      return self.set.hasnext(self.currElement)

def setToSetIteratorInt(initVal: set[int]) -> SetIteratorInt :
  return SetIteratorInt().new(initVal)

l : set[int] = None
i: int = 0
l = {1,2,3,4,5,6,7,8,9,10}
for i in l:
  print(i)
`


  // set_1.add(3)
  // set_1.add(3)
  // set_1.remove(1)
  // a = len(set_1)
  // b = 1 in set_1
  // print(a)
  // print(b)
  const ast = parse(source);
  
  const repl = new BasicREPL(await addLibs());
  var result = repl.tc(source);
  console.log(result);
  repl.run(source).then(result => {
    console.log(result);
  })
}

debug();