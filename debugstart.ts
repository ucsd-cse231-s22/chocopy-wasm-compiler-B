import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";
export const builtinClasses : string = `
class Range(object):
  cur : int = 0
  min : int = 0
  max : int = 0
  stp : int = 0
  def new(self : Range, min : int, max : int, stp : int)->Range:
    if stp == 0:
      return None
    if min <= max and stp < 0:
      stp = 1
    if min >= max and stp > 0:
      stp = -1
    self.min = min
    self.cur = min
    self.max = max
    self.stp = stp
    return self
  def next(self : Range)->int:
    c : int = 0
    c = self.cur
    self.cur = self.cur + self.stp
    return c
  def hasnext(self : Range)->bool:
    return self.cur < self.max if self.stp >=0 else self.cur > self.max

class generator(object):
  size : int = 0
  addr : int = 0
  def new(self : generator, size : int, addr : int)->generator:
    self.size = size
    self.addr = addr
    return self
  def next(self : generator)->int:
    c : int = 0
    c = self.addr
    self.size = self.size - 1
    self.addr = self.addr + 4
    return c
  def hasnext(self : generator)->bool:
    return self.size < 1

`
// entry point for debugging
async function debug() {
  var source = 
  builtinClasses + 
  `
set_1 : set[int] = None
set_1 = {1,2}
print(set_1)
`
  const ast = parse(source);
  console.log(`AST: \n ${ast}`)
  
  const repl = new BasicREPL(await addLibs());
  // const result = repl.tc(source);
  // console.log(result);
  const result = repl.run(source).then(result => {
    console.log(result);
    console.log(importObject.output.trim().split("\n"));    
  })  
}

debug();

