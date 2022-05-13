import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";


// entry point for debugging
async function debug() {
  var source = `
  class File(object):
  fd : int = 0
  mode : int = 0
  closed : bool = False
  pointer : int = 0
  filelength : int = 0

  def __init__(self : File):
      pass
  
  def read(self : File) -> int:
      return 0
  
  def write(self : File, s : int) -> int:
      return 0

  def tell(self : File) -> int:
      return 0

  def seek(self : File, pos : int):
      pass
      
  def close(self : File):
      if self.closed:
          print(99999)
          return
      close(self.fd)
      self.closed = True
`
  const ast = parse(source);
  
  const repl = new BasicREPL(await addLibs());
  const result = repl.run(source).then(result => {
    console.log(result);    
  })  
}

debug();

